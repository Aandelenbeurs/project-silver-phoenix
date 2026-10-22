/** Read-only regression against the user's original official PDF; never writes Intelligence storage. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readPdf,PDF_PARSER} from '../data/multi-sector/research/intelligence/pdf-parser';
import {rowText} from '../data/multi-sector/research/intelligence/pdf-tables';
import {analyseDocument} from '../data/multi-sector/research/intelligence/pdf-analysis';
import {emptyIntelligenceState,registerDiscovered} from '../data/multi-sector/research/intelligence/workflow';
import {makeProof,verifyAll} from '../data/multi-sector/research/intelligence/verification';
async function main(){
 const file=process.argv[4]||process.env.PHOENIX_Q2_PDF;if(!file)throw Error('Geef na --child scripts/validate-verification-q2.ts het originele Q2-2026-PDF-pad op.');
 const bytes=fs.readFileSync(file),hash=createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash,'7dbe65b6e61e51118ad9393c31a56a846a4bb172b7bd6049b3f1f09cc62b02a7','This regression is bound to the original 71-page issuer PDF.');
 const layout=await readPdf(bytes);assert.equal(layout.pages.length,71);
 const highlights=layout.pages.find(p=>p.number===6)!;
 const expected:[string,number[]][]=[['Natural gas and liquids sales',[195964,164593,402886,386383]],['Net income and comprehensive income',[45114,72502,74642,43478]],['Basic weighted average shares (000)',[167614,167179,167296,167001]],['Cash provided by operating activities',[104632,80084,221710,203033]]];
 for(const [label,values] of expected){const row=highlights.rows.find(r=>rowText(r).replace(/\s+/g,' ').startsWith(label+' '));assert.ok(row,label);const cells=row!.cells.filter(c=>c.x>250).map(c=>Number(c.text.replace(/,/g,''))).filter(Number.isFinite);assert.deepEqual(cells,values,label);}
 const at='2026-10-22T10:00:00Z';let state=registerDiscovered(emptyIntelligenceState(),{companyId:'advantage-energy',title:'Q2 2026 read-only validation',type:'quarterly',event:'financial-report',issuer:'Advantage Energy Ltd.',url:'https://www.advantageog.com/wp-content/uploads/Q2-2026-Report.pdf',sourceClass:'primary',publishedAt:'2026-07-30',period:{start:'',end:''},currency:null,text:'',locator:'Original issuer PDF',supersedes:null,method:'automatic-discovery',monitoring:{channelId:'aav-financials',bodyHash:hash,hashBasis:'pdf-bytes',processing:'manual-required',warnings:[],previousVersion:null}},at).state;
 state=await analyseDocument(state,state.documents[0].id,at,async url=>url.endsWith('robots.txt')?{status:200,text:'User-agent: *\nDisallow:'}:{status:200,text:'',bytes,contentType:'application/pdf'});
 assert.equal(state.candidates.length,54);assert.equal(state.decisions.length,0);
 for(const [metric,value] of [['adjustedFundsFlow',88797000],['netCapex',88063000],['netDebt',560248000],['gasProduction',347770],['liquidsProduction',12650]] as const)assert.ok(state.candidates.some(c=>c.metric===metric&&c.datum.value===value&&c.datum.period.end==='2026-06-30'),metric);
 assert.ok(highlights.rows.some(r=>/Adjusted funds flow \(5,837\)/.test(rowText(r))));assert.ok(highlights.rows.some(r=>/Net debt 368,664/.test(rowText(r))));
 const reports=verifyAll(state,new Map([[hash,makeProof(hash,PDF_PARSER,layout)]]));const counts=Object.fromEntries(['green','orange','red','unverifiable'].map(k=>[k,reports.filter(r=>r.classification===k).length]));
 assert.equal(counts.red,0);assert.equal(counts.unverifiable,0);assert.equal(reports.length,54);assert.ok(reports.every(r=>r.modelEligible===false&&r.valuationReleased===false));
 console.log(JSON.stringify({pdfHash:hash,pages:layout.pages.length,highlightRowsChecked:4,extractedCandidates:54,counts,decisions:0,readOnly:true,network:'PDF supplied locally; transport simulated, real PDF parser'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
