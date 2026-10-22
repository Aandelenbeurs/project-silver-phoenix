/** Optional one-shot runner. No server/scheduler installed; never approves data. */
import {loadEnvConfig} from '@next/env';
import {readIntelligence,mutateIntelligence} from '../data/multi-sector/research/intelligence/storage';
import {monitorSource} from '../data/multi-sector/research/intelligence/monitoring';
import {SOURCE_CHANNELS} from '../data/multi-sector/research/intelligence/sources';
async function main(){
 // Match Next.js storage configuration; never silently create a different registry.
 loadEnvConfig(process.cwd());
 const filter=process.argv[process.argv[2]==='--child'?4:2];if(filter&&!SOURCE_CHANNELS.some(c=>c.id===filter))throw Error('Onbekend vast bronkanaal.');let failed=false;
 for(const channel of SOURCE_CHANNELS.filter(c=>!filter||c.id===filter)){
  const current=await readIntelligence();const previous=current.checks.filter(c=>c.channelId===channel.id).at(-1);
  if(previous&&Date.now()-Date.parse(previous.at)<3600000){console.log(JSON.stringify({channel:channel.id,status:'SKIP',reason:'Minder dan één uur geleden gecontroleerd.'}));continue;}
  const at=new Date().toISOString();const next=await mutateIntelligence(current.revision,s=>monitorSource(s,channel.id,at));const check=next.checks.at(-1)!;
  console.log(JSON.stringify({channel:channel.id,at,status:check.status,message:check.message,result:check.monitoring}));if(check.status!=='success')failed=true;
 }if(failed)process.exitCode=1;
}
main().catch(()=>{console.error('Broncontrole veilig gestopt; controleer opslag, netwerk of gelijktijdige schrijfactie.');process.exitCode=1;});
