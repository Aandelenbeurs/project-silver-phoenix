/** Explicit live validation only: new external storage required; no approvals or engine writes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readIntelligence,mutateIntelligence} from '../data/multi-sector/research/intelligence/storage';
import {monitorSource} from '../data/multi-sector/research/intelligence/monitoring';
import {analyseDocument} from '../data/multi-sector/research/intelligence/pdf-analysis';
import {pinnedGet} from '../data/multi-sector/research/intelligence/transport';
import {assertState,candidateComparison} from '../data/multi-sector/research/intelligence/workflow';
async function main(){
 if(!process.env.PHOENIX_INTELLIGENCE_DATA_DIR)throw Error('Gebruik een nieuwe externe testmap via PHOENIX_INTELLIGENCE_DATA_DIR.');
 const initial=await readIntelligence();if(initial.documents.length||initial.checks.length)throw Error('Testmap moet leeg zijn; geen gebruikersopslag gebruiken.');
 const at=new Date().toISOString();const discovered=await mutateIntelligence(initial.revision,s=>monitorSource(s,'aav-financials',at));
 console.log('LIVE_DISCOVERY '+JSON.stringify(discovered.checks.at(-1)));assert.equal(discovered.checks.at(-1)?.status,'success');
 const source=discovered.documents.find(d=>d.url==='https://www.advantageog.com/wp-content/uploads/Q2-2026-Report.pdf');assert.ok(source,'Q2-rapport niet geregistreerd.');
 let downloadedHash:string|null=null,downloadedBytes=0;
 const capture=async(url:string)=>{const r=await pinnedGet(url,true);if(url===source.url&&r.bytes){downloadedHash=createHash('sha256').update(r.bytes).digest('hex');downloadedBytes=r.bytes.length;}return r;};
 const analysed=await mutateIntelligence(discovered.revision,s=>analyseDocument(s,source.id,new Date().toISOString(),capture));assertState(analysed);
 const doc=analysed.documents.filter(d=>d.pdf?.sourceDocumentId===source.id).at(-1);assert.ok(doc);assert.equal(doc.pdf?.status,'processed');assert.equal(doc.pdf.fileHash,downloadedHash);assert.equal(analysed.decisions.length,0);
 const values=analysed.candidates.filter(c=>c.documentId===doc.id);assert.ok(new Set(values.map(c=>c.metric)).size>=3);
 const repeated=await mutateIntelligence(analysed.revision,s=>analyseDocument(s,source.id,new Date().toISOString()));assert.deepEqual(repeated,analysed);
 console.log('LIVE_PDF '+JSON.stringify({at:new Date().toISOString(),source:source.url,httpStatus:200,downloadedBytes,document:doc,values:values.map(c=>({...c,comparison:candidateComparison(analysed,c)})),decisions:analysed.decisions.length,repeatedUnchanged:true}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Live PDF-validatie mislukt.');process.exitCode=1;});
