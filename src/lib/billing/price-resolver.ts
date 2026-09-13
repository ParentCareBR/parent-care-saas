import { getPaddleClient } from './paddle-client';
import { getAuthorizedPriceId, getTierPricing, resolveCurrency, MAX_STANDARD_SEATS } from './paddle-catalog';

// In-memory cache for dynamically resolved price IDs: `${seats}_${currency}` -> priceId
const priceCache = new Map<string, string>();

// Pre-seed verified live recurring price IDs: `${seats}_${currency}_${interval}` -> priceId
// Annual BRL prices have the 3.5% dLocal/IOF fee absorbed so the customer pays exactly the advertised price on Pix.
priceCache.set('1_BRL_year', 'pri_01m2eejcv8kt1ns5j5r97cnzbk'); // R$ 499,00 Pix (Paddle base R$ 482.13)
priceCache.set('2_BRL_year', 'pri_01m2ef67aejkdwqjk15kr6yc27'); // R$ 918,00 Pix (Paddle base R$ 886.96)
priceCache.set('3_BRL_year', 'pri_01m2eg902f0jqt7087n73zvhn6'); // R$ 1170,00 Pix (Paddle base R$ 1130.43)
priceCache.set('4_BRL_year', 'pri_01m2eg909eh1nn1e1sk5mx3rn3'); // R$ 1436,00 Pix (Paddle base R$ 1387.44)
priceCache.set('5_BRL_year', 'pri_01m2eg90ep3m9k4359qpksg019'); // R$ 1646,00 Pix (Paddle base R$ 1590.34)
priceCache.set('6_BRL_year', 'pri_01m2eg90kz05gm6m0dv093yqka'); // R$ 1794,00 Pix (Paddle base R$ 1733.33)
priceCache.set('10_BRL_month', 'pri_01m2dvx8wdde95w3kjjq6awnqp');

/**
 * Resolves the appropriate Paddle Price ID for any seat count (1 to 100) and billing interval (month or year).
 * - For 1 to 6 seats monthly: returns the static verified Paddle Price ID.
 * - For annual plans or >6 seats: finds or dynamically creates a recurring price
 *   in Paddle with the calculated rate (including 2 months free for annual).
 */
export async function resolveAuthorizedPriceId(
  seats: number,
  environment: 'sandbox' | 'production' = 'sandbox',
  localeOrCurrency: string = 'pt-BR',
  interval: 'month' | 'year' = 'month'
): Promise<string> {
  const currency = resolveCurrency(localeOrCurrency);

  // 1. Standard tiers 1-6 monthly: use the static verified Paddle Price IDs
  if (seats <= MAX_STANDARD_SEATS && interval === 'month') {
    return getAuthorizedPriceId(seats, environment, localeOrCurrency);
  }

  // 2. Annual plans or Custom tiers (>6 seats)
  const cacheKey = `${seats}_${currency}_${interval}`;
  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey)!;
  }

  if (environment === 'production') {
    const paddle = getPaddleClient();
    const pricing = getTierPricing(seats, localeOrCurrency, interval);
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
        p.billingCycle?.interval === interval &&
        (p.customData?.seats === String(seats) || p.name?.includes(`${seats} acessos`))
      );

      if (existing) {
        if (existing.taxMode !== 'internal') {
          try {
            await paddle.prices.update(existing.id, { taxMode: 'internal' });
          } catch (updateErr) {
            console.warn('[Paddle] Could not update taxMode for price:', existing.id, updateErr);
          }
        }
        priceCache.set(cacheKey, existing.id);
        return existing.id;
      }

      // Create a recurring price (month or year) for the exact calculated amount with tax included
      const newPrice = await paddle.prices.create({
        productId: customProductId,
        name: `Plano ${seats} acessos (${interval === 'year' ? 'Anual' : 'Mensal'})`,
        description: `Parent Care - Plano com ${seats} acessos familiares (${pricing.caredPeopleLimit} idosos) - ${interval === 'year' ? 'Anual com 2 meses grátis' : 'Mensal'}`,
        unitPrice: {
          amount: amountInCents,
          currencyCode: currency,
        },
        billingCycle: {
          interval: interval,
          frequency: 1,
        },
        taxMode: 'internal',
        customData: {
          seats: String(seats),
          plan_type: seats <= MAX_STANDARD_SEATS ? 'standard' : 'custom',
          billing_interval: interval,
          currency,
        },
      });

      priceCache.set(cacheKey, newPrice.id);
      return newPrice.id;
    } catch (err: any) {
      console.error('[Paddle] Error creating price for seats and interval:', seats, interval, err);
      // Fallback: return monthly tier price if creation fails
      return getAuthorizedPriceId(seats <= MAX_STANDARD_SEATS ? seats : 6, environment, localeOrCurrency);
    }
  }

  return interval === 'year' ? 'pri_01jm_parentcare_annual_sdbx' : 'pri_01jm_parentcare_custom_sdbx';
}
