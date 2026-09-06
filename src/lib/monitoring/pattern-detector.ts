import { PatternChangeInsight } from '@/types/monitoring';

export const PATTERN_DISCLAIMER =
  'Observações geradas estritamente a partir de contagens e comparações numéricas dos registros da própria família. Não constitui diagnóstico médico, avaliação clínica ou recomendação terapêutica.';

export interface MetricComparisonInput {
  moduleCode: string;
  categoryCode: string;
  metricLabel: string;
  unit: string;
  currentWindowValues: number[];
  previousWindowValues: number[];
  minimumThreshold?: number;
}

export function calculateDeterministicComparison(input: MetricComparisonInput): PatternChangeInsight {
  const minThreshold = input.minimumThreshold ?? 3;
  const currentCount = input.currentWindowValues.length;
  const previousCount = input.previousWindowValues.length;
  const totalCount = currentCount + previousCount;

  if (totalCount < minThreshold) {
    return {
      id: `${input.moduleCode}-insufficient`,
      moduleCode: input.moduleCode,
      categoryCode: input.categoryCode,
      metricLabel: input.metricLabel,
      previousWindowSummary: 'Registros insuficientes',
      currentWindowSummary: `${currentCount} registro(s)`,
      changeDescription: 'Ainda não há registros suficientes para comparar este acompanhamento.',
      hasSufficientData: false,
      recordCount: totalCount,
      direction: 'stable',
      disclaimer: PATTERN_DISCLAIMER,
    };
  }

  const currentSum = input.currentWindowValues.reduce((a, b) => a + b, 0);
  const previousSum = input.previousWindowValues.reduce((a, b) => a + b, 0);

  let direction: 'increased' | 'decreased' | 'shifted' | 'stable' = 'stable';
  let changeDescription = '';

  if (currentSum > previousSum) {
    direction = 'increased';
    const diff = currentSum - previousSum;
    changeDescription = `Nos últimos 7 dias foram registrados ${currentSum} ${input.unit}, representando ${diff} a mais que nos 7 dias anteriores (${previousSum} ${input.unit}).`;
  } else if (currentSum < previousSum) {
    direction = 'decreased';
    const diff = previousSum - currentSum;
    changeDescription = `Nos últimos 7 dias foram registrados ${currentSum} ${input.unit}, representando ${diff} a menos que nos 7 dias anteriores (${previousSum} ${input.unit}).`;
  } else {
    direction = 'stable';
    changeDescription = `Os registros mantiveram-se estáveis: ${currentSum} ${input.unit} nesta semana e ${previousSum} ${input.unit} na anterior.`;
  }

  return {
    id: `${input.moduleCode}-${Date.now()}`,
    moduleCode: input.moduleCode,
    categoryCode: input.categoryCode,
    metricLabel: input.metricLabel,
    previousWindowSummary: `${previousSum} ${input.unit} (7 dias anteriores)`,
    currentWindowSummary: `${currentSum} ${input.unit} (últimos 7 dias)`,
    changeDescription,
    hasSufficientData: true,
    recordCount: totalCount,
    direction,
    disclaimer: PATTERN_DISCLAIMER,
  };
}
