import assert from 'node:assert/strict';
import {integrationFixture,fixtureAt} from './intelligence-integration-fixture';
import {documentView,analysisOutcome} from '../data/multi-sector/research/intelligence/document-view';
import {analyseDocument} from '../data/multi-sector/research/intelligence/pdf-analysis';
import {assertState,decideCandidate,approvedResearchInputs,registerPdfAnalysis,registerDiscovered} from '../data/multi-sector/research/intelligence/workflow';
import {getAavValidationReview} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-validation-review';
async function main(){
 const {state,originals,analyses}=integrationFixture();const originalBytes=JSON.stringify(state);
 assert.equal(state.documents.length,29);assert.equal(state.candidates.length,94);assert.equal(state.decisions.length,0);
 for(const [i,count] of [54,32,8].entries()){
  assert.equal(state.candidates.filter(c=>c.documentId===originals[i]).length,0,'reproduces old exact-ID failure');
  const resolved=documentView(state,originals[i])!;assert.equal(resolved.effective.id,analyses[i]);assert.equal(resolved.candidates.length,count);assert.equal(resolved.status,'PDF verwerkt');assert.ok(resolved.periods.length);assert.ok(resolved.history.some(d=>d.id===originals[i]));assert.ok(resolved.history.some(d=>d.id===analyses[i]));
  assert.equal(documentView(JSON.parse(JSON.stringify(state)),originals[i])!.candidates.length,count,'refresh does not need ephemeral analysis selection');
  const again=await analyseDocument(state,originals[i],fixtureAt,async()=>{throw Error('cached result must not fetch');});assert.deepEqual(again,state);
  const outcome=analysisOutcome(state,again,originals[i]);assert.equal(outcome.status,'processed');assert.equal(outcome.total,count);assert.equal(outcome.new,0);assert.equal(outcome.existing,count);assert.equal(outcome.analysisDocumentId,analyses[i]);
  const before={...state,candidates:[]};assert.equal(analysisOutcome(before,state,originals[i]).new,count);
 }
 assert.equal(JSON.stringify(state),originalBytes,'presentation and reanalysis do not mutate records');
 assert.equal(documentView(state,'missing'),null);assert.equal(analysisOutcome(state,state,originals[4]).status,'unresolved');
 const c=state.candidates[0],doc=state.documents.find(d=>d.id===c.documentId)!;
 const approved=decideCandidate(state,{candidateId:c.id,fingerprint:c.fingerprint,documentHash:doc.contentHash,action:'approve',reason:'Synthetic evidence checked against fictional source.',attested:true},fixtureAt);
 const preserved=await analyseDocument(approved,originals[0],fixtureAt,async()=>{throw Error('no network');});assert.deepEqual(preserved,approved);assert.equal(approvedResearchInputs(preserved,'2026-10-22')[0].valuationReleased,false);assert.equal(getAavValidationReview().passed,6);
 const failed=registerPdfAnalysis(state,originals[4],{fileHash:null,parser:'synthetic',pages:0,values:[],warnings:['Synthetic download blocked'],reportDate:null,errorCode:'ROBOTS',publishedAt:null},fixtureAt);
 const failure=analysisOutcome(state,failed,originals[4]);assert.equal(failure.status,'error');assert.equal(failure.total,0);assert.match(failure.message,/niet toe/);assert.deepEqual(failure.warnings,['Synthetic download blocked']);assert.match(documentView(failed,originals[4])!.status,/mislukt/);
 const noRows=registerPdfAnalysis(state,originals[5],{fileHash:'f'.repeat(64),parser:'synthetic',pages:1,values:[],warnings:['No supported rows'],reportDate:null,errorCode:null,publishedAt:null},fixtureAt);
 assert.equal(analysisOutcome(state,noRows,originals[5]).status,'no-candidates');
 // Same URL or title is never sufficient: different bytes must not inherit candidates.
 const source=state.documents[0];const {id,version,discoveredAt,status,contentHash,...core}=source;
 const changed=registerDiscovered(state,{...core,monitoring:{...core.monitoring!,bodyHash:'a'.repeat(64),previousVersion:source.id}},fixtureAt);
 assert.equal(documentView(changed.state,changed.documentId)!.candidates.length,0);
 // Verified same full-file hash may reuse analysis, even for another source alias.
 const alias=registerDiscovered(state,{...core,title:'Synthetic verified alias',url:'https://www.advantageog.com/wp-content/uploads/synthetic-alias.pdf'},fixtureAt);
 assert.equal(documentView(alias.state,alias.documentId)!.candidates.length,54);
 const badAlias=registerDiscovered(state,{...core,title:'No byte evidence',monitoring:{...core.monitoring!,bodyHash:null,hashBasis:'index-metadata'}},fixtureAt);
 assert.equal(documentView(badAlias.state,badAlias.documentId)!.candidates.length,0);
 // A failed newer attempt is visible; it does not masquerade as the older success.
 const newer=registerPdfAnalysis(approved,originals[0],{fileHash:'b'.repeat(64),parser:'synthetic',pages:0,values:[],warnings:['Failure'],reportDate:null,errorCode:'TIMEOUT',publishedAt:null},fixtureAt);
 assert.equal(documentView(newer,originals[0])!.candidates.length,0);assert.equal(documentView(newer,analyses[0])!.candidates.length,54,'historical analysis selection remains exact');assert.equal(analysisOutcome(approved,newer,originals[0]).status,'error');assert.deepEqual(newer.decisions,approved.decisions);assertState(newer);
 console.log('PASS: 29/94 fixture, original/analysis identity, refresh, cached reanalysis, new/existing counts, hash aliases, conservative version separation, explicit failures/zero rows, historical selection, immutable approvals and AAV 6/17. Browser interaction verified separately.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
