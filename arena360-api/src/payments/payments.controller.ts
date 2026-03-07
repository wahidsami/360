import { Controller, Post, Req, Headers, BadRequestException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Stripe from 'stripe';
import { InvoicesService } from '../invoices/invoices.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private config: ConfigService,
    private invoicesService: InvoicesService,
  ) {}

  @Post('webhooks/stripe')
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Webhook secret not configured');
    const rawBody = req.rawBody;
    if (!rawBody || !signature) throw new BadRequestException('Invalid webhook payload');
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY')!);
      event = stripe.webhooks.constructEvent(rawBody as Buffer, signature, secret);
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'Webhook signature verification failed');
    }
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await this.invoicesService.markPaidByPaymentIntentId(pi.id);
    }
    return { received: true };
  }
}
