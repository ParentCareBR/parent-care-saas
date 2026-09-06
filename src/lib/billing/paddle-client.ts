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
  return env === 'production' ? Environment.production : Environment.sandbox;
}

let paddleClientInstance: Paddle | null = null;

export function getPaddleClient(): Paddle {
  if (paddleClientInstance) {
    return paddleClientInstance;
  }

  const apiKey = process.env.PADDLE_API_KEY || '';
  const environment = getPaddleEnvironment();

  if (!apiKey) {
    console.warn('[Paddle] Warning: PADDLE_API_KEY environment variable is not defined.');
  } else if (!isValidPaddleApiKey(apiKey)) {
    console.warn(
      `[Paddle] Notice: PADDLE_API_KEY ("${apiKey.substring(0, 16)}...") does not match the full secret token format (pdl_${environment === Environment.production ? 'live' : 'sdbx'}_apikey_...). Ensure you paste the full secret key from Paddle Dashboard -> API Keys.`
    );
  }

  paddleClientInstance = new Paddle(apiKey || 'pdl_dummy_key_placeholder', {
    environment,
    logLevel: process.env.NODE_ENV === 'development' ? LogLevel.warn : LogLevel.error,
  });

  return paddleClientInstance;
}
