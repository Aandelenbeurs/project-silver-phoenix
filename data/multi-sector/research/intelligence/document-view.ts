import type {IntelligenceState,SourceDocument} from './contracts';

/** Read-only presentation. Never rewrites document/candidate IDs or approvals.
 * Explicit analysis IDs select that exact historical version. An original source
 * resolves through sourceDocumentId, or a verified identical full-file hash.
 * URL/title similarity alone is not evidence of identical financial contents.
 */
export function documentView(state:IntelligenceState,id:string){
 const requested=state.documents.find(d=>d.id===id);
 if(!requested)return null;
 const direct=state.documents.filter(d=>d.companyId===requested.companyId&&d.pdf?.sourceDocumentId===requested.id);
 const hash=requested.monitoring?.hashBasis==='pdf-bytes'?requested.monitoring.bodyHash:null;
 const identical=hash?state.documents.filter(d=>d.companyId===requested.companyId&&d.pdf?.fileHash===hash&&d.pdf.status==='processed'):[];
 const effective=requested.pdf?requested:direct.at(-1)??identical.at(-1)??requested;
 const candidates=state.candidates.filter(c=>c.documentId===effective.id);
 const periods=[...new Set(candidates.map(c=>`${c.datum.period.start} — ${c.datum.period.end}`))];
 const ids=new Set([requested.id,effective.id]);let changed=true;
 while(changed){changed=false;for(const d of state.documents){
  if(d.companyId!==requested.companyId||d.url!==requested.url)continue;
  const links=[d.id,d.pdf?.sourceDocumentId,d.supersedes,d.monitoring?.previousVersion].filter((v):v is string=>Boolean(v));
  if(links.some(v=>ids.has(v)))for(const v of links)if(!ids.has(v)){ids.add(v);changed=true;}
 }}
 const history=state.documents.filter(d=>ids.has(d.id));
 const status=effective.pdf?effective.pdf.status==='processed'?(candidates.length?'PDF verwerkt':effective.pdf.warnings.some(w=>w.startsWith('[PDF_RECOVERY]'))?'PDF hersteld; bestaande kandidaten behouden':'PDF gelezen; geen betrouwbare kandidaten'):effective.pdf.status==='unreadable'?'PDF niet leesbaar':'PDF-analyse mislukt':effective.monitoring?(/\.pdf(?:$|[?#])/i.test(effective.url)?'Ontdekt; PDF-analyse nog niet uitgevoerd':effective.monitoring.processing==='processed'?'Brontekst opgehaald; beoordeling vereist':'Bron ontdekt; inhoud nog te controleren'):'Handmatig fragment';
 return {requested,effective,candidates,periods,history,status,linked:requested.id!==effective.id};
}

export function analysisOutcome(before:IntelligenceState,after:IntelligenceState,requestedId:string){
 const view=documentView(after,requestedId);
 const processed=view?.effective.pdf?.status==='processed';
 const status=processed?(view.candidates.length?'processed':'no-candidates'):view?.effective.pdf?'error':'unresolved';
 const candidates=view?.candidates??[];const previous=new Set(before.candidates.map(c=>c.id));
 const added=candidates.filter(c=>!previous.has(c.id)).length;
 const code=view?.effective.pdf?.errorCode??null;
 const reasons:Record<string,string>={ROBOTS:'De officiële bron staat deze automatische download niet toe.',TIMEOUT:'Het ophalen van de PDF duurde te lang.',PDF_TIMEOUT:'De PDF-verwerking duurde te lang.',PDF_NO_TEXT:'De PDF bevat geen bruikbare tekst; OCR is niet beschikbaar.',PDF_MIME:'De bron stuurde geen PDF-bestand.',PDF_SIZE:'De PDF overschrijdt de veilige bestandsgrootte.',PDF_FORMAT:'Het bestand heeft geen geldige PDF-header.',PDF_PAGE_LIMIT:'De PDF heeft meer dan de veilige grens van 128 pagina’s.',PDF_TEXT_LIMIT:'De PDF overschrijdt de veilige tekstlimiet.',PDF_ITEM_LIMIT:'De PDF bevat te veel tekstitems.',PDF_ITEM_SIZE_LIMIT:'Een PDF-tekstitem is te groot.',PDF_OUTPUT_LIMIT:'De PDF-layout overschrijdt de veilige uitvoerlimiet.',PDF_UNREADABLE:'De PDF-parser kan dit document niet betrouwbaar lezen.',PDF_EOF:'Het PDF-bestand is onvolledig.',PDF_HASH_MISMATCH:'De PDF-hash wijkt af van de mislukte analyse; geen herstelbewijs gekoppeld.',PDF_WORKER_EXIT:'De geïsoleerde PDF-parser is voortijdig gestopt.',PDF_WORKER_UNAVAILABLE:'De geïsoleerde PDF-parser kon niet starten.',PDF_WORKER_PROTOCOL:'De PDF-parser gaf geen geldige bronlayout terug.',PDF_UNREADABLE_OR_LIMIT:'De PDF kon niet worden gelezen of overschreed een verwerkingslimiet.'};
 const recovery=view?.effective.pdf?.warnings.find(w=>w.startsWith('[PDF_RECOVERY]'));
 const message=recovery?recovery.replace('[PDF_RECOVERY] ','')+' Geen automatische goedkeuring of modelvrijgave.':status==='processed'?'Analyse beschikbaar. De kandidaten vereisen afzonderlijke menselijke beoordeling.':status==='no-candidates'?'PDF gelezen, maar geen betrouwbaar ondersteunde financiële kandidaten gevonden. Controleer de waarschuwingen of importeer een fragment.':status==='error'?`${code&&reasons[code]||'De PDF kon niet veilig worden opgehaald of verwerkt.'} Er is niets financieel goedgekeurd.`:'De aanvraag is verwerkt, maar er kon geen analyseversie aan deze bronregistratie worden gekoppeld. Er wordt geen succesvolle extractie geclaimd.';
 return {requestedDocumentId:requestedId,analysisDocumentId:view?.effective.pdf?view.effective.id:null,title:view?.requested.title??'Onbekend document',status,total:candidates.length,new:added,existing:candidates.length-added,periods:view?.periods??[],warnings:view?.effective.pdf?.warnings??[],errorCode:code,message};
}
export type AnalysisOutcome=ReturnType<typeof analysisOutcome>;
