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
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' });
    }
  }

  async createPaymentIntent(userId: string, orderId: string) {
    const order = await this.ordersService.findOne(orderId, userId);
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(Number(order.total) * 100), // Stripe uses cents
      currency: 'sgd',
      metadata: { orderId: order.id, userId },
    });

    // Update order with payment intent ID
    order.paymentIntentId = paymentIntent.id;
    await this.ordersService['ordersRepo'].save(order);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
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

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentSucceeded(intent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentFailed(intent);
        break;
      }
      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
    const { orderId } = intent.metadata;
    const order = await this.ordersService.findOne(orderId);

    const payment = this.paymentsRepo.create({
      orderId,
      amount: intent.amount / 100,
      currency: intent.currency.toUpperCase(),
      status: PaymentStatusEnum.SUCCEEDED,
      provider: PaymentProviderEnum.STRIPE,
      transactionId: intent.id,
      paymentMethod: 'card',
      metadata: { intentId: intent.id },
    });
    await this.paymentsRepo.save(payment);

    order.paymentStatus = PaymentStatus.PAID;
    await this.ordersService['ordersRepo'].save(order);
  }

  private async handlePaymentFailed(intent: Stripe.PaymentIntent) {
    const { orderId } = intent.metadata;
    const order = await this.ordersService.findOne(orderId);
    order.paymentStatus = PaymentStatus.FAILED;
    await this.ordersService['ordersRepo'].save(order);
  }
}
