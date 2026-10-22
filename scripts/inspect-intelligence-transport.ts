import assert from 'node:assert/strict';
import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns/promises';
import {EventEmitter} from 'node:events';
import {pinnedGet} from '../data/multi-sector/research/intelligence/transport';
async function main(){
 const originalGet=https.get,originalResolve=dns.resolve4,mode=process.env.PHOENIX_MONITOR_NETWORK;
 delete process.env.PHOENIX_MONITOR_NETWORK;let address='8.8.8.8',calls=0,status=200,size=2;
 Object.defineProperty(dns,'resolve4',{configurable:true,writable:true,value:async()=>[address]});
 https.get=((options:https.RequestOptions,callback:(r:unknown)=>void)=>{
  calls++;assert.equal(options.hostname,'www.advantageog.com');assert.equal(options.servername,'www.advantageog.com');
  const lookup=options.lookup as unknown as (h:string,o:{all?:boolean},cb:(e:null,result:unknown,f?:number)=>void)=>void;
  lookup('malicious-rebinding-host',{},(_e,ip,f)=>{assert.equal(ip,'8.8.8.8');assert.equal(f,4);});
  lookup('malicious-rebinding-host',{all:true},(_e,ip)=>assert.deepEqual(ip,[{address:'8.8.8.8',family:4}]));
  const req=new EventEmitter() as EventEmitter&{destroy:()=>void;setTimeout:()=>void};req.destroy=()=>{req.emit('close');};req.setTimeout=()=>{};
  queueMicrotask(()=>{const res=new EventEmitter() as EventEmitter&{statusCode:number;headers:object;destroy:()=>void};res.statusCode=status;res.headers={'content-type':'text/plain'};res.destroy=()=>{};callback(res);if(status===200){res.emit('data',Buffer.alloc(size,'x'));res.emit('end');}});
  return req as unknown as http.ClientRequest;
 }) as typeof https.get;
 try{
  const r=await pinnedGet('https://www.advantageog.com/robots.txt');assert.equal(r.text,'xx');assert.equal(calls,1);
  address='127.0.0.1';await assert.rejects(pinnedGet('https://www.advantageog.com/robots.txt'),/PRIVATE_IP/);assert.equal(calls,1);address='8.8.8.8';
  status=302;await assert.rejects(pinnedGet('https://www.advantageog.com/robots.txt'),/HTTP_302/);assert.equal(calls,2);
  status=503;await assert.rejects(pinnedGet('https://www.advantageog.com/robots.txt'),/HTTP_503/);
  status=200;size=512*1024+1;await assert.rejects(pinnedGet('https://www.advantageog.com/robots.txt'),/SIZE_LIMIT/);
  await assert.rejects(pinnedGet('https://localhost/robots.txt'),/DESTINATION/);
  const realTimer=global.setTimeout;let destroyed=false;
  try{
   global.setTimeout=((handler:()=>void,delay:number)=>realTimer(handler,delay===12000?1:delay)) as typeof setTimeout;
   https.get=(()=>{const req=new EventEmitter() as EventEmitter&{destroy:()=>void;setTimeout:()=>void};req.destroy=()=>{destroyed=true;req.emit('close');};req.setTimeout=()=>{};return req;}) as unknown as typeof https.get;
   await assert.rejects(pinnedGet('https://www.advantageog.com/robots.txt'),/TIMEOUT/);assert.equal(destroyed,true);
  }finally{global.setTimeout=realTimer;}

 }finally{https.get=originalGet;Object.defineProperty(dns,'resolve4',{configurable:true,writable:true,value:originalResolve});if(mode===undefined)delete process.env.PHOENIX_MONITOR_NETWORK;else process.env.PHOENIX_MONITOR_NETWORK=mode;}
 console.log('PASS: actual transport dispatch uses pinned validated IP, both lookup modes, rejects private DNS, redirects, HTTP errors, oversize and unlisted URLs (simulated sockets).');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
