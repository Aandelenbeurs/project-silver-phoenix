import assert from 'node:assert/strict';
import { AAV_V2_HYPOTHETICAL, calculateAavV2 } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v2';
import { calculateAavV3 } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v3';
import { AAV_ILLUSTRATIVE_SCENARIOS, runAdvantageEnergyScenarios } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
const v2 = calculateAavV2();
const v3 = calculateAavV3();
assert.equal(v3.length, 4);
for (const r of v3) {
  const old = v2.find(x => x.name === r.name)!;
  const s = AAV_ILLUSTRATIVE_SCENARIOS.find(x => x.name === r.name)!;
  assert.ok(Number.isFinite(r.modelValuePerShareCad));
  assert.ok(r.years.length > 0 && r.years.length <= AAV_V2_HYPOTHETICAL.forecastYears);
  assert.ok(r.producedBoe <= AAV_V2_HYPOTHETICAL.recoverableBudgetBoe + .01);
  assert.ok(r.years.every(y => y.operatingYearFraction > 0 && y.operatingYearFraction <= 1 && y.capexCad <= s.annualCapexCad + .01));
  assert.ok(r.years.every(y => y.remainingBudgetBoe >= 0 && y.producedBoe >= 0));
  assert.ok(r.years.slice(0,-1).every(y => Math.abs(y.operatingYearFraction - 1) < 1e-10));
  const last = r.years.at(-1)!;
  if (last.operatingYearFraction < .999999) assert.ok(last.capexCad < s.annualCapexCad);
  console.log(`${r.name}: V2 ${old.modelValuePerShareCad.toFixed(2)} -> V3 ${r.modelValuePerShareCad.toFixed(2)} CAD/share; last-year fraction ${last.operatingYearFraction.toFixed(3)}`);
}
for (const bad of [
  {...AAV_V2_HYPOTHETICAL, recoverableBudgetBoe: -1},
  {...AAV_V2_HYPOTHETICAL, naturalDeclineRate: 1},
  {...AAV_V2_HYPOTHETICAL, developmentCadPerFlowingBoeDay: 0},
  {...AAV_V2_HYPOTHETICAL, forecastYears: 1.5},
]) assert.throws(() => calculateAavV3(bad), /Invalid/);
const small = calculateAavV3({...AAV_V2_HYPOTHETICAL, recoverableBudgetBoe: 1_000_000});
assert.ok(small.every(r => r.years.length === 1 && r.years[0].operatingYearFraction < 1));
assert.ok(small.every(r => Math.abs(r.producedBoe - 1_000_000) < .01));
assert.equal(runAdvantageEnergyScenarios().status, 'blocked');
console.log('PASS: V3 terminal-year capex sensitivity, depletion, input guards, strict valuation gate');
