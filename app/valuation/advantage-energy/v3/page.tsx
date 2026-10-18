import Link from 'next/link';
import type { Metadata } from 'next';
import { calculateAavV2, AAV_V2_HYPOTHETICAL } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v2';
import { calculateAavV3 } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v3';
import { AAV_ILLUSTRATIVE_SCENARIOS } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
export const metadata: Metadata = { title: 'AAV V3 capex sensitivity | Phoenix Portfolio' };
const cad = (v: number) => new Intl.NumberFormat('nl-NL',{style:'currency',currency:'CAD',maximumFractionDigits:2}).format(v);
const number = (v: number, decimals=1) => new Intl.NumberFormat('nl-NL',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(v);
export default function AavV3Page() {
  const old = calculateAavV2();
  const next = calculateAavV3();
  return <main style={{maxWidth:1100,margin:'0 auto',padding:'24px 16px'}}>
    <p><Link href="/valuation/advantage-energy/v2">← V2 vergelijken</Link></p>
    <h1>AAV — V3 capex- en uitputtingsgevoeligheid</h1>
    <p><strong>Hypothetische modelproef, GEEN fair value, koersdoel of gevalideerde reserveberekening.</strong></p>
    <p>V2 rekent in het uitputtingsjaar met een volledig jaar capex. V3 modelleert de resterende fractie van het productiejaar en schaalt investeringen en toegevoegde capaciteit mee. Alle andere aannames blijven gelijk.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,margin:'22px 0'}}>
      {next.map(r => {const previous=old.find(x=>x.name===r.name)!;return <section key={r.name} style={{border:'1px solid #64748b66',borderRadius:12,padding:18}}>
        <h2 style={{textTransform:'capitalize'}}>{r.name}</h2>
        <p>V2: <strong>{cad(previous.modelValuePerShareCad)}</strong></p>
        <p>V3: <strong>{cad(r.modelValuePerShareCad)}</strong></p>
        <p>Verschil: {cad(r.modelValuePerShareCad-previous.modelValuePerShareCad)} per proxy-aandeel</p>
      </section>})}
    </div>
    <section style={{border:'1px solid #64748b66',borderRadius:12,padding:18}}>
      <h2>Beperkingen</h2>
      <p>Fictief productieplafond: {number(AAV_V2_HYPOTHETICAL.recoverableBudgetBoe/1e6,0)} mln boe; natuurlijke decline {number(AAV_V2_HYPOTHETICAL.naturalDeclineRate*100,0)}%; kapitaalefficiëntie {cad(AAV_V2_HYPOTHETICAL.developmentCadPerFlowingBoeDay)} per boe/d. Geen van deze drie is gevalideerd als actuele AAV-data na Wembley.</p>
      <p>V3 gebruikt een lineair productieprofiel en gelijkmatig verdeelde capex binnen het jaar. Dat is een transparante gevoeligheidsaanname, geen put-voor-put ontwikkelingsplan. Er zijn geen belastingen, hedges, ontmantelingskosten of geverifieerde reserves verwerkt. Er is geen terminale waarde. Negatieve modelwaarden zijn geen negatieve beurskoersen.</p>
    </section>
    <section style={{marginTop:24}}><h2>Jaarlijkse kasstromen — V3</h2>
      {next.map(r => {const s=AAV_ILLUSTRATIVE_SCENARIOS.find(x=>x.name===r.name)!;return <details key={r.name} style={{margin:'14px 0'}}>
        <summary style={{cursor:'pointer',textTransform:'capitalize'}}>{r.name} — gas {cad(s.gasPriceCadPerMcf)}/Mcf</summary>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'right'}}><thead><tr><th>Jaar</th><th>Jaarfractie</th><th>Productie mln boe</th><th>Restbudget mln boe</th><th>Capex mln CAD</th><th>Kasstroom mln CAD</th><th>PV mln CAD</th></tr></thead><tbody>
          {r.years.map(y=><tr key={y.year}><td>{y.year}</td><td>{number(y.operatingYearFraction,3)}</td><td>{number(y.producedBoe/1e6,2)}</td><td>{number(y.remainingBudgetBoe/1e6,2)}</td><td>{number(y.capexCad/1e6,1)}</td><td>{number(y.preTaxCashFlowCad/1e6,1)}</td><td>{number(y.discountedCashFlowCad/1e6,1)}</td></tr>)}
        </tbody></table></div>
      </details>})}
    </section>
    <p><Link href="/valuation/advantage-energy">Terug naar AAV basisanalyse →</Link></p>
  </main>;
}
