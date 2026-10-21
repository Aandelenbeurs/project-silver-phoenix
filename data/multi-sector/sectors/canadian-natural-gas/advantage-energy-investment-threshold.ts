import { assertAavInvestmentAssumptions } from './advantage-energy-assumption-validation';
import { AAV_ILLUSTRATIVE_SCENARIOS, type ScenarioName } from './advantage-energy-scenario-engine';
import { AAV_V2_HYPOTHETICAL, type V2Assumptions } from './advantage-energy-v2';
import { diagnoseAavMarginalInvestment } from './advantage-energy-marginal-investment';

/** Hypothetical one-time investment break-even; does not modify the guarded valuation engine. */
export interface ThresholdCell {
  efficiencyMultiplier: number;
  capexCad: number;
  breakEvenGasPriceCadPerMcf: number | null;
  npvAtBaseGasCad: number;
  profitableAtBaseGas: boolean;
}
export interface ThresholdReport {
  scenario: ScenarioName;
  referenceGasPriceCadPerMcf: number;
  cells: ThresholdCell[];
  efficiencyMultipliers: number[];
  capexLevelsCad: number[];
  note: string;
}

export function calculateAavInvestmentThresholds(
  scenario: ScenarioName = 'base',
  efficiencyMultipliers: readonly number[] = [0.75, 1, 1.25, 1.5, 2],
  capexLevelsCad: readonly number[] = [50e6, 100e6, 200e6, 350e6],
  assumptions: V2Assumptions = AAV_V2_HYPOTHETICAL,
): ThresholdReport {
  const s = AAV_ILLUSTRATIVE_SCENARIOS.find(x => x.name === scenario);
  if (!s) throw new Error('Unknown scenario');
  if (efficiencyMultipliers.some(x => !Number.isFinite(x) || x <= 0) || capexLevelsCad.some(x => !Number.isFinite(x) || x <= 0)) throw new Error('Invalid threshold inputs');
  assertAavInvestmentAssumptions(assumptions);
  const cells: ThresholdCell[] = [];
  for (const efficiencyMultiplier of efficiencyMultipliers) {
    // A higher multiplier means more flowing boe/d capacity per invested dollar.
    const adjusted = {
      ...assumptions,
      developmentCadPerFlowingBoeDay: assumptions.developmentCadPerFlowingBoeDay / efficiencyMultiplier,
    };
    for (const capexCad of capexLevelsCad) {
      // Production is price-independent in this fixed-path sensitivity. Compute
      // once; the gas-price NPV is affine, including negative displaced volumes.
      const diagnostic = diagnoseAavMarginalInvestment(scenario, adjusted, [0, capexCad]);
      const row = diagnostic.rows[1];
      const slope = row.years.reduce((sum, y, i) => sum +
        y.incrementalProductionBoe * requireGasShare() * 6 * (1 - requireRoyalty()) /
        Math.pow(1 + s.discountRate, i + 1), 0);
      const npvAt = (gasPriceCadPerMcf: number): number =>
        row.fullHorizonNpvCad + slope * (gasPriceCadPerMcf - s.gasPriceCadPerMcf);
      const npvAtBaseGasCad = npvAt(s.gasPriceCadPerMcf);
      let lo = 0, hi = 30;
      let breakEvenGasPriceCadPerMcf: number | null = null;
      if (npvAt(lo) >= 0) breakEvenGasPriceCadPerMcf = 0;
      else if (npvAt(hi) >= 0) {
        for (let i = 0; i < 65; i++) {
          const mid = (lo + hi) / 2;
          if (npvAt(mid) >= 0) hi = mid;
          else lo = mid;
        }
        breakEvenGasPriceCadPerMcf = hi;
      }
      cells.push({ efficiencyMultiplier, capexCad, breakEvenGasPriceCadPerMcf, npvAtBaseGasCad, profitableAtBaseGas: npvAtBaseGasCad > 0 });
    }
  }
  return {
    scenario, referenceGasPriceCadPerMcf: s.gasPriceCadPerMcf, cells,
    efficiencyMultipliers: [...efficiencyMultipliers], capexLevelsCad: [...capexLevelsCad],
    note: 'Hypothetische eenmalige capex in jaar 1 versus nul capex; daarna geen investeringen. Productieprofiel en reserveplafond uit bestaande marginale motor. Gasprijs varieert, overige scenario-inputs constant. Break-even is incrementele NPV=0, geen ondernemingswaardering of koersdoel. Geen belastingen, hedges, afzonderlijke putten of terminal value.',
  };
}

import { AAV_RESEARCH_INPUTS } from './advantage-energy-research-valuation';
function requireGasShare() { return AAV_RESEARCH_INPUTS.gasEnergyShare; }
function requireRoyalty() { return AAV_RESEARCH_INPUTS.royaltyRate; }
