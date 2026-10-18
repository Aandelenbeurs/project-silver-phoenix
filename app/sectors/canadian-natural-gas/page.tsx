import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Canadian Natural Gas | Phoenix Portfolio' };
export default function NaturalGasSectorPage() {
  return <div style={{maxWidth:1100,margin:'0 auto',padding:'24px 16px'}}>
    <p><Link href="/sectors">← Sectoren</Link></p>
    <h1>Canadian Natural Gas</h1>
    <p>Bedrijfsanalyses en onderzoekswaarderingen voor Canadese aardgasproducenten.</p>
    <section style={{border:'1px solid #64748b55',borderRadius:12,padding:20,maxWidth:580}}>
      <h2>Advantage Energy Ltd. (TSX: AAV)</h2>
      <p>Vier voorlopige researchscenario's, met afzonderlijke geverifieerde waarderingscontroles.</p>
      <Link href="/valuation/advantage-energy/engine">Open Phoenix Valuation Engine →</Link>
    </section>
  </div>;
}
