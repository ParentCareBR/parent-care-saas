import { getPaddleClient } from './paddle-client';
import { getAuthorizedPriceId, getTierPricing, resolveCurrency, MAX_STANDARD_SEATS } from './paddle-catalog';

// In-memory cache for dynamically resolved price IDs: `${seats}_${currency}` -> priceId
const priceCache = new Map<string, string>();

// Pre-seed 10 seats in BRL
priceCache.set('10_BRL', 'pri_01m2dvx8wdde95w3kjjq6awnqp');

/**
 * Resolves the appropriate Paddle Price ID for any seat count (1 to 100).
 * - For 1 to 6 seats: returns the static verified Paddle Price ID.
 * - For >6 seats (custom plans): finds or creates a recurring monthly price
 *   in Paddle with the dynamically calculated rate and progressive discount.
 */
export async function resolveAuthorizedPriceId(
  seats: number,
  environment: 'sandbox' | 'production' = 'sandbox',
  localeOrCurrency: string = 'pt-BR'
): Promise<string> {
  const currency = resolveCurrency(localeOrCurrency);

  // 1. Standard tiers 1-6: use the static verified Paddle Price IDs
  if (seats <= MAX_STANDARD_SEATS) {
    return getAuthorizedPriceId(seats, environment, localeOrCurrency);
  }

  // 2. Custom tiers (>6 seats)
  const cacheKey = `${seats}_${currency}`;
  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey)!;
  }

  if (environment === 'production') {
    const paddle = getPaddleClient();
    const pricing = getTierPricing(seats, localeOrCurrency);
    const amountInCents = String(Math.round(pricing.rawTotal * 100));
    const customProductId = 'pro_01m2drm734z7psm2jmb3qxt0cj'; // Parent Care product

    try {
      // Check existing prices to avoid duplicates
      const priceList = await paddle.prices.list({
        productId: [customProductId],
        status: ['active'],
        perPage: 50,
      }).next();

      const existing = priceList.find((p: any) =>
        p.unitPrice?.currencyCode === currency &&
        p.unitPrice?.amount === amountInCents &&
        p.billingCycle?.interval === 'month' &&
        (p.customData?.seats === String(seats) || p.name?.includes(`${seats} acessos`))
      );

      if (existing) {
        priceCache.set(cacheKey, existing.id);
        return existing.id;
      }

      // Create a recurring monthly price for the exact calculated amount
      const newPrice = await paddle.prices.create({
        productId: customProductId,
        name: `Plano Personalizado (${seats} acessos)`,
        description: `Parent Care - Plano Personalizado com ${seats} acessos familiares (${pricing.caredPeopleLimit} idosos)`,
        unitPrice: {
          amount: amountInCents,
          currencyCode: currency,
        },
        billingCycle: {
          interval: 'month',
          frequency: 1,
        },
        customData: {
          seats: String(seats),
          plan_type: 'custom',
          currency,
        },
      });

      priceCache.set(cacheKey, newPrice.id);
      return newPrice.id;
    } catch (err: any) {
      console.error('[Paddle] Error creating custom price for seats:', seats, err);
      // Fallback: return tier 6 price if creation fails
      return getAuthorizedPriceId(6, environment, localeOrCurrency);
    }
  }

  return 'pri_01jm_parentcare_custom_sdbx';
}
