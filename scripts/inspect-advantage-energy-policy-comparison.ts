import { strict as assert } from 'node:assert';
import { getAavPolicyComparison } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-policy-comparison';
import { compareAavInvestmentPolicies } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-policy';
const comparisons=getAavPolicyComparison();
assert.equal(comparisons.length,4);
for(const group of comparisons){
 assert.equal(group.rows.length,5);
 const fixed=group.rows.find(r=>r.policy==='fixed')!;
 assert.ok(Math.abs(fixed.incrementalEquityPerShareVsFixedCad)<1e-8);
 const originals=compareAavInvestmentPolicies(group.scenario);
 for(const row of group.rows){
  const source=originals.find(r=>r.policy===row.policy)!;
  assert.ok(Math.abs(row.enterpriseValueCad-source.enterpriseValueCad)<0.01);
  assert.ok(Math.abs(row.totalCapexCad-source.years.reduce((sum,y)=>sum+y.capexCad,0))<0.01);
  assert.ok(Math.abs(row.cumulativePreTaxCashFlowCad-source.years.reduce((sum,y)=>sum+y.preTaxCashFlowCad,0))<0.01);
  assert.ok(row.totalCapexCad>=0 && row.producedBoe>=0);
  assert.ok(Number.isFinite(row.equityPerShareCad));
 }
 assert.equal(group.highestModeledEquityPolicy,[...group.rows].sort((a,b)=>b.equityPerShareCad-a.equityPerShareCad)[0].policy);
}
for(const scenario of ['bear','base','bull','moonshot'] as const){
 const adaptive=compareAavInvestmentPolicies(scenario).find(r=>r.policy==='adaptive-grid')!;
 assert.ok(adaptive.years.length>0);
 assert.ok(adaptive.years.every(y=>y.capexCad>=0 && y.preTaxCashFlowCad===y.preTaxCashFlowCad));
 assert.ok(adaptive.years.every(y=>y.decision.includes('Adaptieve capex')));
}
console.log('PASS: four scenarios, five policies, adaptive-grid decisions, comparison totals, V3 baseline, winner selection');
