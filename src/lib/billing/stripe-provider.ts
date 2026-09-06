import Stripe from 'stripe';
import { BillingGateway, CreateCheckoutSessionParams, CreateCustomerParams } from './types';

export class StripeProvider implements BillingGateway {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is missing');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-08-26.dahlia',
      typescript: true,
    });
  }

  async createCustomer(params: CreateCustomerParams): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });
    return customer.id;
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: {
        trial_period_days: params.trialPeriodDays ?? 30,
        metadata: params.metadata,
      },
      payment_method_collection: 'always',
      metadata: params.metadata,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error('Failed to create Stripe checkout session');
    }

    return { url: session.url };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<void> {
    if (immediate) {
      await this.stripe.subscriptions.cancel(subscriptionId);
    } else {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  constructWebhookEvent(payload: string, signature: string) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is missing');
    }
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }
}
