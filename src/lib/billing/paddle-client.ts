import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';

/**
 * Validates if the given API key string matches Paddle Billing format:
 * pdl_(live|sdbx)_apikey_[26 chars]_[22 chars]_[3 chars]
 */
export function isValidPaddleApiKey(key?: string): boolean {
  if (!key) return false;
  return /^pdl_(live|sdbx)_apikey_[a-z0-9]{26}_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{3}$/.test(key);
}

export function getPaddleEnvironment(): Environment {
  const env = process.env.PADDLE_ENVIRONMENT || process.env.NEXT_PUBLIC_PADDLE_ENV;
  if (env === 'production') return Environment.production;
  if (env === 'sandbox') return Environment.sandbox;
  const rawKey = process.env.PADDLE_API_KEY || '';
  if (rawKey?.startsWith('pdl_live_')) return Environment.production;
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (clientToken?.startsWith('live_')) return Environment.production;
  return Environment.production;
}

let paddleClientInstance: Paddle | null = null;

export function getPaddleClient(): Paddle {
  if (paddleClientInstance) {
    return paddleClientInstance;
  }

  const rawKey = process.env.PADDLE_API_KEY || '';
  const apiKey = rawKey.trim();
  const environment = getPaddleEnvironment();

  if (!apiKey) {
    console.warn('[Paddle] Warning: PADDLE_API_KEY environment variable is not defined.');
  } else if (!isValidPaddleApiKey(apiKey)) {
    console.warn(
      `[Paddle] Notice: PADDLE_API_KEY ("${apiKey.substring(0, 16)}...") does not match the full secret token format.`
    );
  }

  paddleClientInstance = new Paddle(apiKey, {
    environment,
    logLevel: process.env.NODE_ENV === 'development' ? LogLevel.warn : LogLevel.error,
  });

  return paddleClientInstance;
}
