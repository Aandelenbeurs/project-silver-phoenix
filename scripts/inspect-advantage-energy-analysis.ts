import { strict as assert } from 'node:assert';
import { getAavAnalysis, summarizeTechnicalBlockers } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-analysis';
import { calculateAavV3 } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v3';
import { runAdvantageEnergyScenarios } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
const result=getAavAnalysis();
assert.equal(result.scenarios.length,4);
assert.equal(result.sensitivity.length,2);
for(const x of result.sensitivity){assert.ok(Number.isFinite(x.lowValueCad));assert.ok(Number.isFinite(x.highValueCad));assert.ok(Math.abs(x.baseValueCad-result.scenarios.find(s=>s.name==='base')!.modelValuePerShareCad)<1e-9);}
assert.deepEqual(result.scenarios,calculateAavV3());
const strictResult=runAdvantageEnergyScenarios();
assert.equal(strictResult.status,'blocked');
assert.equal(strictResult.results.length,0);
const groups=summarizeTechnicalBlockers(strictResult.errors);
assert.ok(groups.length<=strictResult.errors.length);
assert.equal(groups.reduce((n,g)=>n+g.count,0),strictResult.errors.length);
console.log('PASS: scenario parity, sensitivities, grouped blockers, strict valuation gate');
