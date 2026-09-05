export interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutSessionParams {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface BillingGateway {
  createCustomer(params: CreateCustomerParams): Promise<string>;
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ url: string }>;
  createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>;
  cancelSubscription(subscriptionId: string, immediate?: boolean): Promise<void>;
  constructWebhookEvent(payload: string, signature: string): any;
}

export type GatewayProvider = 'stripe' | 'mercadopago' | 'paddle';
