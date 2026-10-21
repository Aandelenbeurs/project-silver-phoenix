import { diagnoseAavMarginalInvestment } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-marginal-investment';
import { getAavPolicyComparison, POLICY_LABELS } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-policy-comparison';
import { compareAavInvestmentPolicies } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-policy';
import Link from 'next/link';
import { diagnoseAavBaseEconomics } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-economics-diagnostic';
import type { Metadata } from 'next';
import { AAV_REQUIREMENTS, evidenceForRequirement, validateAavRequirements } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-evidence-explainer';
import { AAV_EVIDENCE_LEDGER, validateAavEvidenceLedger } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-evidence-ledger';
import { getAavAnalysis, SCENARIO_LABELS, summarizeTechnicalBlockers } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-analysis';
import { AAV_V2_HYPOTHETICAL } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v2';
import { AAV_ILLUSTRATIVE_SCENARIOS, runAdvantageEnergyScenarios } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
import { evaluateClaimBackedAdvantageReadiness } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-claim-readiness';

export const metadata: Metadata = {title:'AAV | Phoenix Valuation Engine'};
const n=(v:number,d=2)=>new Intl.NumberFormat('nl-NL',{maximumFractionDigits:d}).format(v);
const cad=(v:number)=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'CAD',maximumFractionDigits:2}).format(v);
const panel={border:'1px solid #64748b55',borderRadius:12,padding:18} as const;
const sub={opacity:0.76,fontSize:13} as const;
const th={padding:'10px 8px',textAlign:'right' as const,borderBottom:'1px solid #64748b55'};
const td={padding:'10px 8px',textAlign:'right' as const,borderBottom:'1px solid #64748b33'};

export default function AavEnginePage(){
 const marginal=diagnoseAavMarginalInvestment();
 const policyComparison=getAavPolicyComparison();
 const diagnostic=diagnoseAavBaseEconomics();
 const strict=runAdvantageEnergyScenarios();
 const readiness=evaluateClaimBackedAdvantageReadiness();
 const {scenarios,sensitivity}=getAavAnalysis();
 const ledgerErrors=[...validateAavEvidenceLedger(),...validateAavRequirements()];
 const checks=Object.entries(readiness.checks);
 const grouped=summarizeTechnicalBlockers(strict.errors);
 const missing=AAV_EVIDENCE_LEDGER.filter(x=>x.status==='unverified');
 const base=scenarios.find(x=>x.name==='base')!;
 const maxCash=Math.max(1,...scenarios.flatMap(x=>x.years.map(y=>Math.abs(y.preTaxCashFlowCad))));
 return <main style={{maxWidth:1160,margin:'0 auto',padding:'24px 16px 60px'}}>
  <p><Link href='/sectors/canadian-natural-gas'>← Canadian Natural Gas</Link></p>
  <h1>Phoenix Valuation Engine — Advantage Energy</h1>
  <p>Onderzoeksdashboard voor productie, kasstromen en waarderingsgevoeligheid. Bestaande bedrijfsgegevens en de strikte bewijscontrole blijven gescheiden van hypothetische aannames.</p>
  <section style={{...panel,margin:'20px 0',borderLeft:'4px solid #eab308'}}>
   <h2 style={{marginTop:0}}>Voorlopig onderzoeksmodel · officiële waardering niet vrijgegeven</h2>
   <p><strong>{checks.filter(([,ok])=>ok).length}/{checks.length}</strong> controles geslaagd · <strong>{AAV_REQUIREMENTS.length}</strong> bewijsgebieden · <strong>{missing.length}</strong> expliciet ontbrekende ledger-gegevens · <strong>{ledgerErrors.length}</strong> validatiefouten.</p>
   <p style={sub}>Alle bedragen hieronder zijn hypothetische modeluitkomsten, geen koersdoelen, fair values of koopadviezen. Negatieve modelwaarden zijn geen negatieve beurskoersen.</p>
   <details><summary style={{cursor:'pointer'}}>Waarom is de waardering geblokkeerd? ({grouped.length} unieke meldingen, {strict.errors.length} controles)</summary>
    <ul>{grouped.map(x=><li key={x.message}>{x.message} {x.count>1?`(${x.count} controles)`:''}</li>)}</ul>
   </details>
  </section>
  <section><h2>1. Waarderingsoverzicht — vier scenario's</h2>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(215px,1fr))',gap:12}}>{scenarios.map(r=>{
    const assumptions=AAV_ILLUSTRATIVE_SCENARIOS.find(x=>x.name===r.name)!;
    return <article key={r.name} style={panel}><h3 style={{marginTop:0}}>{SCENARIO_LABELS[r.name]}</h3>
     <p style={{fontSize:27,fontWeight:700,margin:'8px 0'}}>{cad(r.modelValuePerShareCad)}</p>
     <p style={sub}>Hypothetische equitywaarde per proxy-aandeel</p>
     <p>Gasprijs: {cad(assumptions.gasPriceCadPerMcf)}/Mcf<br/>Capex: {n(assumptions.annualCapexCad/1e6,0)} mln CAD/jaar</p>
     <p style={sub}>PV kasstromen: {n(r.enterpriseValueCad/1e6,1)} mln CAD<br/>Gemodelleerde productie: {n(r.producedBoe/1e6,1)} mln boe</p>
    </article>})}</div>
  </section>
  <section style={{marginTop:30}}><h2>2. Waarom is Base negatief? — economische diagnose</h2>
   <p>Exacte aansluiting op de bestaande V3-berekening. Alle bedragen zijn contant gemaakt met de Base-discontovoet en zijn <strong>hypothetisch</strong>.</p>
   <div style={{...panel,overflowX:'auto'}}>
    <table style={{width:'100%',borderCollapse:'collapse',minWidth:520}}><thead><tr><th style={{...th,textAlign:'left'}}>Kasstroombrug (Base)</th><th style={th}>Contante waarde, mln CAD</th><th style={th}>Per proxy-aandeel</th></tr></thead><tbody>
     {([
      ['Omzet gas + liquids',diagnostic.pv.revenue],
      ['Royalty’s',-diagnostic.pv.royalties],
      ['Veldkosten en transport',-diagnostic.pv.fieldAndTransport],
      ['Algemene kosten (G&A)',-diagnostic.pv.ga],
      ['Investeringsuitgaven (capex)',-diagnostic.pv.capex],
      ['Operationele ondernemingswaarde',diagnostic.enterpriseCad],
      ['Nettoschuld (verwachtingsproxy)',-diagnostic.debtCad],
      ['Hypothetische equitywaarde',diagnostic.equityCad],
     ] as const).map(([label,value])=><tr key={label}><td style={{...td,textAlign:'left'}}>{label}</td><td style={td}>{n(value/1e6,1)}</td><td style={td}>{cad(value/diagnostic.shares)}</td></tr>)}
    </tbody></table>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12,marginTop:12}}>
    <article style={panel}><h3 style={{marginTop:0}}>Productiedaling compenseren</h3>
     <p><strong>{n(diagnostic.firstYearMaintenanceProxyCad/1e6,1)} mln CAD/jaar</strong></p>
     <p style={sub}>Theoretisch investeringsbedrag om bij aanvang van jaar 1 de gemodelleerde natuurlijke daling te compenseren: beginproductie × 20% decline × 35.000 CAD per boe/d capaciteit.</p>
     <p>Base-capex: {n(diagnostic.firstYearAnnualCapexCad/1e6,1)} mln CAD/jaar.<br/>Verschil: {n(diagnostic.firstYearGrowthCapexProxyCad/1e6,1)} mln CAD.</p>
     <p style={sub}>Dit is een rekenkundige onderhoudsproxy, geen door AAV gerapporteerde onderhouds- of groeicapex. Negatief verschil betekent dat de aangenomen capex de berekende daling niet volledig compenseert.</p>
    </article>
    <article style={panel}><h3 style={{marginTop:0}}>Gasprijs bij model-break-even</h3>
     <p><strong>{diagnostic.modelBreakEvenGasPriceCadPerMcf===null?'Niet gevonden':`${cad(diagnostic.modelBreakEvenGasPriceCadPerMcf)}/Mcf`}</strong></p>
     <p>Base-aanname: {cad(diagnostic.baseGasPriceCadPerMcf)}/Mcf.</p>
     <p style={sub}>De gasprijs waarbij de hypothetische equitywaarde precies nul wordt, bij gelijkblijvende Base-kosten, capex, productiemethode en reservebudget. Geen koersdoel, marktverwachting of rendementsdrempel.</p>
    </article>
   </div>
   <details style={{marginTop:12}}><summary style={{cursor:'pointer'}}>Bekijk jaarlijkse omzet- en kostenopbouw</summary><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:720}}><thead><tr>{['Jaar','Gasomzet','Liquids','Royalty’s','Veld + transport','G&A','Capex','Kasstroom'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{diagnostic.annual.map(y=><tr key={y.year}><td style={td}>{y.year}</td>{[y.gasRevenueCad,y.liquidsRevenueCad,y.royaltiesCad,y.fieldAndTransportCad,y.gaCad,y.capexCad,y.cashCad].map((v,i)=><td key={i} style={td}>{n(v/1e6,1)}</td>)}</tr>)}</tbody></table></div><p style={sub}>Bedragen in mln CAD, vóór belasting. De jaarfractie in het laatste productiejaar is al verwerkt.</p></details>
  </section>
  <section style={{marginTop:30}}><h2>3. Productie en kasstromen</h2>
   <p style={sub}>Productievolume en pre-tax kasstroom per modeljaar. De balken gebruiken één gezamenlijke schaal voor de kasstromen; de kleur onderscheidt positieve en negatieve kasstromen.</p>
   <div style={{...panel,overflowX:'auto'}}><h3>Base-scenario — jaarlijkse ontwikkeling</h3>
    <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}><thead><tr><th style={{...th,textAlign:'left'}}>Jaar</th><th style={th}>Productie (mln boe)</th><th style={th}>Capex (mln CAD)</th><th style={th}>Kasstroom (mln CAD)</th><th style={{...th,textAlign:'left',width:'35%'}}>Kasstroomprofiel</th></tr></thead><tbody>
     {base.years.map(y=><tr key={y.year}><td style={{...td,textAlign:'left'}}>{y.year}{y.operatingYearFraction<0.999?' *':''}</td><td style={td}>{n(y.producedBoe/1e6,2)}</td><td style={td}>{n(y.capexCad/1e6,1)}</td><td style={td}>{n(y.preTaxCashFlowCad/1e6,1)}</td><td style={{...td,textAlign:'left'}}><div style={{height:13,width:`${Math.max(1,Math.abs(y.preTaxCashFlowCad)/maxCash*100)}%`,background:y.preTaxCashFlowCad>=0?'#22c55e':'#f97316',borderRadius:3}}/></td></tr>)}
    </tbody></table><p style={sub}>* Gedeeltelijk productiejaar door hypothetische reserve-uitputting. Geen belasting, hedges, ontmanteling of terminal value.</p></div>
   <details style={{marginTop:12}}><summary style={{cursor:'pointer'}}>Alle scenario's: jaarlijkse kasstromen en contante waarden</summary>
    {scenarios.map(r=><details key={r.name} style={{margin:'12px 0'}}><summary style={{cursor:'pointer'}}>{SCENARIO_LABELS[r.name]}</summary><div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:600,borderCollapse:'collapse'}}><thead><tr><th style={th}>Jaar</th><th style={th}>Jaarfractie</th><th style={th}>Productie mln boe</th><th style={th}>Capex mln CAD</th><th style={th}>Pre-tax CF mln CAD</th><th style={th}>PV mln CAD</th></tr></thead><tbody>{r.years.map(y=><tr key={y.year}><td style={td}>{y.year}</td><td style={td}>{n(y.operatingYearFraction,3)}</td><td style={td}>{n(y.producedBoe/1e6)}</td><td style={td}>{n(y.capexCad/1e6)}</td><td style={td}>{n(y.preTaxCashFlowCad/1e6)}</td><td style={td}>{n(y.discountedCashFlowCad/1e6)}</td></tr>)}</tbody></table></div></details>)}
   </details>
  </section>
  <section style={{marginTop:30}}><h2>4. Gevoeligheidsanalyse — Base</h2>
   <p>Wat gebeurt er wanneer we <strong>één aanname tegelijk</strong> wijzigen en de volledige reservebegrensde motor opnieuw doorrekenen?</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:12}}>{sensitivity.map(x=><article key={x.id} style={panel}>
    <h3 style={{marginTop:0}}>{x.label}</h3><p style={sub}>Andere Base-aannames blijven gelijk; productie en uitputtingsjaar mogen door de berekening veranderen.</p>
    <table style={{width:'100%',borderCollapse:'collapse'}}><tbody>
     <tr><td>Lagere input: {n(x.lowInput)} {x.unit}</td><td style={{textAlign:'right'}}>{cad(x.lowValueCad)}</td></tr>
     <tr><td>Standaard</td><td style={{textAlign:'right',fontWeight:700}}>{cad(x.baseValueCad)}</td></tr>
     <tr><td>Hogere input: {n(x.highInput)} {x.unit}</td><td style={{textAlign:'right'}}>{cad(x.highValueCad)}</td></tr>
    </tbody></table><p style={sub}>Verschil laag–hoog: {cad(x.highValueCad-x.lowValueCad)} per proxy-aandeel. Dit is geen waarschijnlijkheidsinterval.</p>
   </article>)}</div>
   <p style={sub}>Voorlopig twee herberekende gevoeligheden: gasprijs ±0,50 CAD/Mcf en jaarlijkse capex ±50 mln CAD. De laatste verandert ook de ontwikkelde productiecapaciteit. Andere risico's zijn nog niet kwantitatief geanalyseerd.</p>
  </section>
  <section style={{marginTop:30}}><h2>5. Investeringsbeleid — ontwikkelen, onderhouden of afbouwen</h2>
   <p>Dezelfde fictieve Base-inputs, maar vijf kapitaalstrategieën. Dit zijn <strong>beleidsexperimenten</strong>, geen bedrijfsprognoses. De economische toets kijkt vijf jaar vooruit en is een heuristiek, geen bewezen optimaal beleid.</p>
   <div style={{...panel,overflowX:'auto'}}><table style={{width:'100%',minWidth:680,borderCollapse:'collapse'}}><thead><tr><th style={{...th,textAlign:'left'}}>Strategie</th><th style={th}>Modelwaarde/aandeel</th><th style={th}>PV kasstromen (mln CAD)</th><th style={th}>Capex jaar 1 (mln CAD)</th><th style={th}>Productie (mln boe)</th></tr></thead><tbody>
    {compareAavInvestmentPolicies('base').map(x=><tr key={x.policy}><td style={{...td,textAlign:'left'}}>{({'fixed':'Vast investeringsbudget','runoff':'Gecontroleerd afbouwen','maintenance':'Onderhoud binnen budget','economic-gate':'Economische investeringspoort','adaptive-grid':'Adaptieve investeringsladder'} as const)[x.policy]}</td><td style={td}>{cad(x.valuePerShareCad)}</td><td style={td}>{n(x.enterpriseValueCad/1e6,1)}</td><td style={td}>{n((x.years[0]?.capexCad??0)/1e6,1)}</td><td style={td}>{n(x.producedBoe/1e6,1)}</td></tr>)}
   </tbody></table></div>
   <details style={{...panel,marginTop:12}}><summary style={{cursor:'pointer'}}>Bekijk jaarlijkse beslissingen van de economische investeringspoort</summary><div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:680,borderCollapse:'collapse'}}><thead><tr><th style={th}>Jaar</th><th style={th}>Capex mln CAD</th><th style={th}>Productie mln boe</th><th style={th}>Kasstroom mln CAD</th><th style={{...th,textAlign:'left'}}>Beslissing</th></tr></thead><tbody>{compareAavInvestmentPolicies('base').find(x=>x.policy==='economic-gate')!.years.map(y=><tr key={y.year}><td style={td}>{y.year}</td><td style={td}>{n(y.capexCad/1e6,1)}</td><td style={td}>{n(y.producedBoe/1e6,2)}</td><td style={td}>{n(y.preTaxCashFlowCad/1e6,1)}</td><td style={{...td,textAlign:'left'}}>{y.decision}</td></tr>)}</tbody></table></div></details>
   <details style={{...panel,marginTop:12}}><summary style={{cursor:'pointer'}}>Bekijk jaarlijkse beslissingen van de adaptieve investeringsladder</summary><div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:680,borderCollapse:'collapse'}}><thead><tr><th style={th}>Jaar</th><th style={th}>Capex mln CAD</th><th style={th}>Productie mln boe</th><th style={th}>Kasstroom mln CAD</th><th style={{...th,textAlign:'left'}}>Beslissing</th></tr></thead><tbody>{compareAavInvestmentPolicies('base').find(x=>x.policy==='adaptive-grid')!.years.map(y=><tr key={y.year}><td style={td}>{y.year}</td><td style={td}>{n(y.capexCad/1e6,1)}</td><td style={td}>{n(y.producedBoe/1e6,2)}</td><td style={td}>{n(y.preTaxCashFlowCad/1e6,1)}</td><td style={{...td,textAlign:'left'}}>{y.decision}</td></tr>)}</tbody></table></div></details>
   <p style={sub}>Het vaste beleid sluit exact aan op V3. Een hogere uitkomst van een alternatieve strategie betekent niet dat de echte onderneming dit beleid kan uitvoeren. Het model mist o.a. minimumverplichtingen, puttenplanning, hedges, belastingen en ontmantelingskosten.</p>
  </section>
  <section style={{marginTop:30}}><h2>6. Strategieën vergelijken — alle vier scenario's</h2>
   <p>Welke kapitaalstrategie levert onder dezelfde <strong>hypothetische</strong> scenario-inputs de hoogste modelwaarde op, en tegen welke investering en productieontwikkeling? De hoogste uitkomst is geen aanbeveling of bewezen optimum.</p>
   {policyComparison.map(group=><details key={group.scenario} open={group.scenario==='base'} style={{...panel,marginTop:12}}>
    <summary style={{cursor:'pointer',fontWeight:700}}>{SCENARIO_LABELS[group.scenario]} — hoogste modelwaarde: {POLICY_LABELS[group.highestModeledEquityPolicy]}</summary>
    <div style={{overflowX:'auto',marginTop:12}}><table style={{width:'100%',minWidth:1050,borderCollapse:'collapse'}}><thead><tr>
     {['Strategie','Equity/aandeel','Δ t.o.v. vast','PV operationele kasstromen¹','Cumulatieve kasstroom¹','Totale capex','Productie','Eindproductie','Jaren positieve CF'].map((h,i)=><th key={h} style={{...th,...(i===0?{textAlign:'left' as const}:{})}}>{h}</th>)}
    </tr></thead><tbody>{group.rows.map(r=><tr key={r.policy}>
     <td style={{...td,textAlign:'left',fontWeight:r.policy===group.highestModeledEquityPolicy?700:400}}>{POLICY_LABELS[r.policy]}{r.policy===group.highestModeledEquityPolicy?' *':''}</td>
     <td style={td}>{cad(r.equityPerShareCad)}</td><td style={td}>{cad(r.incrementalEquityPerShareVsFixedCad)}</td>
     <td style={td}>{n(r.enterpriseValueCad/1e6,1)} mln</td><td style={td}>{n(r.cumulativePreTaxCashFlowCad/1e6,1)} mln</td>
     <td style={td}>{n(r.totalCapexCad/1e6,1)} mln</td><td style={td}>{n(r.producedBoe/1e6,1)} mln boe</td>
     <td style={td}>{n(r.endingProductionBoeDay,0)} boe/d</td><td style={td}>{r.positiveCashFlowYears}/{AAV_V2_HYPOTHETICAL.forecastYears}</td>
    </tr>)}</tbody></table></div>
    <p style={sub}>* Hoogste hypothetische equitywaarde binnen vijf geteste strategieën; geen economisch bewezen optimale strategie. ¹ Vóór belastingen; kasstroom na capex, exclusief financiering. PV = contante waarde; cumulatief = niet-verdisconteerde som. Eindproductie is de modelproductiesnelheid aan het einde van de laatste gesimuleerde periode, niet een voorspelde AAV-productie.</p>
   </details>)}
   <p style={sub}>De economische investeringspoort en adaptieve investeringsladder zijn 5-jaars heuristieken, geen wereldwijd optimale oplossingen. De adaptieve ladder vergelijkt 0/25/50/75/100% van het capexplafond en de onderhoudsproxy, met een constant budget binnen elke vooruitblik en jaarlijkse herkeuze. De vergelijking houdt geen rekening met financieringsbeperkingen, contractverplichtingen, toekomstige boorkansen, belastingen, hedges, ontmanteling of terminal value. De vaste strategie blijft exact gelijk aan V3.</p>
  </section>
  <section style={{marginTop:30}}><h2>7. Marginale investeringsanalyse — Base</h2>
   <p>Wat levert een <strong>eenmalige extra investering in jaar 1</strong> op ten opzichte van volledig afbouwen? Beide paden krijgen daarna geen nieuwe capex. Dit is geen vergelijking met een doorlopend investeringsprogramma.</p>
   <div style={{...panel,overflowX:'auto'}}><table style={{width:'100%',minWidth:780,borderCollapse:'collapse'}}><thead><tr>
    {['Capex jaar 1','Werkelijk besteed','Extra productie','NPV 5 jaar','NPV volledige modelhorizon','Waarde ná jaar 5'].map(h=><th key={h} style={th}>{h}</th>)}
   </tr></thead><tbody>{marginal.rows.map(r=><tr key={r.firstYearCapexCad}>
    <td style={td}>{n(r.firstYearCapexCad/1e6,0)} mln</td><td style={td}>{n(r.actualFirstYearCapexCad/1e6,1)} mln</td>
    <td style={td}>{n(r.incrementalProductionBoe/1e6,2)} mln boe</td>
    <td style={td}>{n(r.fiveYearNpvCad/1e6,1)} mln</td><td style={{...td,fontWeight:700}}>{n(r.fullHorizonNpvCad/1e6,1)} mln</td>
    <td style={td}>{n(r.horizonDifferenceCad/1e6,1)} mln</td>
   </tr>)}</tbody></table></div>
   <p style={sub}>NPV = extra contante kasstroom ten opzichte van nul investeren, <strong>inclusief</strong> de eenmalige capex. De kolom ‘Waarde ná jaar 5’ is het verschil tussen de twee berekeningshorizonnen, geen terminal value. Negatieve extra productie in latere jaren is mogelijk door het gedeelde reserveplafond.</p>
   <details style={{...panel,marginTop:12}}><summary style={{cursor:'pointer'}}>Bekijk jaarlijkse marginale kasstromen per investeringsbedrag</summary>
    {marginal.rows.filter(r=>r.firstYearCapexCad>0).map(r=><details key={r.firstYearCapexCad} style={{marginTop:12}}><summary style={{cursor:'pointer'}}>C$ {n(r.firstYearCapexCad/1e6,0)} mln in jaar 1</summary><div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:690,borderCollapse:'collapse'}}><thead><tr>{['Jaar','Productie zonder capex','Productie met capex','Extra productie','Extra kasstroom','PV extra kasstroom'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{r.years.map(y=><tr key={y.year}><td style={td}>{y.year}</td><td style={td}>{n(y.baselineProductionBoe/1e6,2)}</td><td style={td}>{n(y.investmentProductionBoe/1e6,2)}</td><td style={td}>{n(y.incrementalProductionBoe/1e6,2)}</td><td style={td}>{n(y.incrementalCashFlowCad/1e6,1)}</td><td style={td}>{n(y.discountedIncrementalCashFlowCad/1e6,1)}</td></tr>)}</tbody></table></div></details>)}
   </details>
   <p style={sub}>{marginal.warning} Alle inputs zijn hypothetisch. De officiële waardering blijft geblokkeerd.</p>
  </section>
  <section style={{marginTop:30}}><h2>8. Bewijskwaliteit — vijf unieke aandachtspunten</h2>
   <p>Wat al bekend is, wordt niet opnieuw onderzocht. Managementverwachtingen en historische cijfers worden niet als bevestigde post-sale realisaties gepresenteerd.</p>
   <div style={{display:'grid',gap:12}}>{AAV_REQUIREMENTS.map(req=><details key={req.id} style={panel}><summary style={{cursor:'pointer',fontWeight:700}}>{req.title} — nog te onderbouwen</summary>
    <p>{req.description}</p><p><strong>Bekend:</strong> {req.known}</p><p><strong>Nog nodig:</strong> {req.needed}</p><p><strong>Gevolg:</strong> {req.consequence}</p>
    <ul>{evidenceForRequirement(req).map(item=><li key={item.id}>{item.label}: {item.value===null?'ontbreekt':`${n(item.value,3)} ${item.unit}`} ({item.status}, {item.asOf}) {item.sourceUrl?<a href={item.sourceUrl} target='_blank' rel='noopener noreferrer'>Bron ↗</a>:null}</li>)}</ul>
   </details>)}</div>
  </section>
  <section style={{marginTop:30}}><h2>9. Technische controles en bronnen</h2>
   <details style={panel}><summary style={{cursor:'pointer'}}>Open volledige technische validatie en bewijsregister</summary>
    <p>{strict.errors.length} oorspronkelijke controles; {ledgerErrors.length} ledger-validatiefouten.</p>
    <ul>{strict.errors.map((error,i)=><li key={i}><code>{error}</code></li>)}</ul>
    {ledgerErrors.length>0&&<p>Validatiefouten: {ledgerErrors.join('; ')}</p>}
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={{...th,textAlign:'left'}}>Gegeven</th><th style={th}>Waarde</th><th style={th}>Datum</th><th style={th}>Status</th><th style={th}>Bron</th></tr></thead><tbody>{AAV_EVIDENCE_LEDGER.map(x=><tr key={x.id}><td style={{...td,textAlign:'left'}}>{x.label}</td><td style={td}>{x.value===null?'Ontbreekt':`${n(x.value,3)} ${x.unit}`}</td><td style={td}>{x.asOf}</td><td style={td}>{x.status}</td><td style={td}>{x.sourceUrl?<a href={x.sourceUrl} target='_blank' rel='noopener noreferrer'>Open ↗</a>:'—'}</td></tr>)}</tbody></table></div>
   </details>
  </section>
  <section style={{...panel,marginTop:28}}><h2>Modelgrenzen</h2><p>Fictief reservebudget: {n(AAV_V2_HYPOTHETICAL.recoverableBudgetBoe/1e6,0)} mln boe · natuurlijke decline: {n(AAV_V2_HYPOTHETICAL.naturalDeclineRate*100,0)}% · ontwikkeling: {cad(AAV_V2_HYPOTHETICAL.developmentCadPerFlowingBoeDay)} per boe/d. Dit zijn geen gevalideerde AAV-cijfers.</p><p><Link href='/valuation/advantage-energy/v3'>Historische V3-weergave →</Link></p></section>
 </main>;
}
