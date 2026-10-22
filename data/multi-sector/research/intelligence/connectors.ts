import {randomUUID} from 'node:crypto';
import {SOURCE_CHANNELS,validateReference} from './sources';
import type {SourceCheck} from './contracts';
import {pinnedGet} from './transport';
export {publicIPv4} from './transport';
export const fixedPublicGet=(url:string)=>pinnedGet(url);
/** RFC 9309 group selection: rules for other crawlers do not apply to Phoenix. */
export function robotsAllows(text:string,path:string){
 if(text.length>100000)return false;
 const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];
 let group:{agents:string[];rules:{allow:boolean;path:string}[]}={agents:[],rules:[]};
 for(const line of text.split(/\r?\n/)){
  const m=/^\s*(user-agent|allow|disallow)\s*:\s*([^#]*)/i.exec(line);if(!m)continue;
  const key=m[1].toLowerCase(),value=m[2].trim();
  if(key==='user-agent'){if(group.rules.length){groups.push(group);group={agents:[],rules:[]};}group.agents.push(value.toLowerCase());}
  else if(group.agents.length)group.rules.push({allow:key==='allow',path:value});
 }
 if(group.agents.length)groups.push(group);
 const score=(g:typeof group)=>Math.max(-1,...g.agents.map(a=>a==='*'?0:'phoenixfinancialresearch'.includes(a)&&a.length?a.length:-1));
 const best=Math.max(-1,...groups.map(score));if(best<0)return true;let match:{allow:boolean;length:number}|undefined;
 for(const g of groups.filter(g=>score(g)===best))for(const r of g.rules){
  if(!r.path)continue;
  const pattern=r.path.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\\\$$/,'$');
  if(new RegExp('^'+pattern).test(path)){const length=r.path.replace(/[\*$]/g,'').length;if(!match||length>match.length||length===match.length&&r.allow)match={allow:r.allow,length};}
 }
 return match?.allow??true;
}
export function discoverLinks(html:string,channelId:string){
 const channel=SOURCE_CHANNELS.find(c=>c.id===channelId);if(!channel)throw Error('Onbekend kanaal.');
 html=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const results:{url:string;title:string}[]=[];const re=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m:RegExpExecArray|null;
 while((m=re.exec(html))&&results.length<100){
  const title=m[2].replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,200);
  if(!/report|financial|MD&A|quarter|annual|study|reserve|guidance|disposition|acquisition|offering|financ|shares|placement|feasibility|Wembley|results|update|divest|sale|production|management|statements/i.test(title))continue;
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
