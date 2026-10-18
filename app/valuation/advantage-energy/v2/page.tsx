import Link from 'next/link';
import type { Metadata } from 'next';
import { AAV_V2_HYPOTHETICAL, calculateAavV2 } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v2';
import { AAV_ILLUSTRATIVE_SCENARIOS } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
import { AAV_RESEARCH_INPUTS } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-research-valuation';

export const metadata: Metadata = { title: 'AAV V2 gevoeligheidsanalyse | Phoenix Portfolio' };
const money = (v: number) => new Intl.NumberFormat('nl-NL', {style:'currency',currency:'CAD',minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const num = (v: number) => new Intl.NumberFormat('nl-NL',{maximumFractionDigits:0}).format(v);
export default function AdvantageV2Page() {
  const results = calculateAavV2();
  return <main style={{maxWidth:1100,margin:'0 auto',padding:'24px 16px'}}>
    <p><Link href="/valuation/advantage-energy">← AAV basisanalyse</Link></p>
    <h1>AAV — V2 productie- en reservegevoeligheid</h1>
    <p><strong>Hypothetische modelproef — geen fair value, koersdoel of gevalideerde reserves.</strong></p>
    <p>In tegenstelling tot de vijfjaars-DCF koppelt dit model jaarlijkse capex aan toegevoegde productiecapaciteit en stopt de productie zodra het aangenomen productievolume is uitgeput.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,margin:'24px 0'}}>
      {results.map(r => <section key={r.name} style={{border:'1px solid #64748b66',borderRadius:12,padding:18}}>
        <h2 style={{textTransform:'capitalize'}}>{r.name}</h2>
        <p style={{fontSize:26,fontWeight:700}}>{money(r.modelValuePerShareCad)}</p>
        <p style={{fontSize:12}}>Illustratieve equity-modelwaarde per proxy-aandeel, geen toekomstige koers of stijging.</p>
        <p style={{fontSize:13}}>Productie: {num(r.producedBoe/1_000_000)} mln boe · {r.years.length} jaren</p>
      </section>)}
    </div>
    <section style={{border:'1px solid #64748b66',borderRadius:12,padding:20}}>
      <h2>Expliciete, niet-gevalideerde aannames</h2>
      <ul>
        <li>Fictief productieplafond: {num(AAV_V2_HYPOTHETICAL.recoverableBudgetBoe/1_000_000)} miljoen boe. <strong>Dit is NIET AAV's bewezen of 2P-reserve na Wembley.</strong></li>
        <li>Natuurlijke productiedaling: {num(AAV_V2_HYPOTHETICAL.naturalDeclineRate*100)}% per jaar, vóór nieuwe putten.</li>
        <li>Kapitaalefficiëntie: {money(AAV_V2_HYPOTHETICAL.developmentCadPerFlowingBoeDay)} per extra boe/d capaciteit, aangenomen.</li>
        <li>Looptijd: maximaal {AAV_V2_HYPOTHETICAL.forecastYears} jaar; geen terminale waarde.</li>
        <li>Startproductie: {num(AAV_RESEARCH_INPUTS.productionBoePerDay)} boe/d (Q4-guidance-proxy); nettoschuld en aandelen zijn eveneens proxies.</li>
      </ul>
      <p>Beperkingen: geen belastingen, hedges, financieringskosten, ontmantelingskosten, timing van putten, decline-curves per put of externe reservevalidatie. Productie wordt binnen een jaar benaderd met het gemiddelde van begin- en eindcapaciteit; in het uitputtingsjaar wordt het volume begrensd.</p>
    </section>
    <section style={{marginTop:24}}><h2>Kasstromen en modelparameters</h2>
      {results.map(r => {const s=AAV_ILLUSTRATIVE_SCENARIOS.find(x=>x.name===r.name)!;return <details key={r.name} style={{margin:'12px 0'}}>
        <summary style={{cursor:'pointer',textTransform:'capitalize'}}>{r.name} — gas {money(s.gasPriceCadPerMcf)}/Mcf, capex {money(s.annualCapexCad/1_000_000)} mln/jaar</summary>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'right',borderCollapse:'collapse'}}><thead><tr><th>Jaar</th><th>Gem. boe/d</th><th>Productie mln boe</th><th>Restbudget mln boe</th><th>Kasstroom mln CAD</th><th>PV mln CAD</th></tr></thead><tbody>
          {r.years.map(y=><tr key={y.year}><td>{y.year}</td><td>{num(y.averageProductionBoeDay)}</td><td>{(y.producedBoe/1e6).toFixed(2)}</td><td>{(y.remainingBudgetBoe/1e6).toFixed(2)}</td><td>{(y.preTaxCashFlowCad/1e6).toFixed(1)}</td><td>{(y.discountedCashFlowCad/1e6).toFixed(1)}</td></tr>)}
        </tbody></table></div>
      </details>})}
    </section>
    <p style={{marginTop:24}}><Link href="/valuation/advantage-energy">Terug naar geverifieerde controles →</Link></p>
  </main>;
}
