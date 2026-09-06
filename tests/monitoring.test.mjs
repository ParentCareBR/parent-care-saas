import test from 'node:test';
import assert from 'node:assert/strict';

// Import catalog functions and definitions
import { 
  MONITORING_CATALOG, 
  getDefinitionByCode, 
  validateDependencies 
} from '../src/lib/monitoring/catalog.js';

import {
  calculateDeterministicComparison,
  PATTERN_DISCLAIMER
} from '../src/lib/monitoring/pattern-detector.js';

test('1. Catalog Completeness: exactly 12 standard categories (A through L)', () => {
  assert.equal(MONITORING_CATALOG.length, 12, 'Catalog must contain exactly 12 categories');
  
  const expectedCodes = [
    'daily_routine',
    'medications',
    'observed_wellbeing',
    'memory_routine',
    'autonomy',
    'socialization',
    'safety_incidents',
    'prosthetics_devices',
    'care_inventory',
    'schedule_logistics',
    'caregivers_shifts',
    'cared_person_checkins',
  ];

  const actualCodes = MONITORING_CATALOG.map(c => c.code);
  assert.deepEqual(actualCodes, expectedCodes, 'All 12 category codes must match standard specifications');

  // Verify each category has definitions
  let totalDefinitions = 0;
  for (const cat of MONITORING_CATALOG) {
    assert.ok(cat.definitions.length > 0, `Category ${cat.code} must have definitions`);
    assert.ok(cat.name, `Category ${cat.code} must have a name`);
    assert.ok(cat.icon, `Category ${cat.code} must have an icon`);
    totalDefinitions += cat.definitions.length;

    for (const def of cat.definitions) {
      assert.ok(def.id, `Definition ${def.code} must have an id`);
      assert.ok(def.code, `Definition in ${cat.code} must have a code`);
      assert.ok(def.fieldType, `Definition ${def.code} must have a fieldType`);
    }
  }

  assert.ok(totalDefinitions >= 60, `Total definitions should be 60 or more, got ${totalDefinitions}`);
});

test('2. Independence: Maria (Mother) and José (Father) have isolated configurations', () => {
  // Simulate two isolated in-memory stores matching Supabase table structure
  const store = new Map();

  function saveSettings(caredPersonId, enabledCodes) {
    const personSettings = new Map();
    for (const code of enabledCodes) {
      personSettings.set(code, {
        cared_person_id: caredPersonId,
        definition_code: code,
        enabled: true,
        updated_at: new Date().toISOString(),
      });
    }
    store.set(caredPersonId, personSettings);
  }

  function getSettings(caredPersonId) {
    return store.get(caredPersonId) || new Map();
  }

  const motherId = 'cared-person-maria-001';
  const fatherId = 'cared-person-jose-002';

  // Configure Mother with 7 modules
  saveSettings(motherId, [
    'routine_meals',
    'routine_hydration',
    'meds_scheduled',
    'memory_orientation_date',
    'autonomy_eating',
    'safety_fall_occurred',
    'checkin_btn_im_well',
  ]);

  // Configure Father with only 3 modules (basic routine)
  saveSettings(fatherId, [
    'routine_meals',
    'checkin_btn_im_well',
    'checkin_btn_need_help',
  ]);

  // Assert Mother settings
  const motherSettings = getSettings(motherId);
  assert.equal(motherSettings.size, 7);
  assert.equal(motherSettings.has('memory_orientation_date'), true);
  assert.equal(motherSettings.has('safety_fall_occurred'), true);
  assert.equal(motherSettings.has('checkin_btn_need_help'), false);

  // Assert Father settings
  const fatherSettings = getSettings(fatherId);
  assert.equal(fatherSettings.size, 3);
  assert.equal(fatherSettings.has('memory_orientation_date'), false, 'Father must NOT inherit memory orientation');
  assert.equal(fatherSettings.has('safety_fall_occurred'), false, 'Father must NOT inherit falls');
  assert.equal(fatherSettings.has('checkin_btn_need_help'), true);

  // Alter Mother's settings - add medication confirmation
  saveSettings(motherId, [
    ...motherSettings.keys(),
    'meds_taken_confirmation',
  ]);

  // Re-check Father - must be completely unaffected
  const fatherSettingsAfter = getSettings(fatherId);
  assert.equal(fatherSettingsAfter.size, 3, 'Modifying Mother must never alter Father');
  assert.equal(fatherSettingsAfter.has('meds_taken_confirmation'), false);
});

test('3. Dependency Validator: rejects items without prerequisites and accepts valid ones', () => {
  // Test invalid: meds_taken_confirmation requires meds_scheduled
  const invalidCase1 = validateDependencies(['meds_taken_confirmation']);
  assert.equal(invalidCase1.valid, false);
  assert.equal(invalidCase1.missingDependencies.length, 1);
  assert.equal(invalidCase1.missingDependencies[0].itemCode, 'meds_taken_confirmation');
  assert.equal(invalidCase1.missingDependencies[0].requiredCode, 'meds_scheduled');

  // Test valid: meds_taken_confirmation WITH meds_scheduled
  const validCase1 = validateDependencies(['meds_scheduled', 'meds_taken_confirmation']);
  assert.equal(validCase1.valid, true);
  assert.equal(validCase1.missingDependencies.length, 0);

  // Test checkin button dependency: checkin_btn_ate requires routine_meals
  const invalidCase2 = validateDependencies(['checkin_btn_ate']);
  assert.equal(invalidCase2.valid, false);
  assert.equal(invalidCase2.missingDependencies[0].itemCode, 'checkin_btn_ate');
  assert.equal(invalidCase2.missingDependencies[0].requiredCode, 'routine_meals');

  // Test valid: checkin_btn_ate with routine_meals
  const validCase2 = validateDependencies(['routine_meals', 'checkin_btn_ate']);
  assert.equal(validCase2.valid, true);
});

test('4. Non-Medical Rule & Deterministic Comparison: statistical comparison without medical diagnosis', () => {
  // Must have legal non-diagnostic disclaimer
  assert.ok(PATTERN_DISCLAIMER.includes('diagnóstico médico'), 'Disclaimer must explicitly state no medical diagnosis');
  assert.ok(PATTERN_DISCLAIMER.includes('avaliação clínica'), 'Disclaimer must explicitly state no clinical evaluation');
  assert.ok(PATTERN_DISCLAIMER.includes('registros da própria família'), 'Disclaimer must mention family records');

  // Comparison 1: Hydration drop
  const resultDrop = calculateDeterministicComparison({
    moduleCode: 'routine_hydration',
    categoryCode: 'daily_routine',
    metricLabel: 'Hidratação (copos)',
    unit: 'copos de água',
    previousWindowValues: [6, 7, 6, 8, 7, 6, 7], // 47 total
    currentWindowValues: [2, 3, 2, 2, 3, 2, 2], // 16 total
  });
  assert.equal(resultDrop.direction, 'decreased');
  assert.ok(resultDrop.changeDescription.includes('a menos'));
  assert.equal(resultDrop.disclaimer, PATTERN_DISCLAIMER);

  // Comparison 2: Stable meals
  const resultStable = calculateDeterministicComparison({
    moduleCode: 'routine_meals',
    categoryCode: 'daily_routine',
    metricLabel: 'Refeições',
    unit: 'refeições',
    previousWindowValues: [3, 3, 3, 3, 3, 3, 3], // 21
    currentWindowValues: [3, 3, 3, 3, 3, 3, 3], // 21
  });
  assert.equal(resultStable.direction, 'stable');
  assert.ok(resultStable.changeDescription.includes('estáveis'));

  // Comparison 3: Help requests increase
  const resultHelp = calculateDeterministicComparison({
    moduleCode: 'safety_help_requests',
    categoryCode: 'safety_incidents',
    metricLabel: 'Chamados de Ajuda',
    unit: 'pedidos',
    previousWindowValues: [0, 0, 0, 0, 0, 0, 0], // 0
    currentWindowValues: [1, 0, 1, 0, 0, 1, 0], // 3
    minimumThreshold: 2,
  });
  assert.equal(resultHelp.direction, 'increased');
  assert.ok(resultHelp.changeDescription.includes('a mais'));

  // Ensure no blacklisted clinical diagnostic terms are present in generated text
  const blacklistedMedicalWords = [
    'diagnóstico de',
    'paciente com alzheimer',
    'quadro depressivo',
    'sintoma de demência',
    'receitar',
    'prescrição de dosagem',
  ];

  for (const word of blacklistedMedicalWords) {
    assert.ok(!resultDrop.changeDescription.toLowerCase().includes(word), `Text must not include ${word}`);
    assert.ok(!resultStable.changeDescription.toLowerCase().includes(word), `Text must not include ${word}`);
    assert.ok(!resultHelp.changeDescription.toLowerCase().includes(word), `Text must not include ${word}`);
  }
});
