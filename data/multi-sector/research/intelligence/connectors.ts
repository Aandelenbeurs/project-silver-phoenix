import {resolve4} from 'node:dns/promises';
import https from 'node:https';
import {randomUUID} from 'node:crypto';
import {SOURCE_CHANNELS,validateReference} from './sources';
import type {SourceCheck} from './contracts';
/** No user URL reaches this transport. DNS is pinned to a validated public IPv4.
 * Redirects, authentication, arbitrary ports and private ranges are refused.
 */
export function publicIPv4(ip:string){
 if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip))return false;
 const [a,b,c,...rest]=ip.split('.').map(Number);if([a,b,c,...rest].some(n=>n>255))return false;
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
export async function fixedPublicGet(url:string):Promise<{status:number;text:string}>{
 const u=new URL(url);
 if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||!SOURCE_CHANNELS.some(c=>new URL(c.url).hostname===u.hostname&&(u.href===c.url||u.pathname==='/robots.txt'&&!u.search)))throw Error('Niet-toegestane bestemming.');
 let timer:ReturnType<typeof setTimeout>|undefined;
 const ips=await Promise.race([resolve4(u.hostname),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS timeout')),3000);})]).finally(()=>clearTimeout(timer));
 if(!ips.length||ips.some(ip=>!publicIPv4(ip)))throw Error('Onveilige netwerkbestemming.');
 return new Promise((resolve,reject)=>{
  const req=https.get({hostname:u.hostname,path:u.pathname+u.search,port:443,servername:u.hostname,
   lookup:((_host:unknown,opts:{all?:boolean},callback:(error:null,result:unknown,family?:number)=>void)=>opts.all?callback(null,[{address:ips[0],family:4}]):callback(null,ips[0],4)) as never,
   headers:{'User-Agent':'PhoenixFinancialResearch/1.13 (manual, low-frequency index check)','Accept':'text/html,text/plain'},
  },res=>{
   const status=res.statusCode??0;if(status!==200){res.resume();reject(Error('HTTP '+status));return;}
   const type=res.headers['content-type']??'';if(!/^text\/(html|plain)/i.test(type)){res.destroy();reject(Error('Unsupported document'));return;}
   const chunks:Buffer[]=[];let bytes=0;
   res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>512*1024){res.destroy();reject(Error('Index too large'));}else chunks.push(chunk);});
   res.on('end',()=>resolve({status,text:Buffer.concat(chunks).toString('utf8')}));res.on('error',reject);
  });
  req.setTimeout(8000,()=>req.destroy(Error('Timeout')));req.on('error',reject);
  // Absolute deadline also covers slow streams that keep the socket active.
  const stop=setTimeout(()=>req.destroy(Error('Deadline')),12000);req.on('close',()=>clearTimeout(stop));
 });
}
export function robotsAllows(text:string,path:string){
 if(text.length>100000)return false;
 // Conservative: obey all disallows regardless of user agent; no relaxation on parser ambiguity.
 for(const line of text.split(/\r?\n/)){const m=/^\s*disallow\s*:\s*([^#]*)/i.exec(line);if(!m)continue;const rule=m[1].trim();
  if(rule&&(rule.includes('*')||rule.includes('$')||path.startsWith(rule)))return false;
 }
 return true;
}
export function discoverLinks(html:string,channelId:string){
 const channel=SOURCE_CHANNELS.find(c=>c.id===channelId);if(!channel)throw Error('Onbekend kanaal.');
 const results:{url:string;title:string}[]=[];const re=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m:RegExpExecArray|null;
 while((m=re.exec(html))&&results.length<100){
  const title=m[2].replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,200);
  if(!/report|financial|MD&A|quarter|annual|study|reserve|guidance|disposition|acquisition|offering|financ|shares|placement|feasibility/i.test(title))continue;
  try{const u=new URL(m[1].replace(/&amp;/g,'&'),channel.url);u.hash='';if(/\.pdf$/i.test(u.pathname))u.search='';const ref=validateReference(u.href,channel.companyId);if(ref.sourceClass==='primary'&&!results.some(x=>x.url===ref.url))results.push({url:ref.url,title});}catch{/* Untrusted link is ignored, never fetched. */}
 }
 return results;
}
export async function checkSource(channelId:string,previous:readonly SourceCheck[],at:string,transport=fixedPublicGet):Promise<SourceCheck>{
 const channel=SOURCE_CHANNELS.find(c=>c.id===channelId);if(!channel)throw Error('Onbekend kanaal.');
 const base={id:randomUUID(),channelId,at,lastSuccessAt:previous.filter(x=>x.channelId===channelId&&x.status==='success').at(-1)?.at??null,coverage:'index-only' as const};
 try{
  const robots=await transport(new URL('/robots.txt',channel.url).href);
  if(robots.status!==200||!robotsAllows(robots.text,new URL(channel.url).pathname))throw Error('Robots access unavailable');
  const result=await transport(channel.url);if(result.status!==200)throw Error('Index unavailable');
  return {...base,lastSuccessAt:at,status:'success',found:discoverLinks(result.text,channelId),message:'Index opgehaald; links zijn signalen. Publicatie, periode en inhoud moeten nog worden geïmporteerd en beoordeeld. Geen volledige actualiteitscontrole.'};
 }catch{return {...base,status:'unavailable',found:[],message:'Automatische controle niet gelukt of niet toegestaan. Gebruik de officiële bronpagina en handmatige fragmentimport. Geen beperking omzeild.'};}
}
