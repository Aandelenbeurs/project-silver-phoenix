import assert from 'node:assert/strict';
import { calculateAavV2, AAV_V2_HYPOTHETICAL } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v2';
import { runAdvantageEnergyScenarios } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
const results=calculateAavV2();
assert.equal(results.length,4);
for (const r of results) {
  assert.ok(Number.isFinite(r.modelValuePerShareCad));
  assert.ok(r.years.length>0 && r.years.length<=AAV_V2_HYPOTHETICAL.forecastYears);
  assert.ok(r.producedBoe<=AAV_V2_HYPOTHETICAL.recoverableBudgetBoe+0.001);
  assert.ok(r.years.every(y=>y.producedBoe>=0 && y.remainingBudgetBoe>=0));
  console.log(`${r.name}: CAD ${r.modelValuePerShareCad.toFixed(2)} per proxy share; ${r.years.length} years; ${Math.round(r.producedBoe/1e6)} MMboe`);
}
assert.throws(()=>calculateAavV2({...AAV_V2_HYPOTHETICAL,recoverableBudgetBoe:-1}),/Invalid/);
assert.throws(()=>calculateAavV2({...AAV_V2_HYPOTHETICAL,developmentCadPerFlowingBoeDay:0}),/Invalid/);
const constrained=calculateAavV2({...AAV_V2_HYPOTHETICAL,recoverableBudgetBoe:1_000_000});
assert.ok(constrained.every(r=>r.producedBoe<=1_000_000 && r.years.length===1));
assert.equal(runAdvantageEnergyScenarios().status,'blocked');
console.log('PASS: AAV V2 finite, reserve-budget-constrained, invalid inputs rejected, verified gate blocked');
