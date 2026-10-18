import { AAV_RESEARCH_INPUTS } from './advantage-energy-research-valuation';
import { AAV_ILLUSTRATIVE_SCENARIOS, type ScenarioName } from './advantage-energy-scenario-engine';
import { AAV_V2_HYPOTHETICAL, type V2Assumptions } from './advantage-energy-v2';

/** V3 is a hypothetical terminal-year capex sensitivity, NOT a sourced AAV valuation. */
export interface V3Year {
  year: number;
  operatingYearFraction: number;
  producedBoe: number;
  remainingBudgetBoe: number;
  beginningProductionBoeDay: number;
  endingProductionBoeDay: number;
  capexCad: number;
  preTaxCashFlowCad: number;
  discountedCashFlowCad: number;
}
export interface V3Result {
  name: ScenarioName;
  enterpriseValueCad: number;
  equityValueCad: number;
  modelValuePerShareCad: number;
  producedBoe: number;
  remainingBudgetBoe: number;
  years: V3Year[];
}

function validate(a: V2Assumptions): void {
  const values = [a.recoverableBudgetBoe, a.naturalDeclineRate, a.developmentCadPerFlowingBoeDay, a.forecastYears, a.annualDays];
  if (values.some(v => !Number.isFinite(v)) || a.recoverableBudgetBoe <= 0 ||
      a.naturalDeclineRate < 0 || a.naturalDeclineRate >= 1 ||
      a.developmentCadPerFlowingBoeDay <= 0 || !Number.isInteger(a.forecastYears) ||
      a.forecastYears < 1 || a.forecastYears > 40 || a.annualDays <= 0 || a.annualDays > 366) {
    throw new Error('Invalid AAV V3 hypothetical assumptions');
  }
}

/**
 * Linear within-year capacity approximation. A fraction f of a year incurs f of annual
 * capex, adds f of annual new capacity and experiences f of annual linear decline.
 * Volume is integrated over that operating fraction, not extrapolated after depletion.
 * This is a transparent sensitivity assumption, not a realistic well-level schedule.
 */
export function calculateAavV3(a: V2Assumptions = AAV_V2_HYPOTHETICAL): V3Result[] {
  validate(a);
  return AAV_ILLUSTRATIVE_SCENARIOS.map(s => {
    let rate: number = AAV_RESEARCH_INPUTS.productionBoePerDay;
    let remaining = a.recoverableBudgetBoe;
    let ev = 0;
    const years: V3Year[] = [];
    for (let year = 1; year <= a.forecastYears && remaining > 1e-6; year++) {
      const begin = rate;
      const addedFull = s.annualCapexCad / a.developmentCadPerFlowingBoeDay;
      const deltaFull = -begin * a.naturalDeclineRate + addedFull;
      const volumeAt = (f: number) => a.annualDays * (begin * f + 0.5 * deltaFull * f * f);
      const fullVolume = volumeAt(1);
      if (!(fullVolume > 0) || !Number.isFinite(fullVolume)) throw new Error('AAV V3 invalid production');
      let fraction = 1;
      if (fullVolume > remaining) {
        let lo = 0, hi = 1;
        for (let i = 0; i < 70; i++) {
          const mid = (lo + hi) / 2;
          if (volumeAt(mid) < remaining) lo = mid;
          else hi = mid;
        }
        fraction = (lo + hi) / 2;
      }
      const produced = Math.min(remaining, volumeAt(fraction));
      const end = begin + deltaFull * fraction;
      const capex = s.annualCapexCad * fraction;
      const gasMcf = produced * AAV_RESEARCH_INPUTS.gasEnergyShare * 6;
      const liquidsBbl = produced * (1 - AAV_RESEARCH_INPUTS.gasEnergyShare);
      const revenue = gasMcf * s.gasPriceCadPerMcf + liquidsBbl * s.liquidsPriceCadPerBbl;
      const royalties = revenue * AAV_RESEARCH_INPUTS.royaltyRate;
      const fieldAndTransport = produced * 6 * (s.operatingCostCadPerMcfe + s.transportationCostCadPerMcfe);
      const ga = produced * AAV_RESEARCH_INPUTS.gaCadPerBoe;
      const cash = revenue - royalties - fieldAndTransport - ga - capex;
      // Same year-end discount convention as V2, to isolate terminal-year capex sensitivity.
      const discounted = cash / Math.pow(1 + s.discountRate, year);
      if (![produced, end, capex, cash, discounted].every(Number.isFinite)) throw new Error('AAV V3 overflow');
      ev += discounted;
      remaining = Math.max(0, remaining - produced);
      years.push({year, operatingYearFraction:fraction, producedBoe:produced,
        remainingBudgetBoe:remaining, beginningProductionBoeDay:begin,
        endingProductionBoeDay:end, capexCad:capex,
        preTaxCashFlowCad:cash, discountedCashFlowCad:discounted});
      rate = end;
    }
    const equity = ev - AAV_RESEARCH_INPUTS.netDebtCad;
    return {name:s.name, enterpriseValueCad:ev, equityValueCad:equity,
      modelValuePerShareCad:equity / AAV_RESEARCH_INPUTS.shareCountProxy,
      producedBoe:a.recoverableBudgetBoe - remaining, remainingBudgetBoe:remaining, years};
  });
}
