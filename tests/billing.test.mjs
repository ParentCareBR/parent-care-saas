import test from 'node:test';
import assert from 'node:assert/strict';

// Import catalog functions
import {
  PADDLE_TIERS,
  MAX_STANDARD_SEATS,
  DEFAULT_CARED_PEOPLE_LIMIT,
  validateSeatQuantity,
  getAuthorizedPriceId,
  getTierBySeats,
  getSeatsFromPriceId
} from '../src/lib/billing/paddle-catalog.ts';

test('1. Validates standard seat quantity (1 to 6)', () => {
  for (let s = 1; s <= 6; s++) {
    const result = validateSeatQuantity(s);
    assert.equal(result.valid, true, `Seat ${s} should be valid`);
  }
});

test('2. Rejects out of bound seat quantities (< 1 or > 6)', () => {
  const zero = validateSeatQuantity(0);
  assert.equal(zero.valid, false);
  assert.match(zero.error, /mínima/i);

  const negative = validateSeatQuantity(-3);
  assert.equal(negative.valid, false);

  const aboveLimit = validateSeatQuantity(7);
  assert.equal(aboveLimit.valid, false);
  assert.match(aboveLimit.error, /personalizado|mais de 6/i);

  const nonInt = validateSeatQuantity(2.5);
  assert.equal(nonInt.valid, false);
  assert.match(nonInt.error, /inteiro/i);
});

test('3. Verifies official commercial volume tier prices and calculations', () => {
  const expectedTiers = {
    1: { unit: 49.90, total: 49.90, savings: 0 },
    2: { unit: 45.90, total: 91.80, savings: 8 },
    3: { unit: 39.00, total: 117.00, savings: 22 },
    4: { unit: 35.90, total: 143.60, savings: 28 },
    5: { unit: 32.90, total: 164.50, savings: 34 },
    6: { unit: 29.90, total: 179.40, savings: 40 },
  };

  for (const [seatsStr, expected] of Object.entries(expectedTiers)) {
    const seats = Number(seatsStr);
    const tier = PADDLE_TIERS[seats];
    assert.ok(tier, `Tier for ${seats} seats should exist`);
    assert.equal(tier.unitPriceBrl, expected.unit);
    assert.equal(tier.totalMonthlyBrl, expected.total);
    assert.equal(tier.savingsPercentage, expected.savings);
    assert.equal(tier.caredPeopleLimit, 2);
  }
});

test('4. Cared people limit is fixed to 2 for family plan', () => {
  assert.equal(DEFAULT_CARED_PEOPLE_LIMIT, 2);
  for (let s = 1; s <= 6; s++) {
    assert.equal(PADDLE_TIERS[s].caredPeopleLimit, 2);
  }
});

test('5. Resolves authorized Paddle price IDs correctly', () => {
  const sdbx1 = getAuthorizedPriceId(1, 'sandbox');
  assert.ok(sdbx1.length > 0);

  const live1 = getAuthorizedPriceId(1, 'production');
  assert.ok(live1.length > 0);

  assert.throws(() => getAuthorizedPriceId(8, 'sandbox'), /inválida/i);
});

test('6. Reverse lookup maps price ID back to correct seat count', () => {
  for (let s = 1; s <= 6; s++) {
    const tier = PADDLE_TIERS[s];
    assert.equal(getSeatsFromPriceId(tier.sandboxPriceId), s);
    assert.equal(getSeatsFromPriceId(tier.livePriceId), s);
  }
  assert.equal(getSeatsFromPriceId('non_existent_price'), null);
});
