import React from 'react';
import type {Metadata} from 'next';
import {AAV_COMPANY_FACTS,AAV_COMPANY_SOURCES,AAV_METHODOLOGY_FINDINGS} from '../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-company-review';
import {getAavValidationReview,REVIEW_SOURCES,AAV_VALIDATION_REVIEW_DATE,AAV_CAPITAL_REVIEW} from '../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-validation-review';
import {AAV_ILLUSTRATIVE_SCENARIOS,runAdvantageEnergyScenarios} from '../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
import {calculateAavResearchValuation} from '../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-research-valuation';
import './review.css';
export const metadata:Metadata={title:'Advantage Energy | Phoenix Portfolio',description:'Bronnen, onderzoeksstatus en scenario’s van Advantage Energy.'};
const labels={bear:'Bear',base:'Base',bull:'Bull',moonshot:'Moonshot'};
const n=(v:number)=>new Intl.NumberFormat('nl-NL',{maximumFractionDigits:2}).format(v);
export default function AdvantageEnergyValuationPage(){
 const review=getAavValidationReview(),strict=runAdvantageEnergyScenarios(),research=calculateAavResearchValuation();
 return <div className="aav-review">
  <header className="aav-hero"><p className="aav-eyebrow">PHOENIX RESEARCH · CANADEES AARDGAS</p>
   <h1>Advantage Energy</h1><p>TSX: AAV · Bedragen in CAD · Broncontrole {AAV_VALIDATION_REVIEW_DATE}</p>
   <nav aria-label="Onderzoeksnavigatie"><a href="#samenvatting">Samenvatting</a><a href="#waardering">Waardering</a><a href="#scenarios">Scenarioanalyse</a><a href="#verdieping">Verdieping</a></nav>
  </header>
  <section id="samenvatting" aria-label="Beleggersoverzicht" className="aav-section">
   <h2>Een gasproducent met een veranderde portefeuille</h2>
   <p>Advantage produceert aardgas, olie en gasvloeistoffen in West-Canada, met eigen infrastructuur rond Glacier, Valhalla en Progress.
    De verkoop van Wembley is afgerond. De invloed op de actuele productie, balans en reservebasis vraagt nog een samenhangende aansluiting.</p>
   <div className="aav-cards">
    <article><span>Gerapporteerde productie</span><strong>70.611 boe/d</strong><small>Q2 2026 · vóór verkoop</small></article>
    <article><span>Gerapporteerde nettoschuld</span><strong>CAD 560,25 mln</strong><small>30 juni 2026 · exclusief Entropy</small></article>
    <article><span>Wembley-verkoop</span><strong>CAD 316 mln</strong><small>11 september · bruto vóór aanpassingen</small></article>
    <article><span>Onderzoeksstatus</span><strong>{review.passed}/{review.total} controles</strong><small>{review.total-review.passed} open · waardering geblokkeerd</small></article>
   </div>
   <p className="aav-conclusion"><strong>Conclusie:</strong> de verkoop levert financiële ruimte op, maar de beschikbare gegevens onderbouwen nog geen betrouwbare waarde per aandeel.</p>
   <p><strong>Grootste risico’s:</strong> gasprijs en afzetcontracten, natuurlijke productieafname en vervangingsinvesteringen, plus onzekerheid over schuld, verwatering en reserves na verkoop.</p>
   <p className="aav-muted"><a href={AAV_COMPANY_SOURCES.q2}>Q2-resultaten</a> · <a href={AAV_COMPANY_SOURCES.sale}>Afronding Wembley</a></p>
  </section>
  <section id="waardering" className="aav-section aav-blocked">
   <p className="aav-eyebrow">WAARDERING</p><h2>{strict.status==='blocked'?'Geblokkeerd — nog geen betrouwbaar koersdoel':'Invoercontroles afgerond — uitkomst blijft illustratief'}</h2>
   <p>Er ontbreken gemeten gas- en liquidsproductie na de verkoop, een actuele schuld- en aandelenbrug en aangepaste gasreserves.
    Kosten en investeringen moeten bovendien bij dezelfde bedrijfsomvang en periode aansluiten.</p>
   <p>Een verkoopbericht, kwartaalgemiddelde of managementverwachting kan die metingen niet vervangen. Daarom tonen we hier geen geverifieerde waarde per aandeel.</p>
   <p>De {review.total} technische controles zijn geen {review.total} onafhankelijke financiële bewijzen: sommige controleren dezelfde gegevens opnieuw op bron en definitie.</p>
   <details><summary>Wat ontbreekt er precies? ({review.open.length} open controles)</summary>
    <div className="aav-check-list">{review.open.map(r=><article key={r.key}><h3>{r.label}</h3><p><strong>Nodig:</strong> {r.needed}</p><p><strong>Beschikbaar:</strong> {r.available}</p><p className="aav-muted">{r.kind} · {REVIEW_SOURCES[r.source].period} · <a href={REVIEW_SOURCES[r.source].url}>{REVIEW_SOURCES[r.source].title}</a> · {r.locator}</p><p>{r.decision}</p></article>)}</div>
   </details>
  </section>
  <section id="scenarios" className="aav-section"><p className="aav-eyebrow">SCENARIOANALYSE</p><h2>Wat verandert als de aannames veranderen?</h2>
   <p>Bear, Base, Bull en Moonshot zijn stresstests. Gasprijzen hieronder zijn hypothetische gerealiseerde verkoopprijzen, geen AECO-voorspelling of geverifieerd koersdoel.</p>
   <div className="aav-cards">{AAV_ILLUSTRATIVE_SCENARIOS.map(s=><article key={s.name}><span>{labels[s.name]}</span><strong>CAD {n(s.gasPriceCadPerMcf)}/Mcf</strong><small>Liquids CAD {n(s.liquidsPriceCadPerBbl)}/bbl<br/>Jaarcapex CAD {n(s.annualCapexCad/1e6)} mln<br/>Discontering {n(s.discountRate*100)}%</small></article>)}</div>
   <details><summary>Research Valuation: toon hypothetische vijfjaarsuitkomsten</summary>
    <p>Geen belastingen, hedges, expliciete reservebeperking, ontmanteling of restwaarde. Capex heeft hier geen effect op productie. De aandelenproxy en schuld zijn niet gereconcilieerd voor convertibles.</p>
    <div className="aav-cards">{research.map(r=><article key={r.name}><span>{labels[r.name]}</span><strong>CAD {n(r.perShareCad)}</strong><small>Hypothetische uitkomst per proxy-aandeel; geen koersdoel.{r.equityValueCad<0?' Negatieve model-equity is geen negatieve beurskoers.':''}</small></article>)}</div>
   </details>
  </section>
  <section id="verdieping" className="aav-section"><p className="aav-eyebrow">TECHNISCHE VERDIEPING</p><h2>Bronnen en detailmodellen</h2>
   <details id="bedrijfsfeiten"><summary>Bedrijfsfeiten en bronregister</summary>
    <div className="aav-table"><table><caption>Periode en status horen bij iedere waarde</caption><thead><tr><th>Gegeven</th><th>Waarde</th><th>Status / periode</th><th>Beperking en bron</th></tr></thead><tbody>{AAV_COMPANY_FACTS.map(f=><tr key={f.label}><th scope="row">{f.label}</th><td>{f.display}</td><td>{f.kind==='reported'?'Gerapporteerd':'Managementverwachting'}<br/>{f.period}</td><td>{f.limitation} <a href={AAV_COMPANY_SOURCES[f.source]}>Bron</a></td></tr>)}</tbody></table></div>
    <ul>{Object.entries(REVIEW_SOURCES).map(([id,s])=><li key={id}><a href={s.url}>{s.title}</a> · gepubliceerd {s.published} · {s.period}</li>)}</ul>
   </details>
   <details><summary>Convertibles: schuld en aandelen consequent behandelen</summary>
    <p>Historische schuldbrug per {AAV_CAPITAL_REVIEW.asOf}: CAD 397,896 mln bankschuld + CAD 143,750 mln hoofdsom convertibles + CAD 18,602 mln werkkapitaaltekort = CAD 560,248 mln nettoschuld.</p>
    <p>{AAV_CAPITAL_REVIEW.rule} De boekwaarde van de obligaties (CAD 128,703 mln) is niet gelijk aan de hoofdsom in deze schulddefinitie. Conversieprijs volgens AIF: CAD 14,58, onder voorbehoud van contractuele aanpassingen.</p>
   </details>
   <details id="modelcontrole"><summary>Methodologische beperkingen</summary><ul>{AAV_METHODOLOGY_FINDINGS.map(f=><li key={f}>{f}</li>)}</ul></details>
   <details id="modellen"><summary>Open de detailmodellen</summary><ul>
    <li><a href="/valuation/advantage-energy/engine">Modeloverzicht, vijf strategieën, adaptieve ladder en marginale analyse</a></li>
    <li><a href="/valuation/advantage-energy/investment-threshold">Economische investeringsdrempels</a></li>
    <li><a href="/valuation/advantage-energy/project-investments">Fictieve projecttranches</a></li>
    <li><a href="/valuation/advantage-energy/v2">V2 — capaciteit en reservebudget</a></li><li><a href="/valuation/advantage-energy/v3">V3 — gedeeltelijk uitputtingsjaar</a></li>
   </ul></details>
   <details><summary>Toon {review.total} verificatiecontroles</summary><ul>{Object.entries(review.readiness.checks).map(([key,valid])=><li key={key}>{valid?'✓':'○'} {key}: {valid?'geslaagd':'Wacht op geverifieerde invoer'}</li>)}</ul></details>
   <details><summary>Toon ontbrekende bewijsstukken en fouten</summary><ul>{review.readiness.errors.map((e,i)=><li key={i}>{e}</li>)}</ul></details>
  </section>
 </div>;
}
