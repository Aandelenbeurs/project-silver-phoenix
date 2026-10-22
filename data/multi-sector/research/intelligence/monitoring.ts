import {randomUUID,createHash} from 'node:crypto';
import {SOURCE_CHANNELS,COMPANIES} from './sources';
import {discoverLinks,robotsAllows} from './connectors';
import {pinnedGet,allowedResource,FetchError,type Transport} from './transport';
import {digest} from './extraction';
import {registerDiscovered,recordSourceCheck,IntelligenceError} from './workflow';
import type {IntelligenceState,MonitorResult,MonitorObservation,SourceDocument} from './contracts';
const active=new Set<string>();
export function documentText(html:string){
 // Stable visible article only; never execute scripts or use ticker/navigation as financial evidence.
 const main=/<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i.exec(html)?.[1];
 if(!main)return null;
 return main.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|nav|header|footer|form)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
}
export function classify(title:string):Pick<SourceDocument,'type'|'event'>{
 if(/amended|restated|correct/i.test(title))return {type:'material-event',event:'financial-report'};
 if(/Wembley|divest|disposition|sale/i.test(title))return {type:'material-event',event:'disposition'};
 if(/acquisition|acquire/i.test(title))return {type:'material-event',event:'acquisition'};
 if(/reserves|resource estimate/i.test(title))return {type:'reserves',event:'reserves'};
 if(/feasibility|study|technical report/i.test(title))return {type:'technical-study',event:'study'};
 if(/shares|placement|offering/i.test(title))return {type:'material-event',event:'issuance'};
 if(/financing|debenture|credit/i.test(title))return {type:'material-event',event:'financing'};
 if(/guidance/i.test(title))return {type:'press-release',event:'guidance'};
 return {type:/annual/i.test(title)?'annual':/MD&A|management/i.test(title)?'mda':/quarter|financial|statements/i.test(title)?'quarterly':'press-release',event:/report|quarter|financial|results|statements/i.test(title)?'financial-report':'other'};
}
export async function monitorSource(original:IntelligenceState,channelId:string,at:string,transport:Transport=url=>pinnedGet(url,true)){
 const channel=SOURCE_CHANNELS.find(c=>c.id===channelId);if(!channel)throw new IntelligenceError('Onbekend bronkanaal.');
 if(active.has(channelId))throw new IntelligenceError('Broncontrole is al bezig.',409);
 const prior=original.checks.filter(c=>c.channelId===channelId).at(-1);
 if(prior&&Date.parse(at)-Date.parse(prior.at)<60000)throw new IntelligenceError('Wacht één minuut tussen broncontroles.',429);
 active.add(channelId);
 let state=original;
 const monitoring:MonitorResult={httpStatus:null,indexHash:null,observations:[],counts:{found:0,new:0,known:0,changed:0,duplicates:0,unavailable:0},limited:false};
 const base={id:randomUUID(),channelId,at,lastSuccessAt:original.checks.filter(c=>c.channelId===channelId&&c.status==='success').at(-1)?.at??null,coverage:'index-only' as const};
 let found:{url:string;title:string}[]=[];
 try{
  const robots=await transport(new URL('/robots.txt',channel.url).href);
  if(robots.status!==200||!robotsAllows(robots.text,new URL(channel.url).pathname))throw new FetchError('ROBOTS');
  const page=await transport(channel.url);monitoring.httpStatus=page.status;
  if(page.status!==200)throw new FetchError('HTTP_'+page.status);
  if(Buffer.byteLength(page.text)>512*1024)throw new FetchError('SIZE_LIMIT');
  found=discoverLinks(page.text,channelId).filter(f=>{if(SOURCE_CHANNELS.some(c=>c.url===f.url))return false;try{allowedResource(f.url,true);return true;}catch{return false;}});
  monitoring.indexHash=digest(JSON.stringify(found));monitoring.counts.found=found.length;
  // Deliberately bounded window: first 12 financial links in official page order, first 2 bodies per check.
  // No claim of full historical coverage or freshness. Same window is rechecked for revisions.
  monitoring.limited=found.length>12;let fetched=0;
  for(const link of found.slice(0,12)){
   const previous=state.documents.filter(d=>d.companyId===channel.companyId&&d.url===link.url).at(-1);
   let text='',bodyHash:string|null=null,hashBasis:NonNullable<SourceDocument['monitoring']>['hashBasis']='index-metadata',processing:NonNullable<SourceDocument['monitoring']>['processing']='discovered';
   const warnings=['Titelclassificatie is een onderzoekssignaal. Publicatie en verslagperiode zijn niet vastgesteld.'];
   if(fetched<2&&robotsAllows(robots.text,new URL(link.url).pathname+new URL(link.url).search)){
    fetched++;
    try{
     const response=await transport(link.url);if(response.status!==200)throw new FetchError('HTTP_'+response.status);
     if(response.bytes&&/^application\/pdf\b/i.test(response.contentType??'')){
      if(response.bytes.length>4*1024*1024||response.bytes.subarray(0,5).toString()!=='%PDF-')throw new FetchError('PDF_FORMAT');
      bodyHash=createHash('sha256').update(response.bytes).digest('hex');hashBasis='pdf-bytes';processing='manual-required';warnings.push('Volledige PDF opgehaald en gehasht; PDF-extractie niet uitgevoerd. Importeer een letterlijk fragment met pagina en periode.');
     }else{
      if(Buffer.byteLength(response.text)>512*1024)throw new FetchError('SIZE_LIMIT');
      const article=documentText(response.text);
      if(article){bodyHash=digest(article);hashBasis='html-text';text=article.slice(0,30000);processing='processed';if(article.length>30000)warnings.push('Extractie beperkt tot eerste 30.000 tekens; hash omvat volledige genormaliseerde hoofdtekst.');}
      else {processing='manual-required';warnings.push('Geen betrouwbare hoofdtekst gevonden; open bron en importeer handmatig.');}
     }
    }catch(error){processing='unreachable';warnings.push('Document niet verwerkt: '+(error instanceof FetchError?error.code:'NETWORK')+'. Handmatige controle vereist.');monitoring.counts.unavailable++;}
   }else{monitoring.limited=true;warnings.push('Alleen indexmetadata; inhoud niet gecontroleerd wegens verzoekbudget of robotsregels.');}
   let registration:MonitorObservation['registration']='new',documentId:string|null=null;
   if(previous&&previous.title===link.title&&(!bodyHash||previous.monitoring?.bodyHash===bodyHash)){
    registration='known';documentId=previous.id;
   }else{
    const identical=bodyHash&&!previous?state.documents.find(d=>d.companyId===channel.companyId&&d.monitoring?.bodyHash===bodyHash):undefined;
    if(identical){registration='possible-duplicate';documentId=identical.id;}
    else {
     if(previous){registration='changed';warnings.push(/amended|restated|correct/i.test(link.title)?'Mogelijke gecorrigeerde rapportage; oude beoordeling blijft intact.':'Nieuwe inhoud of indexmetadata; geen bevestigde financiële correctie.');}
     const ref=registerDiscovered(state,{companyId:channel.companyId,title:link.title,...classify(link.title),issuer:COMPANIES[channel.companyId].issuer,url:link.url,sourceClass:'primary',publishedAt:null,period:{start:'',end:''},currency:null,text,locator:hashBasis==='html-text'?'Automatisch: genormaliseerde HTML-hoofdtekst':'Automatische bronindex; inhoud handmatig controleren',supersedes:null,method:'automatic-discovery',monitoring:{channelId,bodyHash,hashBasis,processing,warnings,previousVersion:previous?.id??null}},at);
     state=ref.state;documentId=ref.documentId;
    }
   }
   monitoring.counts[registration==='possible-duplicate'?'duplicates':registration==='changed'?'changed':registration==='known'?'known':'new']++;
   monitoring.observations.push({...link,documentId,registration,processing,message:warnings.join(' ')});
  }
  return recordSourceCheck(state,{...base,lastSuccessAt:at,status:'success',found,monitoring,message:`Bronindex HTTP 200; ${monitoring.counts.new} nieuw, ${monitoring.counts.known} bekend, ${monitoring.counts.changed} gewijzigd, ${monitoring.counts.duplicates} mogelijke duplicaten. Beperkt controlevenster; financiële actualiteit niet bevestigd.`});
 }catch(error){
  return recordSourceCheck(original,{...base,status:'unavailable',found:[],monitoring,message:'Broncontrole niet voltooid: '+(error instanceof FetchError?error.code:'NETWORK_OR_CAPACITY')+'. Geen gegevens goedgekeurd; laatste succesvolle controle behouden.'});
 }finally{active.delete(channelId);}
}
