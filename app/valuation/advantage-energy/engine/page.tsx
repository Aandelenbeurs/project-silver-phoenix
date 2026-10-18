import Link from 'next/link';
import type { Metadata } from 'next';
import { AAV_EVIDENCE_LEDGER, validateAavEvidenceLedger } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-evidence-ledger';
import { calculateAavV3 } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v3';
import { AAV_V2_HYPOTHETICAL } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v2';
import { AAV_ILLUSTRATIVE_SCENARIOS, runAdvantageEnergyScenarios } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
import { evaluateClaimBackedAdvantageReadiness } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-claim-readiness';
export const metadata: Metadata = { title: 'AAV | Phoenix Valuation Engine' };
const n = (x:number, decimals=2) => new Intl.NumberFormat('nl-NL',{maximumFractionDigits:decimals}).format(x);
const cad = (x:number) => new Intl.NumberFormat('nl-NL',{style:'currency',currency:'CAD',maximumFractionDigits:2}).format(x);
const panel = {border:'1px solid #64748b55',borderRadius:12,padding:18} as const;
export default function AavEnginePage() {
 const strict = runAdvantageEnergyScenarios();
 const readiness = evaluateClaimBackedAdvantageReadiness();
 const research = calculateAavV3();
 const ledgerErrors = validateAavEvidenceLedger();
 const missing = AAV_EVIDENCE_LEDGER.filter(x=>x.status==='unverified');
 const checks = Object.entries(readiness.checks);
 return <main style={{maxWidth:1160,margin:'0 auto',padding:'24px 16px'}}>
  <p><Link href='/sectors/canadian-natural-gas'>← Canadian Natural Gas</Link></p>
  <h1>Phoenix Valuation Engine — Advantage Energy</h1>
  <p>Één centrale onderzoeksweergave: hergebruik van bestaande AAV-bewijzen, V3-productieprojectie en de onafhankelijke strikte validatiepoort.</p>
  <section style={{...panel,margin:'20px 0'}}><h2>Waarderingsstatus: {strict.status==='blocked'?'niet vrijgegeven':'illustratief'}</h2>
   <p><strong>{checks.filter(([,ok])=>ok).length}/{checks.length}</strong> readiness-controles geslaagd · <strong>{missing.length}</strong> expliciet ontbrekende gegevens · <strong>{ledgerErrors.length}</strong> ledger-validatiefouten.</p>
   <p>De getoonde scenario-uitkomsten zijn <strong>hypothetische modelproeven</strong>, geen koersdoelen, fair values of koopadviezen. De strikte waardering blijft onafhankelijk geblokkeerd zolang vereiste post-sale bewijsstukken ontbreken.</p>
   {strict.status==='blocked'&&<details><summary>Toon blokkades ({strict.errors.length})</summary><ul>{strict.errors.map((e,i)=><li key={i}>{e}</li>)}</ul></details>}
   {ledgerErrors.length>0&&<p>Ledger-fouten: {ledgerErrors.join('; ')}</p>}
  </section>
  <h2>Scenario's — reservebegrensde V3 researchmotor</h2>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:14,margin:'16px 0 26px'}}>
   {research.map(r=>{const s=AAV_ILLUSTRATIVE_SCENARIOS.find(x=>x.name===r.name)!;return <article key={r.name} style={panel}>
    <h3 style={{textTransform:'capitalize'}}>{r.name}</h3><p style={{fontSize:28,fontWeight:700}}>{cad(r.modelValuePerShareCad)}</p>
    <p>Model-equity per proxy-aandeel, niet de beurskoers.</p><p>Gas {cad(s.gasPriceCadPerMcf)}/Mcf · capex {n(s.annualCapexCad/1e6,0)} mln CAD/jaar</p>
    <p>PV kasstromen {n(r.enterpriseValueCad/1e6,1)} mln CAD · productie {n(r.producedBoe/1e6,1)} mln boe</p>
   </article>})}
  </div>
  <section style={panel}><h2>Modelbeperkingen</h2>
   <p>Fictief reservebudget {n(AAV_V2_HYPOTHETICAL.recoverableBudgetBoe/1e6,0)} mln boe; decline {n(AAV_V2_HYPOTHETICAL.naturalDeclineRate*100,0)}%; ontwikkeling {cad(AAV_V2_HYPOTHETICAL.developmentCadPerFlowingBoeDay)} per boe/d. Niet gevalideerd als actuele AAV-data. Geen belasting, hedges, ontmanteling of terminal value.</p>
   <p><Link href='/valuation/advantage-energy/v3'>Historische V2/V3-vergelijking →</Link></p>
  </section>
  <h2 style={{marginTop:30}}>Centraal bewijsregister</h2>
  <p>Waarden komen uit bestaande projectbestanden. Historische cijfers, transacties, verwachtingen en proxies blijven gescheiden.</p>
  <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={{textAlign:'left'}}>Gegeven</th><th style={{textAlign:'right'}}>Waarde</th><th>Peildatum</th><th>Status</th><th>Bron</th></tr></thead><tbody>
   {AAV_EVIDENCE_LEDGER.map(x=><tr key={x.id} style={{borderTop:'1px solid #64748b55'}}><td style={{padding:'10px 8px'}}><strong>{x.label}</strong><div style={{fontSize:12,opacity:.75}}>{x.note}</div></td><td style={{textAlign:'right',whiteSpace:'nowrap'}}>{x.value===null?'Ontbreekt':`${n(x.value,3)} ${x.unit}`}</td><td style={{padding:8}}>{x.asOf}</td><td style={{padding:8}}>{x.status}</td><td style={{padding:8}}>{x.sourceUrl?<a href={x.sourceUrl} target='_blank' rel='noopener noreferrer'>Open</a>:'—'}</td></tr>)}
  </tbody></table></div>
  <h2 style={{marginTop:30}}>Scenariojaarstromen</h2>
  {research.map(r=><details key={r.name} style={{margin:'12px 0'}}><summary style={{cursor:'pointer',textTransform:'capitalize'}}>{r.name}</summary><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'right'}}><thead><tr><th>Jaar</th><th>Jaarfractie</th><th>Productie mln boe</th><th>Capex mln CAD</th><th>Pre-tax CF mln CAD</th><th>PV mln CAD</th></tr></thead><tbody>{r.years.map(y=><tr key={y.year}><td>{y.year}</td><td>{n(y.operatingYearFraction,3)}</td><td>{n(y.producedBoe/1e6)}</td><td>{n(y.capexCad/1e6)}</td><td>{n(y.preTaxCashFlowCad/1e6)}</td><td>{n(y.discountedCashFlowCad/1e6)}</td></tr>)}</tbody></table></div></details>)}
 </main>;
}
