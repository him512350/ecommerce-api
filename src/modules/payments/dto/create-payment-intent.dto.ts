import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Order ID to create Stripe PaymentIntent for' })
  @IsUUID()
  orderId: string;
}
