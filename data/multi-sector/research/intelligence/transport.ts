/** Server-only transport. No redirects; pinned public IPv4 + normal TLS verification.
 * Optional proxy-doh mode uses an explicitly trusted HTTPS_PROXY and numeric CONNECT.
 * It never asks the proxy to resolve the issuer hostname. */
import https from 'node:https';
import http from 'node:http';
import tls from 'node:tls';
import {resolve4} from 'node:dns/promises';
import {SOURCE_CHANNELS,validateReference} from './sources';
export interface Resource {status:number;text:string;bytes?:Buffer;contentType?:string}
export type Transport=(url:string)=>Promise<Resource>;
export class FetchError extends Error {constructor(public code:string){super(code);}}
export function publicIPv4(ip:string){
 if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)||ip.split('.').some(part=>String(Number(part))!==part))return false;
 const [a,b,c,...rest]=ip.split('.').map(Number);if([a,b,c,...rest].some(n=>n>255))return false;
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
export function allowedResource(raw:string,documents=false){
 const u=new URL(raw),channel=SOURCE_CHANNELS.find(c=>new URL(c.url).hostname===u.hostname);
 if(!channel)throw new FetchError('DESTINATION');
 validateReference(raw,channel.companyId);
 const fixed=SOURCE_CHANNELS.some(c=>c.url===u.href)||u.pathname==='/robots.txt'&&!u.search;
 // Decode before checking. Only issuer document areas, never arbitrary endpoints.
 let path:string;try{path=decodeURIComponent(u.pathname);}catch{throw new FetchError('PATH');}
 if(path.includes('..')||/[\\\u0000-\u001f]/.test(path))throw new FetchError('PATH');
 const doc=channel.companyId==='advantage-energy'
  ? /^\/wp-content\/uploads\/[a-zA-Z0-9_./ -]+\.pdf$/i.test(path)&&!u.search||/^\/investors\/newsreleases\/article$/.test(path)&&/^\?id=\d{1,10}$/.test(u.search)
  : /^\/_resources\/(financials|news|tech-reports|technical-reports)\/[a-zA-Z0-9_./ -]+\.pdf$/i.test(path)&&!u.search||/^\/news-releases\/[a-z0-9-]+\/?$/i.test(path)&&!u.search;
 if(!fixed&&!(documents&&doc))throw new FetchError('DESTINATION');
 return u;
}
async function addresses(host:string):Promise<string[]>{
 if(process.env.PHOENIX_MONITOR_NETWORK!=='proxy-doh')return resolve4(host);
 const response=await fetch('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(host)+'&type=A',{headers:{Accept:'application/dns-json'},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok||!response.body)throw new FetchError('DNS');
 const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>32768)throw new FetchError('DNS_SIZE');chunks.push(r.value);}}finally{await reader.cancel();}
 const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(data.Status!==0)throw new FetchError('DNS');
 return (data.Answer??[]).filter((x:{type:number;data:string})=>x.type===1).map((x:{data:string})=>x.data);
}
export async function pinnedGet(raw:string,documents=false):Promise<Resource>{
 const u=allowedResource(raw,documents);
 let timer:ReturnType<typeof setTimeout>|undefined;
 const ips=await Promise.race([addresses(u.hostname),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new FetchError('DNS_TIMEOUT')),8500);})]).finally(()=>clearTimeout(timer));
 if(!ips.length||ips.some(ip=>!publicIPv4(ip)))throw new FetchError('PRIVATE_IP');
 return new Promise((resolve,reject)=>{
  let agent:https.Agent|undefined, tunnel:http.ClientRequest|undefined, socket:import('node:net').Socket|undefined,request:http.ClientRequest|undefined;
  let settled=false;
  const finish=(error?:Error,result?:Resource)=>{if(settled)return;settled=true;clearTimeout(deadline);request?.destroy();tunnel?.destroy();socket?.destroy();agent?.destroy();if(error)reject(error);else resolve(result!);};
  const deadline=setTimeout(()=>finish(new FetchError('TIMEOUT')),12000);
  const start=()=>{
   request=https.get({hostname:u.hostname,path:u.pathname+u.search,port:443,servername:u.hostname,agent,
    lookup:((_host:unknown,opts:{all?:boolean},callback:(error:null,result:unknown,family?:number)=>void)=>opts.all?callback(null,[{address:ips[0],family:4}]):callback(null,ips[0],4)) as never,
    headers:{'User-Agent':'PhoenixFinancialResearch/1.14 (low-frequency official research)','Accept':'text/html,text/plain,application/pdf','Accept-Encoding':'identity'},
   },res=>{
    const status=res.statusCode??0;if(status!==200){res.destroy();finish(new FetchError('HTTP_'+status));return;}
    const contentType=res.headers['content-type']??'';
    if(!/^(text\/(html|plain)|application\/pdf)\b/i.test(contentType)||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();finish(new FetchError('CONTENT_TYPE'));return;}
    const max=/application\/pdf/i.test(contentType)&&documents?4*1024*1024:512*1024;
    const chunks:Buffer[]=[];let bytes=0;
    res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>max){res.destroy();finish(new FetchError('SIZE_LIMIT'));}else chunks.push(chunk);});
    res.on('end',()=>{const body=Buffer.concat(chunks);finish(undefined,{status,contentType,bytes:body,text:/^text\//i.test(contentType)?body.toString('utf8'):''});});
    res.on('error',()=>finish(new FetchError('STREAM')));res.on('aborted',()=>finish(new FetchError('STREAM')));
   });
   request.setTimeout(8000,()=>finish(new FetchError('TIMEOUT')));request.on('error',()=>finish(new FetchError('NETWORK')));
  };
  if(process.env.PHOENIX_MONITOR_NETWORK!=='proxy-doh'){start();return;}
  try{
   const proxy=new URL(process.env.HTTPS_PROXY??'');if(proxy.protocol!=='http:')throw new FetchError('PROXY_CONFIG');
   // Proxy is trusted deployment configuration, never supplied through the API.
   const headers:Record<string,string>={Host:ips[0]+':443'};
   if(proxy.username||proxy.password)headers['Proxy-Authorization']='Basic '+Buffer.from(decodeURIComponent(proxy.username)+':'+decodeURIComponent(proxy.password)).toString('base64');
   tunnel=http.request({hostname:proxy.hostname,port:proxy.port||80,method:'CONNECT',path:ips[0]+':443',headers});
   tunnel.on('connect',(res,s,head)=>{socket=s;if(settled){s.destroy();return;}if(res.statusCode!==200){finish(new FetchError('PROXY_CONNECT'));return;}if(head.length)s.unshift(head);
    agent=new https.Agent();(agent as https.Agent&{createConnection:()=>tls.TLSSocket}).createConnection=()=>tls.connect({socket:s,servername:u.hostname,rejectUnauthorized:true});start();
   });
   tunnel.on('error',()=>finish(new FetchError('PROXY_NETWORK')));tunnel.end();
  }catch{finish(new FetchError('PROXY_CONFIG'));}
 });
}
