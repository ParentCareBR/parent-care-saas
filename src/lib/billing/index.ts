import { GatewayProvider, BillingGateway } from './types';
import { StripeProvider } from './stripe-provider';

let stripeInstance: StripeProvider | null = null;

export function getBillingGateway(provider: GatewayProvider = 'stripe'): BillingGateway {
  switch (provider) {
    case 'stripe':
      if (!stripeInstance) {
        stripeInstance = new StripeProvider();
      }
      return stripeInstance;
    case 'mercadopago':
    case 'paddle':
      throw new Error(`Gateway ${provider} is not fully implemented yet.`);
    default:
      throw new Error(`Unknown gateway provider: ${provider}`);
  }
}

export * from './types';
