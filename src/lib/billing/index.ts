import { BillingGateway } from './types';
import { PaddleProvider } from './paddle-provider';

let paddleInstance: PaddleProvider | null = null;

export function getBillingGateway(): BillingGateway {
  if (!paddleInstance) {
    paddleInstance = new PaddleProvider();
  }
  return paddleInstance;
}


export * from './types';
