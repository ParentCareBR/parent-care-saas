import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';
import { BillingGateway, CreateCheckoutSessionParams, CreateCustomerParams } from './types';

export class PaddleProvider implements BillingGateway {
  private paddle: Paddle;

  constructor() {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      console.warn('PADDLE_API_KEY is not set. Initializing Paddle in sandbox mode with placeholder.');
    }

    const environment = process.env.PADDLE_ENVIRONMENT === 'production'
      ? Environment.production
      : Environment.sandbox;

    this.paddle = new Paddle(apiKey || 'pdl_dummy_key_placeholder', {
      environment,
      logLevel: LogLevel.warn,
    });
  }

  async createCustomer(params: CreateCustomerParams): Promise<string> {
    const customer = await this.paddle.customers.create({
      email: params.email,
      name: params.name,
      customData: params.metadata,
    });
    return customer.id;
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ url: string }> {
    const customData: Record<string, any> = {
      ...params.metadata,
      trial_days: params.trialPeriodDays ?? 30,
    };

    const transaction = await this.paddle.transactions.create({
      items: [
        {
          priceId: params.priceId,
          quantity: 1,
        },
      ],
      customerId: params.customerId,
      customData: {
        ...customData,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      },
    });

    const isSandbox = process.env.PADDLE_ENVIRONMENT !== 'production';
    const fallbackUrl = isSandbox
      ? `https://sandbox-checkout.paddle.com/checkout/tx_${transaction.id}`
      : `https://checkout.paddle.com/checkout/tx_${transaction.id}`;

    const checkoutUrl = transaction.checkout?.url || fallbackUrl;

    return { url: checkoutUrl };
  }

  async createPortalSession(customerId: string, returnUrl: string, subscriptionIds: string[] = []): Promise<{ url: string }> {
    try {
      const session = await this.paddle.customerPortalSessions.create(customerId, subscriptionIds);
      return { url: session.urls.general.overview || returnUrl };
    } catch (err: any) {
      console.error('Error creating Paddle customer portal session:', err);
      return { url: returnUrl };
    }
  }

  async cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<void> {
    await this.paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom: immediate ? 'immediately' : 'next_billing_period',
    });
  }

  async constructWebhookEvent(payload: string, signature: string): Promise<any> {
    const secretKey = process.env.PADDLE_WEBHOOK_SECRET || '';
    if (!secretKey) {
      throw new Error('PADDLE_WEBHOOK_SECRET is missing');
    }
    return await this.paddle.webhooks.unmarshal(payload, secretKey, signature);
  }
}
