import { AAV_REQUIREMENTS, validateAavRequirements, explainAavBlocker } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-evidence-explainer';
import { AAV_EVIDENCE_LEDGER, validateAavEvidenceLedger } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-evidence-ledger';
import { calculateAavV3 } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v3';
import { runAdvantageEnergyScenarios } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
function assert(ok: boolean, message: string): void {if (!ok) throw new Error(message);}
assert(validateAavEvidenceLedger().length===0,'Ledger invalid');
assert(new Set(AAV_EVIDENCE_LEDGER.map(x=>x.id)).size===AAV_EVIDENCE_LEDGER.length,'Duplicate evidence');
assert(AAV_EVIDENCE_LEDGER.filter(x=>x.status==='unverified').every(x=>x.value===null),'Unverified values must be null');
assert(AAV_EVIDENCE_LEDGER.every(x=>!x.eligibleForVerifiedPostSaleModel),'Do not unlock verified gate using historical/proxy evidence');
const result=calculateAavV3();
assert(result.length===4,'Expected four scenarios');
for(const scenario of result) {
 assert(Number.isFinite(scenario.modelValuePerShareCad),'Nonfinite valuation');
 assert(scenario.years.every(y=>y.producedBoe>=0 && y.operatingYearFraction>0 && y.operatingYearFraction<=1),'Invalid annual production');
}
assert(runAdvantageEnergyScenarios().status==='blocked','Strict gate unexpectedly opened');
console.log('PASS: evidence, four scenarios, reserve fractions, strict verified gate');

assert(validateAavRequirements().length===0,'Invalid requirement links');
assert(AAV_REQUIREMENTS.length===5,'Expected five evidence areas');
assert(!explainAavBlocker('claim:postSaleNetDebt: Missing evidence').includes('Missing evidence'),'Raw error leaked');
console.log('PASS: Dutch evidence explanations and linked sources');
