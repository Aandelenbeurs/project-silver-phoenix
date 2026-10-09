import assert from 'node:assert/strict';
import { AAV_RESEARCH_INPUTS, calculateAavResearchValuation } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-research-valuation';
import { runAdvantageEnergyScenarios } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';

const result = calculateAavResearchValuation();
assert.deepEqual(result.map(r => r.name), ['bear','base','bull','moonshot']);
for (const r of result) {
  assert.equal(r.years.length, 5);
  assert.ok(Number.isFinite(r.perShareCad));
  assert.ok(Math.abs(r.enterpriseValueCad - r.years.reduce((a,y)=>a+y.discountedPreTaxCashFlowCad,0)) < 0.01);
  assert.ok(Math.abs(r.equityValueCad - (r.enterpriseValueCad - AAV_RESEARCH_INPUTS.netDebtCad)) < 0.01);
}
assert.equal(runAdvantageEnergyScenarios().status, 'blocked', 'Strict valuation must remain blocked');
assert.throws(() => calculateAavResearchValuation({...AAV_RESEARCH_INPUTS, shareCountProxy:0}));
assert.throws(() => calculateAavResearchValuation({...AAV_RESEARCH_INPUTS, gasEnergyShare:1.2}));
console.log('PASS: four finite five-year research valuations, strict valuation still blocked, invalid inputs rejected');
for (const r of result) console.log(`${r.name}: CAD ${r.perShareCad.toFixed(2)} per proxy share (illustrative pre-tax 5y DCF)`);
