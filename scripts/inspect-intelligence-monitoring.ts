import assert from 'node:assert/strict';
import {monitorSource,documentText} from '../data/multi-sector/research/intelligence/monitoring';
import {emptyIntelligenceState,assertState,analysisImpact,candidateProblems} from '../data/multi-sector/research/intelligence/workflow';
import {robotsAllows} from '../data/multi-sector/research/intelligence/connectors';
import {allowedResource,FetchError,type Transport} from '../data/multi-sector/research/intelligence/transport';
const at='2026-10-21T12:00:00Z',later='2026-10-21T12:02:00Z';
const url='https://www.advantageog.com/wp-content/uploads/Q3-report.pdf';
const index=`<a href="${url}">Third quarter report</a>`;
const fake=(html=index,body='v1'):Transport=>async u=>({status:200,text:u.endsWith('/robots.txt')?'User-agent: *\nDisallow:':u===url?'':html,...(u===url?{contentType:'application/pdf',bytes:Buffer.from('%PDF-'+body)}:{})});
async function main(){
 for(const u of ['http://www.advantageog.com/robots.txt','https://127.0.0.1/robots.txt','https://www.advantageog.com/anywhere','https://www.advantageog.com/wp-content/uploads/%2e%2e/secret.pdf','https://www.abrasilver.com/_resources/financials/a.pdf?x=1','https://www.advantageog.com/wp-content/uploads/a.pdf?x=1'])assert.throws(()=>allowedResource(u,true),u);
 assert.equal(allowedResource(url,true).hostname,'www.advantageog.com');
 assert.equal(robotsAllows('User-agent: OtherBot\nDisallow: /\nUser-agent: *\nDisallow: /private\nAllow: /private/public','/private/public'),true);
 assert.equal(robotsAllows('User-agent: *\nDisallow: /*.pdf$','/test.pdf'),false);
 assert.equal(robotsAllows('User-agent: PhoenixFinancialResearch\nDisallow: /\nUser-agent: *\nAllow: /','/test'),false);
 const a=await monitorSource(emptyIntelligenceState(),'aav-financials',at,fake());assertState(a);assert.equal(a.documents.length,1);assert.equal(a.checks[0].monitoring?.counts.new,1);assert.equal(a.candidates.length,0);assert.equal(a.decisions.length,0);
 await assert.rejects(monitorSource(a,'aav-financials',at,fake()),/één minuut/);
 const tampered=structuredClone(a);tampered.checks[0].message='changed';assert.throws(()=>assertState(tampered),/auditbinding/);
 const b=await monitorSource(a,'aav-financials',later,fake());assert.equal(b.documents.length,1);assert.equal(b.checks.at(-1)?.monitoring?.counts.known,1);
 const c=await monitorSource(b,'aav-financials','2026-10-21T12:04:00Z',fake(index,'v2'));assertState(c);assert.equal(c.documents.length,2);assert.equal(c.documents[1].monitoring?.previousVersion,a.documents[0].id);assert.equal(c.documents[0].monitoring?.bodyHash,a.documents[0].monitoring?.bodyHash);assert.equal(c.checks.at(-1)?.monitoring?.counts.changed,1);assert.equal(c.decisions.length,0);
 const alias='https://www.advantageog.com/wp-content/uploads/alias.pdf';
 const dedup:Transport=async u=>u===alias?{status:200,text:'',contentType:'application/pdf',bytes:Buffer.from('%PDF-v1')}:fake(`<a href="${alias}">Quarter report</a>`)(u);
 const d=await monitorSource(a,'aav-financials',later,dedup);assert.equal(d.documents.length,1);assert.equal(d.checks.at(-1)?.monitoring?.counts.duplicates,1);
 for(const code of ['TIMEOUT','HTTP_302','HTTP_500','SIZE_LIMIT','PRIVATE_IP']){
  const failed=await monitorSource(a,'aav-financials',later,async()=>{throw new FetchError(code);});assertState(failed);assert.equal(failed.checks.at(-1)?.status,'unavailable');assert.equal(failed.checks.at(-1)?.lastSuccessAt,at);assert.equal(failed.documents.length,1);assert.ok(failed.checks.at(-1)?.message.includes(code));
 }
 const r=await monitorSource(emptyIntelligenceState(),'aav-financials',at,async()=>({status:302,text:''}));assert.equal(r.documents.length,0);assert.equal(r.checks[0].status,'unavailable');
 let release:()=>void=()=>{};const gate=new Promise<void>(r=>{release=r;});
 const pending=monitorSource(emptyIntelligenceState(),'aav-financials',at,async u=>{await gate;return fake()(u);});
 await assert.rejects(monitorSource(emptyIntelligenceState(),'aav-financials',at,fake()),/al bezig/);release();await pending;
 const broken=await monitorSource(emptyIntelligenceState(),'aav-financials',at,async u=>u===url?{status:200,text:'',contentType:'application/pdf',bytes:Buffer.from('bad')}:fake()(u));assert.equal(broken.documents[0].monitoring?.processing,'unreachable');assert.equal(broken.checks[0].monitoring?.counts.unavailable,1);
 const html='<main><script>evil()</script>Net debt was $560.2 million.</main>';
 const h=await monitorSource(emptyIntelligenceState(),'aav-financials',at,async u=>u===url?{status:200,text:html,contentType:'text/html'}:fake()(u));assertState(h);assert.ok(!h.documents[0].text.includes('evil'));assert.equal(h.documents[0].publishedAt,null);assert.equal(h.decisions.length,0);for(const candidate of h.candidates)assert.ok(candidateProblems(h,candidate,'2026-10-21').length>0);
 assert.equal(documentText('<body>No main</body>'),null);assert.equal(analysisImpact(h,'advantage-energy','2026-10-21').status,'revision-needed');
 const invalid=await monitorSource(emptyIntelligenceState(),'aav-financials',at,fake('<a href="https://127.0.0.1/x">Annual report</a>'));assert.equal(invalid.documents.length,0);
 console.log('PASS: monitoring new/known/version/alias dedup, unknown metadata, no approval, robots groups, failures, concurrency, integrity and impact (simulated transport).');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
