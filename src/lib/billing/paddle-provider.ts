import { getPaddleClient } from './paddle-client';
import { BillingGateway, CreateCheckoutSessionParams, CreateCustomerParams } from './types';

export interface PricePreviewItem {
  priceId: string;
  quantity: number;
}

export interface PricePreviewResult {
  currencyCode: string;
  unitPriceFormatted: string;
  totalFormatted: string;
  subtotal: string;
  tax: string;
  total: string;
}

export class PaddleProvider implements BillingGateway {
  private get paddle() {
    return getPaddleClient();
  }

  async createCustomer(params: CreateCustomerParams): Promise<string> {
    const customer = await this.paddle.customers.create({
      email: params.email,
      name: params.name,
      customData: params.metadata,
    });
    return customer.id;
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ url: string; transactionId: string }> {
    const customData: Record<string, any> = {
      ...params.metadata,
      trial_days: params.trialPeriodDays ?? 30,
    };

    const payload: any = {
      items: [
        {
          priceId: params.priceId,
          quantity: 1,
        },
      ],
      customData: {
        ...customData,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      },
    };

    if (params.customerId) {
      payload.customerId = params.customerId;
    }

    const transaction = await this.paddle.transactions.create(payload);

    const isSandbox = (process.env.PADDLE_ENVIRONMENT || process.env.NEXT_PUBLIC_PADDLE_ENV) !== 'production';
    const fallbackUrl = isSandbox
      ? `https://sandbox-checkout.paddle.com/checkout/tx_${transaction.id}`
      : `https://checkout.paddle.com/checkout/tx_${transaction.id}`;

    const checkoutUrl = transaction.checkout?.url || fallbackUrl;

    return { url: checkoutUrl, transactionId: transaction.id };
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

  async resumeSubscription(subscriptionId: string): Promise<any> {
    return await this.paddle.subscriptions.update(subscriptionId, {
      scheduledChange: null,
    });
  }

  async updateSubscriptionSeats(
    subscriptionId: string,
    newPriceId: string,
    newQuantity: number,
    prorationBillingMode: 'prorated_immediately' | 'prorated_next_billing_period' | 'do_not_bill' = 'prorated_immediately'
  ): Promise<any> {
    return await this.paddle.subscriptions.update(subscriptionId, {
      items: [
        {
          priceId: newPriceId,
          quantity: newQuantity,
        },
      ],
      prorationBillingMode,
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
