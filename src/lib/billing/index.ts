import { GatewayProvider, BillingGateway } from './types';
import { PaddleProvider } from './paddle-provider';
import { StripeProvider } from './stripe-provider';

let paddleInstance: PaddleProvider | null = null;
let stripeInstance: StripeProvider | null = null;

export function getBillingGateway(provider?: GatewayProvider): BillingGateway {
  const chosenProvider: GatewayProvider = provider 
    || (process.env.BILLING_GATEWAY_PROVIDER as GatewayProvider) 
    || 'paddle';

  switch (chosenProvider) {
    case 'paddle':
      if (!paddleInstance) {
        paddleInstance = new PaddleProvider();
      }
      return paddleInstance;
    case 'stripe':
      if (!stripeInstance) {
        stripeInstance = new StripeProvider();
      }
      return stripeInstance;
    default:
      if (!paddleInstance) {
        paddleInstance = new PaddleProvider();
      }
      return paddleInstance;
  }
}

export * from './types';
