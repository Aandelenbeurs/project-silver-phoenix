import React from 'react';
import Link from 'next/link';
import type {Metadata} from 'next';
import {buildResearchDemonstration} from '../../data/multi-sector/research/demonstration';
import {RESEARCH_METHODS} from '../../data/multi-sector/research/contracts';
import {SCORE_METHOD_REVIEW} from '../../data/score-transparency';
import './research.css';
export const metadata:Metadata={title:'Onderzoekscentrum | Phoenix Portfolio'};
const format=(n:number)=>new Intl.NumberFormat('nl-NL',{maximumFractionDigits:2}).format(n);
const kind={reported:'Gerapporteerd',guidance:'Managementverwachting',derived:'Afgeleid',hypothetical:'Hypothetisch'};
export default function ResearchPage(){
 const demo=buildResearchDemonstration();
 return <div className="research-center">
  <header><p className="eyebrow">PHOENIX · MULTI-SECTOR RESEARCH</p><h1>Een gedeelde taal. Een passend model per sector.</h1>
   <p>Vergelijk eerst de bewijskwaliteit en de methode. Een metalscore en een gas-DCF zijn geen onderling uitwisselbare koerswaarderingen.</p>
   <p className="research-note">Reproduceerbare momentopname uit commit 3b4ba71 · onderzoekspeildatum {demo.asOf}. Geen live koersen of nieuwe actuele bedrijfsgegevens opgehaald.</p>
   <nav><a href="#bedrijven">Twee bedrijven</a><a href="#scoring">Scores begrijpen</a><a href="#methoden">Sectorlogica</a><Link href="/ranking">Bestaande ranking</Link></nav>
  </header>
  <section id="bedrijven"><h2>Twee sectoren, dezelfde bewijsdiscipline</h2><p>Beide voorbeelden blijven geblokkeerd voor een onderbouwde koerswaarde. Dat is een onderzoeksuitkomst, geen oordeel dat de ondernemingen onaantrekkelijk zijn.</p>
   <div className="research-grid">{demo.companies.map(({packet,review,legacyScore})=><article className="panel" key={packet.model.identity.companyId}>
    <p className="eyebrow">{packet.model.identity.sector}</p><h2>{packet.model.identity.name}</h2><p>{packet.model.identity.ticker} · {packet.model.identity.currency} · {packet.model.identity.businessModel}</p>
    <p className="research-status">Koerswaardering geblokkeerd</p><p>{RESEARCH_METHODS.find(m=>m.id===packet.methodId)?.explanation}</p>
    {legacyScore?<><dl><dt>Bestaande Opportunity Score</dt><dd>{legacyScore.existingOpportunity===null?'Niet beschikbaar':format(legacyScore.existingOpportunity)}</dd><dt>Interne datastatus</dt><dd>{legacyScore.label}</dd><dt>Interne confidence</dt><dd>{legacyScore.confidence}</dd></dl><p>{legacyScore.evidenceCaution}</p></>:<p>De bestaande AAV-verificatie blijft {demo.aavChecks.passed}/{demo.aavChecks.total}; de zes gedeelde financiële vereisten zijn een extra weergave, geen vervanging.</p>}
    <details><summary>Welke onderbouwing ontbreekt?</summary><ul>{[...new Set(review.reasons)].map((r,i)=><li key={i}>{r}</li>)}</ul></details>
    <details><summary>Beschikbare gegevens en onzekerheden ({packet.data.length})</summary>{packet.data.length===0?<p>Alleen interne legacy-scores aanwezig. Geen onderliggend financieel bronregister in deze adapter; daarom geen projectwaarde ingevuld.</p>:<div className="research-table"><table><thead><tr><th>Gegeven</th><th>Waarde</th><th>Periode / status</th><th>Bron en scope</th></tr></thead><tbody>{packet.data.map(d=><tr key={d.id}><th scope="row">{d.id}</th><td>{d.value===null?'Ontbreekt':format(d.value)} {d.unit}</td><td>{d.period.start} — {d.period.end}<br/>{kind[d.kind]} · {d.verification}</td><td>{d.scope}<br/><a href={packet.documents.find(s=>s.id===d.documentId)?.uri}>{d.locator}</a><br/>{d.uncertainties.join(' ')}</td></tr>)}</tbody></table></div>}</details>
    <details><summary>Reproduceerbaarheid en beperkingen</summary><p>{packet.model.provenance.sourceSnapshot} · {packet.model.identity.modelVersion}</p><ul>{packet.limitations.map(l=><li key={l}>{l}</li>)}</ul><p>Geen impliciete valutaomrekening, scenariokansen, universele score of portefeuillemutatie.</p></details>
    {legacyScore?<Link href="/ranking">Open ongewijzigde metalsranking →</Link>:<Link href="/valuation/advantage-energy">Open Advantage Energy-dashboard →</Link>}
   </article>)}</div>
  </section>
  <section id="scoring" className="panel"><h2>Een hoge score is geen bewijs van een lage prijs</h2><p>De bestaande Opportunity Score combineert Quality 30%, Growth 25%, Leverage 15%, Valuation 20% en Catalysts 10%. Daarna gaat Risk Penalty eraf. De uitkomst is begrensd op 0–100. Deze gewichten zijn niet gewijzigd.</p>
   <ul>{SCORE_METHOD_REVIEW.notes.map(n=><li key={n}>{n}</li>)}</ul>
   <p>Een aantrekkelijk bedrijf, een aantrekkelijk gewaardeerd aandeel, sterke grondstofblootstelling en speculatieve optionaliteit zijn verschillende eigenschappen. De bestaande ordinal scores zijn geen actuele financiële brondata. Ook de status ‘compleet’ bewijst geen actuele broncontrole.</p>
   <details><summary>Scoreopbouw van het metalsvoorbeeld</summary>{demo.companies[0].legacyScore?.contributions?<dl>{Object.entries(demo.companies[0].legacyScore.contributions).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{format(value)} gewogen punten</dd></div>)}<dt>Risk penalty</dt><dd>−{demo.companies[0].legacyScore.riskPenalty}</dd></dl>:<p>Onvoldoende score-input.</p>}</details>
   <p><strong>Ranking, optimizer en rotatie:</strong> bestaande score-, selectie- en positiebanden blijven gelden. De nieuwe bewijslaag is informatief; zij blokkeert of herweegt bestaande voorstellen niet stilzwijgend. Goedkeuring van zo’n beleidswijziging is een afzonderlijke stap.</p>
  </section>
  <section id="methoden" className="panel"><h2>Sectorlogica blijft sectorspecifiek</h2><div className="research-table"><table><thead><tr><th>Methode</th><th>Beschikbaar</th><th>Economische basis</th></tr></thead><tbody>{RESEARCH_METHODS.map(m=><tr key={m.id}><th scope="row">{m.label}</th><td>{m.implemented?'Bestaande engine / adapter':'Nog geen engine'}</td><td>{m.explanation}</td></tr>)}</tbody></table></div>
   <p>De gemeenschappelijke laag registreert waarde, eenheid, document, publicatiedatum, verslagperiode, scope, berekening, beoordeling en onzekerheden. Afwijkende perioden of corporate-eventbases vragen een expliciete aansluiting. Hypotheses, conflict en ontbrekende bronnen kunnen geen gerapporteerde feiten vervangen.</p>
   <p>Cross-sectorvergelijking vereist onder meer gelijke valuta, peildatum, realisatiehorizon en cashflowbasis. Dat maakt modellen nog niet automatisch economisch vergelijkbaar. Er wordt daarom geen gezamenlijke ranglijst uit deze twee voorbeelden afgeleid.</p>
  </section>
 </div>;
}
