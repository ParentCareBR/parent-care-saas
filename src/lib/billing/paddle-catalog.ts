/**
 * Paddle Commercial Catalog & Tier Mapping
 * Parent Care SaaS — Exclusively Paddle Billing
 *
 * Tiers:
 * 1 seat: R$ 49,90 / month (unit: R$ 49,90)
 * 2 seats: R$ 91,80 / month (unit: R$ 45,90)
 * 3 seats: R$ 117,00 / month (unit: R$ 39,00)
 * 4 seats: R$ 143,60 / month (unit: R$ 35,90)
 * 5 seats: R$ 164,50 / month (unit: R$ 32,90)
 * 6 seats: R$ 179,40 / month (unit: R$ 29,90)
 * > 6 seats: Contact sales / custom plan
 */

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP';

export interface TierCurrencyPrice {
  totalMonthly: number;
  unitPrice: number;
}

export interface PricingTier {
  seats: number;
  unitPriceBrl: number;
  totalMonthlyBrl: number;
  caredPeopleLimit: number;
  savingsPercentage: number;
  sandboxPriceId: string;
  livePriceId: string;
  livePriceIds: Record<CurrencyCode, string>;
  prices: Record<CurrencyCode, TierCurrencyPrice>;
}

export const PARENT_CARE_PRODUCT_NAME = 'Parent Care — Plano Família';
export const MAX_STANDARD_SEATS = 6;
export const DEFAULT_CARED_PEOPLE_LIMIT = 2;

export const PADDLE_TIERS: Record<number, PricingTier> = {
  1: {
    seats: 1,
    unitPriceBrl: 49.90,
    totalMonthlyBrl: 49.90,
    caredPeopleLimit: 3,
    savingsPercentage: 0,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_1_SEAT_SANDBOX || 'pri_01jm_parentcare_1seat_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_1_SEAT_LIVE || 'pri_01m1tphk5zpr086ywdabthfwyf',
    livePriceIds: {
      BRL: 'pri_01m1tphk5zpr086ywdabthfwyf',
      USD: 'pri_01m249nw0zrty2fwg6rrr3fr10',
      EUR: 'pri_01m249qvgapk30at9xexzvrye3',
      GBP: 'pri_01m249s7makzm1r6vvhyfmn0jh',
    },
    prices: {
      BRL: { totalMonthly: 49.90, unitPrice: 49.90 },
      USD: { totalMonthly: 9.90, unitPrice: 9.90 },
      EUR: { totalMonthly: 9.90, unitPrice: 9.90 },
      GBP: { totalMonthly: 7.90, unitPrice: 7.90 },
    },
  },
  2: {
    seats: 2,
    unitPriceBrl: 45.90,
    totalMonthlyBrl: 91.80,
    caredPeopleLimit: 4,
    savingsPercentage: 8,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_2_SEATS_SANDBOX || 'pri_01jm_parentcare_2seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_2_SEATS_LIVE || 'pri_01m1zj2dve9kjxszarfamj90ks',
    livePriceIds: {
      BRL: 'pri_01m1zj2dve9kjxszarfamj90ks',
      USD: 'pri_01m2dn8yj9m8xsckerbrqnxryc',
      EUR: 'pri_01m2dndqp3x27szkenv08eg2wn',
      GBP: 'pri_01m2dnhdt72c2pwf7vrx496rbf',
    },
    prices: {
      BRL: { totalMonthly: 91.80, unitPrice: 45.90 },
      USD: { totalMonthly: 18.90, unitPrice: 9.45 },
      EUR: { totalMonthly: 18.90, unitPrice: 9.45 },
      GBP: { totalMonthly: 14.90, unitPrice: 7.45 },
    },
  },
  3: {
    seats: 3,
    unitPriceBrl: 39.00,
    totalMonthlyBrl: 117.00,
    caredPeopleLimit: 5,
    savingsPercentage: 22,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_3_SEATS_SANDBOX || 'pri_01jm_parentcare_3seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_3_SEATS_LIVE || 'pri_01m1zj5s005v7fky76sgy0qh4q',
    livePriceIds: {
      BRL: 'pri_01m1zj5s005v7fky76sgy0qh4q',
      USD: 'pri_01m2dnkgp99yvcnhfeev3g6fzq',
      EUR: 'pri_01m2dnmwma075aetmvw0qjrw7z',
      GBP: 'pri_01m2dnpkcn03fh1490jfgwhqvy',
    },
    prices: {
      BRL: { totalMonthly: 117.00, unitPrice: 39.00 },
      USD: { totalMonthly: 24.90, unitPrice: 8.30 },
      EUR: { totalMonthly: 24.90, unitPrice: 8.30 },
      GBP: { totalMonthly: 19.90, unitPrice: 6.63 },
    },
  },
  4: {
    seats: 4,
    unitPriceBrl: 35.90,
    totalMonthlyBrl: 143.60,
    caredPeopleLimit: 6,
    savingsPercentage: 28,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_4_SEATS_SANDBOX || 'pri_01jm_parentcare_4seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_4_SEATS_LIVE || 'pri_01m2dr8qm05qdy86m93tzrjgwp',
    livePriceIds: {
      BRL: 'pri_01m2dr8qm05qdy86m93tzrjgwp',
      USD: 'pri_01m2dr9sxk9bkv24dfg19a8bvy',
      EUR: 'pri_01m2drb54r1xnjhfn5ez3rehtp',
      GBP: 'pri_01m2drcan9ec9n4c6dp8ykqp8q',
    },
    prices: {
      BRL: { totalMonthly: 143.60, unitPrice: 35.90 },
      USD: { totalMonthly: 29.90, unitPrice: 7.47 },
      EUR: { totalMonthly: 29.90, unitPrice: 7.47 },
      GBP: { totalMonthly: 23.90, unitPrice: 5.97 },
    },
  },
  5: {
    seats: 5,
    unitPriceBrl: 32.92,
    totalMonthlyBrl: 164.60,
    caredPeopleLimit: 8,
    savingsPercentage: 34,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_5_SEATS_SANDBOX || 'pri_01jm_parentcare_5seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_5_SEATS_LIVE || 'pri_01m2drftscg3hjpesg40fxqq4j',
    livePriceIds: {
      BRL: 'pri_01m2drftscg3hjpesg40fxqq4j',
      USD: 'pri_01m2drj332ea70x5xn47epdwza',
      EUR: 'pri_01m2drgxx4bbbgv2dpnpfv3yvr',
      GBP: 'pri_01m2drk4fnqksyw9nv0khdvjxg',
    },
    prices: {
      BRL: { totalMonthly: 164.60, unitPrice: 32.92 },
      USD: { totalMonthly: 34.90, unitPrice: 6.98 },
      EUR: { totalMonthly: 34.90, unitPrice: 6.98 },
      GBP: { totalMonthly: 27.90, unitPrice: 5.58 },
    },
  },
  6: {
    seats: 6,
    unitPriceBrl: 29.90,
    totalMonthlyBrl: 179.40,
    caredPeopleLimit: 10,
    savingsPercentage: 40,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_6_SEATS_SANDBOX || 'pri_01jm_parentcare_6seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_6_SEATS_LIVE || 'pri_01m2drnkeymh506h71305g8t95',
    livePriceIds: {
      BRL: 'pri_01m2drnkeymh506h71305g8t95',
      USD: 'pri_01m2drpknp22hg9wc535137tmz',
      EUR: 'pri_01m2drqhtnqr96nsdzb5hqczz0',
      GBP: 'pri_01m2drrc6ms62pfdrp200tjd4s',
    },
    prices: {
      BRL: { totalMonthly: 179.40, unitPrice: 29.90 },
      USD: { totalMonthly: 39.90, unitPrice: 6.65 },
      EUR: { totalMonthly: 39.90, unitPrice: 6.65 },
      GBP: { totalMonthly: 31.90, unitPrice: 5.31 },
    },
  },
};

/**
 * Validates that requested seats is within authorized limits (1 to 100).
 */
export function validateSeatQuantity(quantity: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(quantity)) {
    return { valid: false, error: 'A quantidade de assentos deve ser um número inteiro.' };
  }
  if (quantity < 1) {
    return { valid: false, error: 'A quantidade mínima de assentos é 1.' };
  }
  if (quantity > 100) {
    return { 
      valid: false, 
      error: 'A quantidade máxima permitida é de 100 acessos familiares.' 
    };
  }
  return { valid: true };
}

/**
 * Resolves currency code from a locale or explicit currency string.
 */
export function resolveCurrency(localeOrCurrency?: string): CurrencyCode {
  if (!localeOrCurrency) return 'BRL';
  const val = localeOrCurrency.trim().toLowerCase();

  if (val === 'gbp') return 'GBP';
  if (val === 'eur') return 'EUR';
  if (val === 'usd') return 'USD';
  if (val === 'brl') return 'BRL';

  // British English or UK variations
  if (val === 'en-gb' || val.startsWith('en-gb') || val.includes('gb') || val.includes('uk')) {
    return 'GBP';
  }

  // European languages
  if (val === 'fr' || val.startsWith('fr') || val === 'de' || val.startsWith('de')) {
    return 'EUR';
  }

  // English (US/International) or Spanish
  if (val === 'en' || val.startsWith('en') || val === 'es' || val.startsWith('es')) {
    return 'USD';
  }

  return 'BRL';
}

/**
 * Get authorized price ID for a given seat count based on environment and currency/locale.
 * Prevents client-side manipulation of price IDs.
 */
export function getAuthorizedPriceId(
  seats: number,
  environment: 'sandbox' | 'production' = 'sandbox',
  localeOrCurrency: string = 'pt-BR'
): string {
  const tier = PADDLE_TIERS[seats];
  if (!tier) {
    throw new Error(`Faixa de assentos inválida: ${seats}. Aceito de 1 a 6.`);
  }
  if (environment === 'sandbox') {
    return tier.sandboxPriceId;
  }
  const currency = resolveCurrency(localeOrCurrency);
  return tier.livePriceIds?.[currency] || tier.livePriceId;
}

/**
 * Reverse lookup: get currency code from a Paddle Price ID.
 */
export function getCurrencyFromPriceId(priceId: string): CurrencyCode | null {
  for (const tier of Object.values(PADDLE_TIERS)) {
    if (tier.livePriceIds) {
      for (const [curr, id] of Object.entries(tier.livePriceIds)) {
        if (id === priceId) return curr as CurrencyCode;
      }
    }
  }
  return null;
}

/**
 * Get tier metadata by seat count.
 */
export function getTierBySeats(seats: number): PricingTier | null {
  return PADDLE_TIERS[seats] || null;
}

/**
 * Reverse lookup: get seat count from price ID across all supported currencies.
 */
export function getSeatsFromPriceId(priceId: string): number | null {
  for (const tier of Object.values(PADDLE_TIERS)) {
    if (tier.sandboxPriceId === priceId || tier.livePriceId === priceId) {
      return tier.seats;
    }
    if (tier.livePriceIds && Object.values(tier.livePriceIds).includes(priceId)) {
      return tier.seats;
    }
  }
  return null;
}

export interface FormattedTierPricing {
  currency: CurrencyCode;
  totalFormatted: string;
  unitFormatted: string;
  rawTotal: number;
  rawUnit: number;
  caredPeopleLimit: number;
  savingsPercentage: number;
  billingInterval: 'month' | 'year';
  monthlyEquivalentFormatted?: string;
  rawMonthlyEquivalent?: number;
  annualSavingsFormatted?: string;
}

/**
 * Format amounts according to currency and locale conventions.
 */
function formatCurrencyValue(amount: number, currency: CurrencyCode, locale: string): string {
  try {
    let intlLocale = 'pt-BR';
    if (currency === 'BRL') {
      intlLocale = 'pt-BR';
    } else if (currency === 'GBP') {
      intlLocale = 'en-GB';
    } else if (currency === 'EUR') {
      intlLocale = locale.startsWith('de') ? 'de-DE' : 'fr-FR';
    } else {
      intlLocale = locale.startsWith('es') ? 'es-ES' : 'en-US';
    }

    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = currency === 'BRL' ? 'R$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    return `${symbol} ${amount.toFixed(2)}`;
  }
}

export function getTierPricing(
  seats: number,
  locale: string = 'pt-BR',
  interval: 'month' | 'year' = 'month'
): FormattedTierPricing {
  const currency = resolveCurrency(locale);

  if (seats <= MAX_STANDARD_SEATS) {
    const tier = PADDLE_TIERS[seats] || PADDLE_TIERS[1];
    const p = tier.prices?.[currency] || {
      totalMonthly: tier.totalMonthlyBrl,
      unitPrice: tier.unitPriceBrl,
    };

    if (interval === 'year') {
      // 12 months for the price of 10 (2 months free / ~17% discount)
      const annualTotal = Number((p.totalMonthly * 10).toFixed(2));
      const monthlyEquivalent = Number((annualTotal / 12).toFixed(2));
      const annualSavings = Number((p.totalMonthly * 2).toFixed(2));

      return {
        currency,
        billingInterval: 'year',
        totalFormatted: formatCurrencyValue(annualTotal, currency, locale),
        unitFormatted: formatCurrencyValue(Number((p.unitPrice * 10 / 12).toFixed(2)), currency, locale),
        rawTotal: annualTotal,
        rawUnit: p.unitPrice,
        caredPeopleLimit: tier.caredPeopleLimit,
        savingsPercentage: 17,
        monthlyEquivalentFormatted: formatCurrencyValue(monthlyEquivalent, currency, locale),
        rawMonthlyEquivalent: monthlyEquivalent,
        annualSavingsFormatted: formatCurrencyValue(annualSavings, currency, locale),
      };
    }

    return {
      currency,
      billingInterval: 'month',
      totalFormatted: formatCurrencyValue(p.totalMonthly, currency, locale),
      unitFormatted: formatCurrencyValue(p.unitPrice, currency, locale),
      rawTotal: p.totalMonthly,
      rawUnit: p.unitPrice,
      caredPeopleLimit: tier.caredPeopleLimit,
      savingsPercentage: tier.savingsPercentage,
    };
  }

  // Custom calculation for > 6 seats
  const tier6 = PADDLE_TIERS[6];
  const p6 = tier6.prices[currency];
  const additionalSeats = seats - 6;
  const unitRate = p6.unitPrice;
  const monthlyTotal = Number((p6.totalMonthly + additionalSeats * unitRate).toFixed(2));

  if (interval === 'year') {
    const annualTotal = Number((monthlyTotal * 10).toFixed(2));
    const monthlyEquivalent = Number((annualTotal / 12).toFixed(2));
    const annualSavings = Number((monthlyTotal * 2).toFixed(2));

    return {
      currency,
      billingInterval: 'year',
      totalFormatted: formatCurrencyValue(annualTotal, currency, locale),
      unitFormatted: formatCurrencyValue(unitRate, currency, locale),
      rawTotal: annualTotal,
      rawUnit: unitRate,
      caredPeopleLimit: Math.min(seats + 4, 30),
      savingsPercentage: 17,
      monthlyEquivalentFormatted: formatCurrencyValue(monthlyEquivalent, currency, locale),
      rawMonthlyEquivalent: monthlyEquivalent,
      annualSavingsFormatted: formatCurrencyValue(annualSavings, currency, locale),
    };
  }

  return {
    currency,
    billingInterval: 'month',
    totalFormatted: formatCurrencyValue(monthlyTotal, currency, locale),
    unitFormatted: formatCurrencyValue(unitRate, currency, locale),
    rawTotal: monthlyTotal,
    rawUnit: unitRate,
    caredPeopleLimit: Math.min(seats + 4, 30),
    savingsPercentage: 40,
  };
}
