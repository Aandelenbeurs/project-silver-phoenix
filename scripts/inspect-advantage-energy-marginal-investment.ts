import assert from 'node:assert/strict';
import { diagnoseAavMarginalInvestment } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-marginal-investment';
for(const scenario of ['bear','base','bull','moonshot'] as const){
 const result=diagnoseAavMarginalInvestment(scenario);
 assert.equal(result.rows.length,5);
 assert.deepEqual(result.rows.map(x=>x.firstYearCapexCad),[0,50e6,100e6,200e6,350e6]);
 for(const row of result.rows){
  assert.equal(row.years.length,result.horizonYears);
  assert.ok(Number.isFinite(row.fullHorizonNpvCad));
  assert.ok(Number.isFinite(row.fiveYearNpvCad));
  assert.ok(Math.abs(row.fullHorizonNpvCad-row.years.reduce((s,y)=>s+y.discountedIncrementalCashFlowCad,0))<0.01);
  assert.ok(Math.abs(row.fiveYearNpvCad-row.years.slice(0,5).reduce((s,y)=>s+y.discountedIncrementalCashFlowCad,0))<0.01);
  assert.ok(Math.abs(row.incrementalProductionBoe-row.years.reduce((s,y)=>s+y.incrementalProductionBoe,0))<0.01);
  assert.ok(row.years.every(y=>y.baselineProductionBoe>=0&&y.investmentProductionBoe>=0));
 }
 const zero=result.rows[0];
 assert.ok(Math.abs(zero.fullHorizonNpvCad)<0.01);
 assert.ok(Math.abs(zero.fiveYearNpvCad)<0.01);
 assert.ok(Math.abs(zero.incrementalProductionBoe)<0.01);
}
console.log('PASS: four scenarios, five investment levels, zero baseline, incremental production, 5-year and full-horizon cash flow reconciliation');
