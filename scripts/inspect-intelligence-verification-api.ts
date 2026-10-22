import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {verificationFixture} from './verification-test-fixture';
import {GET,POST} from '../app/api/research/intelligence/route';
import {readIntelligence,mutateIntelligence} from '../data/multi-sector/research/intelligence/storage';
import {collectProof,readProofs} from '../data/multi-sector/research/intelligence/verification-storage';
import {decideCandidate,assertState} from '../data/multi-sector/research/intelligence/workflow';
async function main(){
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'phoenix-v116-api-'))),saved=process.env.PHOENIX_INTELLIGENCE_DATA_DIR;process.env.PHOENIX_INTELLIGENCE_DATA_DIR=dir;
 try{
  const {state,bytes,at}=await verificationFixture();const c=state.candidates[0],doc=state.documents.find(d=>d.id===c.documentId)!;
  const preapproved=decideCandidate(state,{candidateId:c.id,fingerprint:c.fingerprint,documentHash:doc.contentHash,action:'approve',reason:'Existing explicit synthetic human approval.',attested:true},at);
  await mutateIntelligence(0,()=>preapproved);const initial=await GET();const missing=await initial.json();assert.equal(initial.status,200);assert.ok(missing.verification.every((r:any)=>r.classification==='unverifiable'));assert.equal(missing.state.decisions.length,1);
  const post=async(payload:Record<string,unknown>)=>POST(new Request('http://localhost:3000/api/research/intelligence',{method:'POST',headers:{'Content-Type':'application/json',Host:'localhost:3000',Origin:'http://localhost:3000'},body:JSON.stringify(payload)}));
  const id=state.documents[0].id;
  await assert.rejects(collectProof(preapproved,id,async url=>url.endsWith('robots.txt')?{status:200,text:'User-agent: *\nDisallow:'}:{status:200,text:'',bytes:Buffer.concat([bytes,Buffer.from('changed')]),contentType:'application/pdf'}),/hash wijkt af/);
  assert.deepEqual((await readProofs(state)).proofs.size,0);
  await mutateIntelligence(preapproved.revision,async current=>{const result=await collectProof(current,id,async url=>url.endsWith('robots.txt')?{status:200,text:'User-agent: *\nDisallow:'}:{status:200,text:'',bytes,contentType:'application/pdf'});assert.equal(result.cached,false);return current;});
  assert.equal((await collectProof(preapproved,id,async()=>{throw Error('cached must not download');})).cached,true);
  assert.deepEqual(await readIntelligence(),preapproved,'verification never modifies candidates, audit or approval');
  const view=await (await GET()).json();assert.ok(view.verification.every((r:any)=>r.classification==='green'));assert.equal(view.valuationReleased,false);assert.match(view.aavVerification,/6\/17/);
  const items=view.verification.slice(1,3).map((r:any)=>{const candidate=state.candidates.find(c=>c.id===r.candidateId)!;return {candidateId:candidate.id,fingerprint:candidate.fingerprint,documentHash:doc.contentHash,verificationHash:r.hash};});
  const batch={items,reason:'Explicit synthetic API batch approval.',confirmed:true,attested:true};
  const before=await fs.readFile(path.join(dir,'intelligence-v1.json'),'utf8');
  const denied=await post({action:'approve-verified-batch',expectedRevision:preapproved.revision,batch:{...batch,items:[items[0],{...items[1],verificationHash:'changed'}]}});assert.equal(denied.status,409);assert.match((await denied.json()).error,/0 beslissingen/);assert.equal(await fs.readFile(path.join(dir,'intelligence-v1.json'),'utf8'),before);
  const requests=await Promise.all([post({action:'approve-verified-batch',expectedRevision:preapproved.revision,batch}),post({action:'approve-verified-batch',expectedRevision:preapproved.revision,batch})]);assert.deepEqual(requests.map(r=>r.status).sort(),[200,409]);
  const after=await readIntelligence();assertState(after);assert.equal(after.decisions.length,3);assert.deepEqual(after.decisions[0],preapproved.decisions[0]);assert.deepEqual(after.audit.slice(0,preapproved.audit.length),preapproved.audit);assert.deepEqual(after.candidates,preapproved.candidates);assert.deepEqual(after.documents,preapproved.documents);
  const cache=path.join(dir,'verification-proof-'+doc.pdf!.fileHash+'.json');const proofBefore=await fs.readFile(cache);await fs.writeFile(cache,'corrupt');assert.equal((await readProofs(state)).proofs.size,0);assert.ok((await readProofs(state)).warnings.length);await fs.writeFile(cache,proofBefore);
  const cachedAction=await post({action:'verify-source',documentId:id,expectedRevision:after.revision});assert.equal(cachedAction.status,200);assert.equal((await cachedAction.json()).proof.cached,true);assert.deepEqual(await readIntelligence(),after);
  const traversal=await post({action:'verify-source',documentId:'../outside',expectedRevision:after.revision});assert.equal(traversal.status,400);assert.deepEqual(await readIntelligence(),after);
  console.log('PASS: real GET/POST + locked temporary storage, proof/hash mismatch rejection, safe cache reuse/corruption, original ID resolution, all-or-nothing batch, concurrent 200/409, immutable existing approval/audit/94-style identities, and valuation gates. Synthetic documents only.');
 }finally{if(saved===undefined)delete process.env.PHOENIX_INTELLIGENCE_DATA_DIR;else process.env.PHOENIX_INTELLIGENCE_DATA_DIR=saved;await fs.rm(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1});
