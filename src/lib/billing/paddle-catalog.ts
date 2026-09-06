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

export interface PricingTier {
  seats: number;
  unitPriceBrl: number;
  totalMonthlyBrl: number;
  caredPeopleLimit: number;
  savingsPercentage: number;
  sandboxPriceId: string;
  livePriceId: string;
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
    livePriceId: process.env.PADDLE_PRICE_ID_1_SEAT_LIVE || 'pri_01jm_parentcare_1seat_live',
  },
  2: {
    seats: 2,
    unitPriceBrl: 45.90,
    totalMonthlyBrl: 91.80,
    caredPeopleLimit: 4,
    savingsPercentage: 8,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_2_SEATS_SANDBOX || 'pri_01jm_parentcare_2seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_2_SEATS_LIVE || 'pri_01jm_parentcare_2seats_live',
  },
  3: {
    seats: 3,
    unitPriceBrl: 39.00,
    totalMonthlyBrl: 117.00,
    caredPeopleLimit: 5,
    savingsPercentage: 22,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_3_SEATS_SANDBOX || 'pri_01jm_parentcare_3seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_3_SEATS_LIVE || 'pri_01jm_parentcare_3seats_live',
  },
  4: {
    seats: 4,
    unitPriceBrl: 35.90,
    totalMonthlyBrl: 143.60,
    caredPeopleLimit: 6,
    savingsPercentage: 28,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_4_SEATS_SANDBOX || 'pri_01jm_parentcare_4seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_4_SEATS_LIVE || 'pri_01jm_parentcare_4seats_live',
  },
  5: {
    seats: 5,
    unitPriceBrl: 32.90,
    totalMonthlyBrl: 164.50,
    caredPeopleLimit: 8,
    savingsPercentage: 34,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_5_SEATS_SANDBOX || 'pri_01jm_parentcare_5seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_5_SEATS_LIVE || 'pri_01jm_parentcare_5seats_live',
  },
  6: {
    seats: 6,
    unitPriceBrl: 29.90,
    totalMonthlyBrl: 179.40,
    caredPeopleLimit: 10,
    savingsPercentage: 40,
    sandboxPriceId: process.env.PADDLE_PRICE_ID_6_SEATS_SANDBOX || 'pri_01jm_parentcare_6seats_sdbx',
    livePriceId: process.env.PADDLE_PRICE_ID_6_SEATS_LIVE || 'pri_01jm_parentcare_6seats_live',
  },
};

/**
 * Validates that requested seats is within authorized limits (1 to 6).
 */
export function validateSeatQuantity(quantity: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(quantity)) {
    return { valid: false, error: 'A quantidade de assentos deve ser um número inteiro.' };
  }
  if (quantity < 1) {
    return { valid: false, error: 'A quantidade mínima de assentos é 1.' };
  }
  if (quantity > MAX_STANDARD_SEATS) {
    return { 
      valid: false, 
      error: 'Precisa de mais de 6 acessos? Fale com nossa equipe para conhecer o plano personalizado.' 
    };
  }
  return { valid: true };
}

/**
 * Get authorized price ID for a given seat count based on environment.
 * Prevents client-side manipulation of price IDs.
 */
export function getAuthorizedPriceId(seats: number, environment: 'sandbox' | 'production' = 'sandbox'): string {
  const tier = PADDLE_TIERS[seats];
  if (!tier) {
    throw new Error(`Faixa de assentos inválida: ${seats}. Aceito de 1 a 6.`);
  }
  return environment === 'production' ? tier.livePriceId : tier.sandboxPriceId;
}

/**
 * Get tier metadata by seat count.
 */
export function getTierBySeats(seats: number): PricingTier | null {
  return PADDLE_TIERS[seats] || null;
}

/**
 * Reverse lookup: get seat count from price ID.
 */
export function getSeatsFromPriceId(priceId: string): number | null {
  for (const tier of Object.values(PADDLE_TIERS)) {
    if (tier.sandboxPriceId === priceId || tier.livePriceId === priceId) {
      return tier.seats;
    }
  }
  return null;
}

export interface FormattedTierPricing {
  currency: string;
  totalFormatted: string;
  unitFormatted: string;
  rawTotal: number;
  rawUnit: number;
  caredPeopleLimit: number;
  savingsPercentage: number;
}

export function getTierPricing(seats: number, locale: string = 'pt-BR'): FormattedTierPricing {
  const tier = PADDLE_TIERS[seats] || PADDLE_TIERS[1];
  const isEn = locale.startsWith('en');
  const isEur = locale.startsWith('fr') || locale.startsWith('de');
  const isEs = locale.startsWith('es');

  if (isEn || isEs) {
    const usdPrices: Record<number, { total: number; unit: number }> = {
      1: { total: 9.90, unit: 9.90 },
      2: { total: 18.90, unit: 9.45 },
      3: { total: 24.90, unit: 8.30 },
      4: { total: 29.90, unit: 7.47 },
      5: { total: 34.90, unit: 6.98 },
      6: { total: 39.90, unit: 6.65 },
    };
    const p = usdPrices[seats] || { total: 9.90, unit: 9.90 };
    return {
      currency: 'USD',
      totalFormatted: `$${p.total.toFixed(2)}`,
      unitFormatted: `$${p.unit.toFixed(2)}`,
      rawTotal: p.total,
      rawUnit: p.unit,
      caredPeopleLimit: tier.caredPeopleLimit,
      savingsPercentage: tier.savingsPercentage,
    };
  }

  if (isEur) {
    const eurPrices: Record<number, { total: number; unit: number }> = {
      1: { total: 9.90, unit: 9.90 },
      2: { total: 18.90, unit: 9.45 },
      3: { total: 24.90, unit: 8.30 },
      4: { total: 29.90, unit: 7.47 },
      5: { total: 34.90, unit: 6.98 },
      6: { total: 39.90, unit: 6.65 },
    };
    const p = eurPrices[seats] || { total: 9.90, unit: 9.90 };
    return {
      currency: 'EUR',
      totalFormatted: `${p.total.toFixed(2).replace('.', ',')} €`,
      unitFormatted: `${p.unit.toFixed(2).replace('.', ',')} €`,
      rawTotal: p.total,
      rawUnit: p.unit,
      caredPeopleLimit: tier.caredPeopleLimit,
      savingsPercentage: tier.savingsPercentage,
    };
  }

  // Default BRL
  return {
    currency: 'BRL',
    totalFormatted: `R$ ${tier.totalMonthlyBrl.toFixed(2).replace('.', ',')}`,
    unitFormatted: `R$ ${tier.unitPriceBrl.toFixed(2).replace('.', ',')}`,
    rawTotal: tier.totalMonthlyBrl,
    rawUnit: tier.unitPriceBrl,
    caredPeopleLimit: tier.caredPeopleLimit,
    savingsPercentage: tier.savingsPercentage,
  };
}
