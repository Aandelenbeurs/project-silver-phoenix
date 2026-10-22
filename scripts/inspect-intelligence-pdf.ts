import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fixturePdf} from './pdf-test-fixture';
import {readPdf} from '../data/multi-sector/research/intelligence/pdf-parser';
import {extractPdfTables,financialNumber} from '../data/multi-sector/research/intelligence/pdf-tables';
import {analyseDocument} from '../data/multi-sector/research/intelligence/pdf-analysis';
import {emptyIntelligenceState,registerDiscovered,assertState,candidateProblems,decideCandidate,approvedResearchInputs,candidateComparison,registerPdfAnalysis} from '../data/multi-sector/research/intelligence/workflow';
import {FetchError,type Transport} from '../data/multi-sector/research/intelligence/transport';
import {getAavValidationReview} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-validation-review';
const at='2026-10-22T10:00:00Z';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function source(bytes:Buffer,previous:string|null=null){return {companyId:'advantage-energy' as const,title:'Synthetic table fixture',type:'quarterly' as const,event:'financial-report' as const,issuer:'Advantage Energy Ltd.',url:'https://www.advantageog.com/wp-content/uploads/Q2-2026-Report.pdf',sourceClass:'primary' as const,publishedAt:null,period:{start:'',end:''},currency:null,text:'',locator:'Synthetic fixture, not issuer data',supersedes:null,method:'automatic-discovery' as const,monitoring:{channelId:'aav-financials',bodyHash:hash(bytes),hashBasis:'pdf-bytes' as const,processing:'manual-required' as const,warnings:[],previousVersion:previous}};}
const fake=(bytes:Buffer):Transport=>async u=>u.endsWith('robots.txt')?{status:200,text:'User-agent: *\nDisallow:'}:{status:200,text:'',bytes,contentType:'application/pdf'};
async function main(){
 const bytes=fixturePdf();const parsed=await readPdf(bytes);assert.equal(parsed.pages.length,1);assert.equal(parsed.pages[0].number,1);
 const tables=extractPdfTables(parsed);assert.equal(tables.values.length,10);const rev=tables.values.filter(v=>v.metric==='revenue');assert.deepEqual(rev.map(v=>v.value),[111222000,222333000,333444000,444555000]);assert.deepEqual(rev.map(v=>v.period.start),['2026-04-01','2025-04-01','2026-01-01','2025-01-01']);assert.ok(rev.every(v=>v.unit==='CAD'&&v.page===1));
 assert.equal(financialNumber('(1,234.5)'),-1234.5);assert.equal(financialNumber('-5.25'),-5.25);assert.equal(financialNumber('1,23'),null);assert.equal(financialNumber('1.234,56'),null);assert.equal(financialNumber('-'),null);
 const negative=structuredClone(parsed);const nr=negative.pages[0].rows.find(r=>r.cells.some(c=>c.text==='12,345'))!;nr.cells.find(c=>c.text==='12,345')!.text='(12,345)';assert.ok(extractPdfTables(negative).values.some(v=>v.value===-12345000));
 const ambiguous=structuredClone(parsed);ambiguous.pages[0].rows.find(r=>r.cells.some(c=>c.text==='June 30'))!.cells[0].text='UNKNOWN';assert.equal(extractPdfTables(ambiguous).values.length,0);
 const usd=structuredClone(parsed);usd.pages[0].rows.find(r=>r.cells.some(c=>c.text.includes('$000')))!.cells[0].text='($000, US$)';assert.equal(extractPdfTables(usd).values.length,0);
 const missing=structuredClone(parsed);missing.pages[0].rows.find(r=>r.cells.some(c=>c.text==='111,222'))!.cells.pop();assert.equal(extractPdfTables(missing).values.filter(v=>v.metric==='revenue').length,0);
 const convertible=structuredClone(parsed);convertible.pages[0].rows.find(r=>r.cells.some(c=>c.text==='Natural gas and liquids sales'))!.cells[0].text='Convertible debentures';assert.equal(extractPdfTables(convertible).values.filter(v=>v.metric==='convertiblePrincipal').length,0);
 const footnote=structuredClone(parsed);footnote.pages[0].rows.find(r=>r.cells.some(c=>c.text==='2026'))!.cells.push({x:295,text:'Notes'});const fc=footnote.pages[0].rows.find(r=>r.cells.some(c=>c.text==='111,222'))!.cells.find(c=>c.text==='111,222')!;fc.x=295;fc.text='11';assert.equal(extractPdfTables(footnote).values.filter(v=>v.metric==='revenue').length,0);
 const defs=structuredClone(parsed);defs.pages[0].rows.find(r=>r.cells.some(c=>c.text==='Natural gas and liquids sales'))!.cells[0].text='Unknown financial definition';assert.equal(extractPdfTables(defs).values.filter(v=>v.metric==='revenue').length,0);
 for(const b of [Buffer.from('not PDF'),bytes.subarray(0,bytes.length-20),Buffer.concat([bytes,Buffer.alloc(4*1024*1024)])])await assert.rejects(readPdf(b));
 await assert.rejects(readPdf(Buffer.from('%PDF-1.4\ncorrupt\n%%EOF')),/PDF_UNREADABLE/);await assert.rejects(readPdf(bytes,1),/PDF_TIMEOUT/);
 let s=registerDiscovered(emptyIntelligenceState(),source(bytes),at).state;const base=s.documents[0];let calls=0;
 s=await analyseDocument(s,base.id,at,async u=>{calls++;return fake(bytes)(u);});assertState(s);assert.equal(calls,2);assert.equal(s.candidates.length,10);assert.equal(s.documents.at(-1)?.pdf?.fileHash,hash(bytes));assert.equal(s.decisions.length,0);
 const waiting=registerDiscovered(emptyIntelligenceState(),source(bytes),at).state;let release:()=>void=()=>{};const gate=new Promise<void>(r=>{release=r;});const pending=analyseDocument(waiting,waiting.documents[0].id,at,async u=>{await gate;return fake(bytes)(u);});await assert.rejects(analyseDocument(waiting,waiting.documents[0].id,at,fake(bytes)),/al bezig/);release();await pending;
 const same=await analyseDocument(s,base.id,at,async()=>{throw Error('must not fetch');});assert.deepEqual(same,s);
 const c=s.candidates[0],doc=s.documents.at(-1)!;assert.deepEqual(candidateProblems(s,c,'2026-10-22'),[]);const d={candidateId:c.id,fingerprint:c.fingerprint,documentHash:doc.contentHash,action:'approve' as const,reason:'Synthetic source, period, scale and definition reviewed.',attested:true};assert.throws(()=>decideCandidate(s,{...d,attested:false},at));
 const approved=decideCandidate(s,d,at);assertState(approved);assert.equal(approvedResearchInputs(approved,'2026-10-22')[0].valuationReleased,false);assert.throws(()=>decideCandidate(approved,d,at));
 const rejected=decideCandidate(s,{...d,action:'reject'},at);assert.throws(()=>decideCandidate(rejected,d,at));
 const altered=fixturePdf(true);const updated=registerDiscovered(approved,source(altered,base.id),at).state;const newSource=updated.documents.at(-1)!;
 const changed=await analyseDocument(updated,newSource.id,at,fake(altered));assertState(changed);assert.equal(changed.decisions.length,1);assert.equal(changed.documents.at(-1)?.supersedes,doc.id);assert.ok(candidateProblems(changed,c,'2026-10-22').some(p=>p.includes('Nieuwere')));assert.equal(changed.documents.at(-1)?.publishedAt,null);
 assert.equal(candidateComparison(s,s.candidates.find(x=>x.metric==='cash')!).difference,null);
 for(const error of ['STREAM','TIMEOUT','HTTP_302']){const failure=await analyseDocument(registerDiscovered(emptyIntelligenceState(),source(bytes),at).state,base.id,at,async()=>{throw new FetchError(error);});assert.equal(failure.candidates.length,0);assert.equal(failure.documents.at(-1)?.pdf?.errorCode,error);assertState(failure);}
 for(const response of [{status:200,text:'',bytes,contentType:'text/html'},{status:200,text:'',bytes:Buffer.alloc(4*1024*1024+1),contentType:'application/pdf'},{status:302,text:''}]){const failure=await analyseDocument(registerDiscovered(emptyIntelligenceState(),source(bytes),at).state,base.id,at,async u=>u.endsWith('robots.txt')?{status:200,text:'User-agent: *\nDisallow:'}:response);assert.equal(failure.candidates.length,0);assert.ok(failure.documents.at(-1)?.pdf?.errorCode);}
 const scanned=fixturePdf(false,true);const scanState=registerDiscovered(emptyIntelligenceState(),source(scanned),at).state;const scan=await analyseDocument(scanState,scanState.documents[0].id,at,fake(scanned));assert.equal(scan.documents.at(-1)?.pdf?.errorCode,'PDF_NO_TEXT');
 const evil=structuredClone(s);evil.documents[0].url='https://127.0.0.1/file.pdf';await assert.rejects(analyseDocument(evil,base.id,at,fake(bytes)));
 assert.throws(()=>registerPdfAnalysis(s,base.id,{fileHash:hash(bytes),parser:'different',pages:1,values:Array(101).fill(tables.values[0]),warnings:[],reportDate:null,errorCode:null,publishedAt:null},at));
 const corrupt=structuredClone(s);corrupt.candidates[0].pdf!.page=999;assert.throws(()=>assertState(corrupt));
 assert.equal(getAavValidationReview().passed,6);
 console.log('PASS: actual PDF.js child parsing, pages, columns, quarter/YTD, signs/scales/CAD, ambiguous metadata rejection, MIME/size/EOF/timeout, no OCR, versions, dedup, human decisions, immutable approvals, limits and AAV 6/17. Synthetic PDF and simulated network.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
