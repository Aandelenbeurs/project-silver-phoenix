import assert from 'node:assert/strict';
import {INTELLIGENCE_DEMOS} from '../data/multi-sector/research/intelligence/demonstration';
import {emptyIntelligenceState,importDocument,decideCandidate,approvedResearchInputs,analysisImpact,assertState,addManualCandidate,recordSourceCheck,assessFreshness,candidateProblems} from '../data/multi-sector/research/intelligence/workflow';
import {getAavValidationReview} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-validation-review';
const at='2026-10-21T18:00:00.000Z',later='2026-10-21T18:01:00.000Z';
let s=importDocument(emptyIntelligenceState(),INTELLIGENCE_DEMOS[0].document,at).state;
const original=structuredClone(s),c=s.candidates[0],doc=s.documents[0];
assert.equal(importDocument(s,INTELLIGENCE_DEMOS[0].document,later).state,s);
const decision={candidateId:c.id,fingerprint:c.fingerprint,documentHash:doc.contentHash,action:'approve' as const,reason:'Originele bron en schaal afzonderlijk gecontroleerd.',attested:true};
assert.throws(()=>decideCandidate(s,{...decision,attested:false},later));assert.throws(()=>decideCandidate(s,{...decision,fingerprint:'changed'},later));
s=decideCandidate(s,decision,later);assert.deepEqual(original.candidates,s.candidates);assert.equal(s.decisions.length,1);assertState(s);
assert.equal(approvedResearchInputs(s,'2026-10-21')[0].valuationReleased,false);assert.equal(approvedResearchInputs(s,'2026-10-21')[0].modelInputValidated,false);
assert.throws(()=>decideCandidate(s,decision,later));
const changed=importDocument(s,{...INTELLIGENCE_DEMOS[0].document,text:'Net debt of $600 million.'},later).state;
assert.equal(changed.documents.length,2);assert.equal(changed.decisions.length,1);assert.equal(approvedResearchInputs(changed,'2026-10-21')[0].availability,'needs-review');
assert.notEqual(changed.candidates[1].fingerprint,c.fingerprint);
const next=importDocument(s,{...INTELLIGENCE_DEMOS[0].document,publishedAt:'2026-10-20',period:{start:'2026-09-30',end:'2026-09-30'}},later).state;
assert.equal(next.documents[0].period.end,'2026-06-30');assert.equal(next.documents[1].period.end,'2026-09-30');assert.equal(analysisImpact(next,'advantage-energy','2026-10-21').status,'revision-needed');
const nc=next.candidates.at(-1)!,nd=next.documents.at(-1)!;
const approved=decideCandidate(next,{...decision,candidateId:nc.id,fingerprint:nc.fingerprint,documentHash:nd.contentHash},later);
assert.equal(analysisImpact(approved,'advantage-energy','2026-10-21').status,'outdated');
const rejected=decideCandidate(original,{...decision,action:'reject',attested:false},later);assert.equal(approvedResearchInputs(rejected,'2026-10-21').length,0);
for(const change of [{publishedAt:null},{url:'https://news.example.com/report'}]){const x=importDocument(emptyIntelligenceState(),{...INTELLIGENCE_DEMOS[0].document,...change},at).state;assert.throws(()=>decideCandidate(x,{...decision,candidateId:x.candidates[0].id,fingerprint:x.candidates[0].fingerprint,documentHash:x.documents[0].contentHash},later));}
assert.throws(()=>importDocument(s,{...INTELLIGENCE_DEMOS[0].document,supersedes:doc.id,period:{start:'2026-09-30',end:'2026-09-30'}},later));
const corrupt=structuredClone(s);corrupt.candidates[0].datum.value=1;assert.throws(()=>assertState(corrupt));const badAudit=structuredClone(s);badAudit.audit[0].action='reject';assert.throws(()=>assertState(badAudit));
const check=recordSourceCheck(emptyIntelligenceState(),{id:'test-check',channelId:'aav-financials',at,lastSuccessAt:at,status:'success',coverage:'index-only',message:'Fixture only',found:[]});assert.equal(analysisImpact(check,'advantage-energy','2026-10-21').status,'unknown');
assert.equal(getAavValidationReview().passed,6);
// Manual non-matching metric is supported without new extraction engines.
const manual=addManualCandidate(original,doc.id,{metric:'netDebt',value:560200000,unit:'CAD',currency:'CAD',kind:'reported',rawNumber:'560.2',scale:1000000,quote:doc.text,locator:'Original PDF p.2'},later);assert.equal(manual.candidates.length,2);assertState(manual);
console.log('PASS: dedup, explicit individual decisions, immutable history, version-bound approvals, rejection, audit tampering, missing/secondary evidence, period correction rules, stale-impact and AAV 6/17');

assert.equal(assessFreshness({asOf:'2026-10-21',essentialOutdated:false,pendingRelevant:false,coverageComplete:true,lastSuccessfulAt:'2026-10-20'}),'current');
assert.equal(assessFreshness({asOf:'2026-10-21',essentialOutdated:false,pendingRelevant:false,coverageComplete:true,lastSuccessfulAt:'2026-09-01'}),'unknown');

const conflictDoc={...INTELLIGENCE_DEMOS[0].document,title:'Synthetic conflict fixture',url:'https://www.advantageog.com/wp-content/uploads/Q2-2026-Report.pdf',text:'Net debt of $600 million.'};
const conflicting=importDocument(original,conflictDoc,later).state;assert.ok(candidateProblems(conflicting,conflicting.candidates.at(-1)!,'2026-10-21').some(x=>x.includes('Andere waarde')));
