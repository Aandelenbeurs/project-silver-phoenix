import type { V2Assumptions } from './advantage-energy-v2';
/** Shared numerical contract for the research investment engines. */
export function assertAavInvestmentAssumptions(a: V2Assumptions): void {
  if (Object.values(a).some(v => typeof v !== 'number' || !Number.isFinite(v)) ||
      a.recoverableBudgetBoe <= 0 || a.developmentCadPerFlowingBoeDay <= 0 ||
      a.naturalDeclineRate < 0 || a.naturalDeclineRate >= 1 ||
      a.annualDays <= 0 || a.annualDays > 366 ||
      !Number.isInteger(a.forecastYears) || a.forecastYears < 1 || a.forecastYears > 40) {
    throw new Error('Invalid AAV investment assumptions');
  }
}
