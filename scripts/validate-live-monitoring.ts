/** Explicit live validation, isolated external storage required. Not part of npm test. */
import {readIntelligence,mutateIntelligence} from '../data/multi-sector/research/intelligence/storage';
import {monitorSource} from '../data/multi-sector/research/intelligence/monitoring';
import {assertState} from '../data/multi-sector/research/intelligence/workflow';
import {SOURCE_CHANNELS} from '../data/multi-sector/research/intelligence/sources';
import assert from 'node:assert/strict';
async function main(){
 if(!process.env.PHOENIX_INTELLIGENCE_DATA_DIR)throw Error('Stel een nieuwe lege externe testmap in.');
 const channel=process.argv[process.argv[2]==='--child'?4:2]??'aav-financials';if(!SOURCE_CHANNELS.some(c=>c.id===channel))throw Error('Onbekend kanaal.');
 const current=await readIntelligence();if(current.documents.length||current.checks.length)throw Error('Gebruik een lege testmap, nooit gebruikersopslag.');
 const start=new Date().toISOString();const a=await mutateIntelligence(current.revision,s=>monitorSource(s,channel,start));assertState(a);
 console.log('LIVE_FIRST '+JSON.stringify(a.checks.at(-1)));assert.equal(a.checks.at(-1)?.status,'success');assert.ok(a.documents.length>0);assert.equal(a.decisions.length,0);
 // Real delay; no falsified timestamps. One-minute rate limit is intentionally respected.
 const wait=Math.max(0,61000-(Date.now()-Date.parse(start)));console.log('Wacht '+Math.ceil(wait/1000)+' seconden op het toegestane controle-interval.');
 await new Promise(r=>setTimeout(r,wait));
 const b=await mutateIntelligence(a.revision,s=>monitorSource(s,channel,new Date().toISOString()));assertState(b);
 console.log('LIVE_SECOND '+JSON.stringify(b.checks.at(-1)));assert.equal(b.checks.at(-1)?.status,'success');assert.equal(b.checks.at(-1)?.monitoring?.counts.new,0);assert.equal(b.decisions.length,0);
 console.log('LIVE_RESULT '+JSON.stringify({channel,documents:b.documents.length,candidates:b.candidates.length,decisions:b.decisions.length,revision:b.revision}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Validatie mislukt');process.exitCode=1;});
