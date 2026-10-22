'use client';
import {RECONCILIATION_LABELS,modelRelevant,type WorkflowStatus} from '../../../data/multi-sector/research/intelligence/workflow-status';
import React,{useState} from 'react';
import type {IntelligenceState,Candidate} from '../../../data/multi-sector/research/intelligence/contracts';
import type {Verification} from '../../../data/multi-sector/research/intelligence/verification';
import type {BatchItem} from '../../../data/multi-sector/research/intelligence/verification-batch';
export const verificationLabels={green:'GROEN — automatisch brongeverifieerd',orange:'ORANJE — handmatige beoordeling',red:'ROOD — conflict of ernstig risico',unverifiable:'NIET VERIFIEERBAAR'};
export type VerificationFilters={company:string;period:string;metric:string;classification:string;human:string;relevance:string;sourceDocument:string;reconciliation:string};
export const emptyFilters:VerificationFilters={company:'',period:'',metric:'',classification:'',human:'',relevance:'',sourceDocument:'',reconciliation:''};
export {modelRelevant};
export function filterVerified(state:IntelligenceState,reports:Verification[],filters:VerificationFilters,workflow:WorkflowStatus[]=[]){
 const by=new Map(reports.map(r=>[r.candidateId,r]));return state.candidates.filter(c=>{
  const decision=state.decisions.find(d=>d.candidateId===c.id),status=workflow.find(s=>s.candidateId===c.id);
  return (!filters.sourceDocument||(status?.originalDocumentId??state.documents.find(d=>d.id===c.documentId)?.pdf?.sourceDocumentId??c.documentId)===filters.sourceDocument)&&(!filters.reconciliation||status?.reconciliation.status===filters.reconciliation)&&(!filters.company||c.companyId===filters.company)&&(!filters.period||c.datum.period.start+' — '+c.datum.period.end===filters.period)&&(!filters.metric||c.metric===filters.metric)&&(!filters.classification||by.get(c.id)?.classification===filters.classification)&&(!filters.human||(filters.human==='pending'?!decision:decision?.action===filters.human))&&(!filters.relevance||(filters.relevance==='model')===modelRelevant(c));
 });
}
interface Props {workflow:WorkflowStatus[];state:IntelligenceState;reports:Verification[];warnings:string[];visible:Candidate[];filters:VerificationFilters;setFilters:(f:VerificationFilters)=>void;selectedDocument:string;onDocument:(id:string)=>void;blocked:Set<string>;busy:boolean;act:(payload:Record<string,unknown>)=>Promise<void>}
export default function VerificationPanel({workflow,state,reports,warnings,visible,filters,setFilters,selectedDocument,onDocument,blocked,busy,act}:Props){
 const [selection,setSelection]=useState<(BatchItem&{description:string})[]>([]),[reason,setReason]=useState(''),[attested,setAttested]=useState(false),[confirmed,setConfirmed]=useState(false);
 const by=new Map(reports.map(r=>[r.candidateId,r]));
 const eligible=(c:Candidate)=>by.get(c.id)?.classification==='green'&&workflow.find(s=>s.candidateId===c.id)?.reconciliation.status==='checks-passed'&&!blocked.has(c.id)&&!state.decisions.some(d=>d.candidateId===c.id);
 const item=(c:Candidate)=>({candidateId:c.id,fingerprint:c.fingerprint,documentHash:state.documents.find(d=>d.id===c.documentId)!.contentHash,verificationHash:by.get(c.id)!.hash,description:`${c.label}: ${c.datum.value} ${c.datum.unit} · ${c.datum.period.start} — ${c.datum.period.end} · ${c.id.slice(0,12)}`});
 const stale=selection.some(i=>{const c=state.candidates.find(c=>c.id===i.candidateId);return !c||!eligible(c)||by.get(c.id)?.hash!==i.verificationHash||c.fingerprint!==i.fingerprint||state.documents.find(d=>d.id===c.documentId)?.contentHash!==i.documentHash;});
 const field=(key:keyof VerificationFilters,label:string,options:[string,string][])=> <label>{label}<select aria-label={label} value={filters[key]} onChange={e=>setFilters({...filters,[key]:e.target.value})}><option value="">Alle</option>{options.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>;
 return <section id="fi-verification" className="panel"><h2>Geautomatiseerde bronverificatie</h2>
  <p>1. Bronverificatie → 2. financiële reconciliatie → 3. expliciete menselijke goedkeuring → 4. modelvalidatie → 5. waarderingsvrijgave. Groen activeert nooit een goedkeuring, score of waardering.</p>
  {!reports.length&&state.candidates.length>0&&<p role="alert">Verificatieresultaten ontbreken. Controleer of de v1.16-server draait.</p>}
  <div className="fi-stats"><p><strong>{state.candidates.length}</strong> kandidaten totaal</p>{Object.entries(verificationLabels).map(([k,label])=><p key={k} className={'fi-verification-'+k}><strong>{reports.filter(r=>r.classification===k).length}</strong> {label}</p>)}<p><strong>{state.decisions.filter(d=>d.action==='approve').length}</strong> menselijk goedgekeurd</p><p><strong>{state.candidates.filter(c=>!state.decisions.some(d=>d.candidateId===c.id)).length}</strong> nog niet beoordeeld</p></div>
  <p>Volledige bronlayout ontbreekt bij oudere imports totdat je bewust PDF-bewijs controleert. De server gebruikt de geregistreerde bron-URL, bestaande bestandshash en een veilige cache. Geen nieuwe kandidaten of beslissingen bij deze controle.</p>
  {warnings.map((w,i)=><p role="alert" key={i}>{w}</p>)}
  <div className="fi-fields">
   {field('company','Filter bedrijf',[['advantage-energy','Advantage Energy'],['abrasilver','AbraSilver']])}
   <label>Filter document<select aria-label="Filter document" value={selectedDocument} onChange={e=>onDocument(e.target.value)}><option value="">Alle documenten</option>{state.documents.map(d=><option key={d.id} value={d.id}>{d.title} · {d.id.slice(0,8)}</option>)}</select></label>
   {field('sourceDocument','Filter oorspronkelijke bron',[...new Map(workflow.map(s=>[s.originalDocumentId,state.documents.find(d=>d.id===s.originalDocumentId)?.title??s.originalDocumentId])).entries()].map(([id,title])=>[id,title+' · '+id.slice(0,12)]))}
   {field('reconciliation','Filter reconciliatie',Object.entries(RECONCILIATION_LABELS))}
   {field('period','Filter verslagperiode',[...new Set(state.candidates.map(c=>c.datum.period.start+' — '+c.datum.period.end))].sort().map(p=>[p,p]))}
   {field('metric','Filter financiële definitie',[...new Map(state.candidates.map(c=>[c.metric,c.label])).entries()])}
   {field('classification','Filter bronverificatie',Object.entries(verificationLabels))}
   {field('human','Filter menselijke beoordeling',[['pending','Nog niet beoordeeld'],['approve','Goedgekeurd'],['reject','Afgewezen']])}
   {field('relevance','Filter modelrelevantie',[['model','Modelrelevante definitie, nog geen modelinvoer'],['context','Overige financiële context']])}
  </div><button disabled={busy} onClick={()=>{setFilters({...emptyFilters});onDocument('');}}>Filters wissen</button>
  <h3>Groepsbeoordeling van volledig groene kandidaten</h3><p>Groen bronbewijs en automatische basiscontroles maken een kandidaat uitsluitend selecteerbaar voor een expliciete onderzoeksbeslissing. Alleen groen én vrij van bestaande bewijsblokkades én zonder eerdere menselijke beslissing. Een historische bron kan groen zijn en blijft ongeschikt voor directe actuele modelinvoer.</p>
  <p>{visible.filter(eligible).length} van {visible.length} zichtbare kandidaten voldoen aan de groepsvoorwaarden. Groen bronbewijs alleen is niet voldoende: open beoordelingsblokkades en eerdere beslissingen tellen afzonderlijk.</p>
  <button disabled={busy||!visible.some(eligible)} onClick={()=>{setSelection(visible.filter(eligible).slice(0,100).map(item));setConfirmed(false);}}>Selecteer maximaal 100 zichtbare groene kandidaten</button>
  <div className="fi-batch-options">{visible.filter(eligible).map(c=><label className="fi-checkbox" key={c.id}><input type="checkbox" disabled={busy} checked={selection.some(i=>i.candidateId===c.id)} onChange={e=>{setSelection(old=>e.target.checked?[...old,item(c)]:old.filter(i=>i.candidateId!==c.id));setConfirmed(false);}}/>{c.label} · {c.datum.value} {c.datum.unit} · {c.datum.period.end} · {c.id.slice(0,12)}</label>)}</div>
  <div className="fi-batch-selection" aria-label="Geselecteerde groepsgoedkeuring"><h4>Geselecteerd: {selection.length}</h4><ol>{selection.map(i=><li key={i.candidateId}>{i.description}{[state.candidates.find(c=>c.id===i.candidateId)].map(c=>c&&<div key={c.id}><p>Bedrijf {c.companyId} · oorspronkelijke bron {workflow.find(s=>s.candidateId===c.id)?.originalDocumentId.slice(0,12)} · analyse {c.documentId.slice(0,12)} · valuta {c.currency??'onbekend'} · scope {c.datum.scope} · schaal {c.pdf?.scale??'niet automatisch vastgesteld'}.</p><div>{[...new Set([...c.issues,...(c.pdf?.warnings??[]),...c.datum.uncertainties,c.relevance,...(workflow.find(s=>s.candidateId===c.id)?.reconciliation.reasons??[]),'Geen modelvalidatie of waarderingsvrijgave.'])].map((w,n)=><p key={n}>{w}</p>)}</div></div>)}</li>)}</ol>{selection.length>0&&<button disabled={busy} onClick={()=>{setSelection([]);setConfirmed(false);}}>Groepsselectie wissen</button>}</div>
  {stale&&<p role="alert">De selectie is gewijzigd of al beoordeeld. De hele groep wordt geblokkeerd; bekijk en selecteer opnieuw.</p>}
  <label>Toelichting groepsgoedkeuring<textarea value={reason} minLength={8} maxLength={800} onChange={e=>{setReason(e.target.value);setConfirmed(false);}} rows={2}/></label>
  <label className="fi-checkbox"><input type="checkbox" checked={attested} onChange={e=>{setAttested(e.target.checked);setConfirmed(false);}}/>Ik heb de broncontroles, definities en waarschuwingen van alle geselecteerde kandidaten beoordeeld.</label>
  <label className="fi-checkbox"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Ik bevestig expliciet de hierboven zichtbare groep; dit is geen modelvrijgave.</label>
  <button disabled={busy||stale||!selection.length||selection.length>100||!attested||!confirmed||reason.trim().length<8} onClick={()=>act({action:'approve-verified-batch',batch:{items:selection.map(({description,...i})=>i),reason,attested,confirmed}})}>Geselecteerde groep menselijk goedkeuren</button>
  <p>Bij één gewijzigde of ongeldige kandidaat stopt de volledige groep: nul beslissingen opgeslagen. Iedere succesvolle goedkeuring krijgt een eigen bestaande auditvermelding met de verificatieversie en -hash in de toelichting. Eerdere beslissingen worden niet overschreven.</p>
 </section>;
}
export function VerificationDetails({report}:{report:Verification|undefined}){
 if(!report)return <p>Geen verificatieresultaat beschikbaar.</p>;
 return <div className={'fi-verification-'+report.classification}><p><strong>{verificationLabels[report.classification]}</strong></p><p>{report.explanation}</p><p>{report.context} Modelinvoer: niet vrijgegeven. Onafhankelijk gecontroleerde extra bronvermeldingen: {report.independentConfirmations}.</p><details><summary>Verificatiecontroles en gebruikte bronnen</summary><ul>{report.checks.map((c,i)=><li key={i}><strong>{{pass:'GESLAAGD',fail:'CONFLICT',missing:'NIET UITVOERBAAR','not-applicable':'NIET VAN TOEPASSING'}[c.status]}</strong> · {c.id}: {c.message}{c.references&&<small> Bewijs: {c.references.map(s=>s.slice(0,12)).join(', ')}</small>}</li>)}</ul><ul>{report.sources.map(s=><li key={s.documentId+s.page}><a href={s.url} target="_blank" rel="noreferrer">Officieel brondocument</a> · PDF-pagina {s.page} · document {s.documentId.slice(0,12)} · hash {s.fileHash.slice(0,12)}</li>)}</ul><p className="fi-hash">Regels {report.version} · verificatiehash {report.hash}</p></details></div>;
}
