import { strict as assert } from 'node:assert';
import { calculateAavInvestmentThresholds } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-threshold';
import { diagnoseAavMarginalInvestment } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-marginal-investment';
import { runAdvantageEnergyScenarios } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
const report = calculateAavInvestmentThresholds();
assert.equal(report.cells.length, 20);
for (const x of report.cells) {
  assert.ok(Number.isFinite(x.npvAtBaseGasCad));
  assert.ok(x.breakEvenGasPriceCadPerMcf === null || (x.breakEvenGasPriceCadPerMcf >= 0 && x.breakEvenGasPriceCadPerMcf <= 30));
}
const original = diagnoseAavMarginalInvestment('base');
for (const x of report.cells.filter(x => x.efficiencyMultiplier === 1)) {
  const old = original.rows.find(y => y.firstYearCapexCad === x.capexCad)!;
  assert.ok(Math.abs(old.fullHorizonNpvCad - x.npvAtBaseGasCad) < 0.05);
}
assert.equal(runAdvantageEnergyScenarios().status, 'blocked');
console.log('PASS: 20 threshold cells, marginal NPV parity, bounded prices, strict valuation gate');
