import { strict as assert } from 'node:assert';
import { compareAavInvestmentPolicies } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-policy';
import { calculateAavV3 } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v3';
import { runAdvantageEnergyScenarios } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
for(const scenario of ['bear','base','bull','moonshot'] as const){
 const results=compareAavInvestmentPolicies(scenario);
 assert.deepEqual(results.map(x=>x.policy),['fixed','runoff','maintenance','economic-gate']);
 const old=calculateAavV3().find(x=>x.name===scenario)!;
 assert.ok(Math.abs(results[0].enterpriseValueCad-old.enterpriseValueCad)<0.05);
 for(const result of results){
  assert.ok(Number.isFinite(result.valuePerShareCad));
  assert.ok(result.remainingBoe>=-0.01);
  assert.ok(result.producedBoe<=250_000_000+0.01);
  assert.ok(result.years.every(y=>y.capexCad>=0 && y.fraction>0 && y.fraction<=1 && y.producedBoe>=0));
  if(result.policy==='runoff')assert.ok(result.years.every(y=>y.capexCad===0));
 }
}
assert.equal(runAdvantageEnergyScenarios().status,'blocked');
console.log('PASS: four scenarios, V3 parity, reserve cap, policy invariants, strict valuation gate');
