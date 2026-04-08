import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment } from './entities/payment.entity';
import { OrdersService } from '../orders/orders.service';
import { TierEvaluationService } from '../tiers/tier-evaluation.service';
import {
  PaymentProviderEnum,
  PaymentStatus,
  PaymentStatusEnum,
} from '../../common/enums';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    private readonly ordersService: OrdersService,
    private readonly tierEvaluationService: TierEvaluationService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
  }

  async createPaymentIntent(userId: string, orderId: string) {
    const order = await this.ordersService.findOne(orderId, userId);
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const currency =
      this.configService.get<string>('app.paymentCurrency') ?? 'hkd';

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(Number(order.total) * 100),
      currency,
      metadata: { orderId: order.id, userId },
    });

    await this.ordersService.updatePaymentIntentId(order.id, paymentIntent.id);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET not configured — skipping signature check',
      );
      return;
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe event received: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type} — ignored`);
    }
  }

  private async handlePaymentSucceeded(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    const orderId = intent.metadata?.orderId;
    const userId = intent.metadata?.userId;

    if (!orderId) {
      this.logger.warn(
        'payment_intent.succeeded: no orderId in metadata — skipping',
      );
      return;
    }

    let order;
    try {
      order = await this.ordersService.findOne(orderId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        this.logger.warn(
          `payment_intent.succeeded: order ${orderId} not found — skipping`,
        );
        return;
      }
      throw err;
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      this.logger.log(
        `Order ${orderId} already PAID — skipping duplicate event`,
      );
      return;
    }

    const payment = this.paymentsRepo.create({
      orderId,
      amount: intent.amount / 100,
      currency: intent.currency.toUpperCase(),
      status: PaymentStatusEnum.SUCCEEDED,
      provider: PaymentProviderEnum.STRIPE,
      transactionId: intent.id,
      paymentMethod: intent.payment_method_types?.[0] ?? 'card',
      metadata: { intentId: intent.id, customerId: intent.customer },
    });
    await this.paymentsRepo.save(payment);
    await this.ordersService.updatePaymentStatus(orderId, PaymentStatus.PAID);
    this.logger.log(`Order ${orderId} marked as PAID`);

    // Trigger tier evaluation — fire-and-forget, never blocks payment confirmation
    if (userId) {
      const paidAmount = intent.amount / 100;
      this.tierEvaluationService
        .evaluateAfterPayment(userId, orderId, paidAmount)
        .catch((err) => this.logger.error(`Tier eval error: ${err.message}`));
    }
  }

  private async handlePaymentFailed(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    const orderId = intent.metadata?.orderId;
    if (!orderId) {
      this.logger.warn(
        'payment_intent.payment_failed: no orderId in metadata — skipping',
      );
      return;
    }
    try {
      await this.ordersService.updatePaymentStatus(
        orderId,
        PaymentStatus.FAILED,
      );
      this.logger.log(`Order ${orderId} marked as FAILED`);
    } catch (err) {
      if (err instanceof NotFoundException) {
        this.logger.warn(
          `payment_intent.payment_failed: order ${orderId} not found — skipping`,
        );
        return;
      }
      throw err;
    }
  }
}
