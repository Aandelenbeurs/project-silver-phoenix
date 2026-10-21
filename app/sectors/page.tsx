import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sectoren | Phoenix Portfolio' };
const sectors = [
  { name: 'Precious Metals', detail: 'Goud en zilver', href: '/ranking', ready: true },
  { name: 'Canadian Natural Gas', detail: 'Canadese aardgasproducenten', href: '/sectors/canadian-natural-gas', ready: true },
  { name: 'Uranium', detail: 'In voorbereiding', href: '', ready: false },
  { name: 'Copper', detail: 'In voorbereiding', href: '', ready: false },
];
export default function SectorsPage() {
  return <div style={{maxWidth:1100,margin:'0 auto',padding:'24px 16px'}}>
    <h1>Sectoren</h1>
    <p><Link href="/research" style={{color:"var(--gold-bright)",textDecoration:"underline"}}>Onderzoekscentrum: bronkwaliteit, methodologie en twee sectoren →</Link></p>
    <p>Sectoranalyses op één plek. De Optimizer en Master Ranking blijven in het hoofdmenu.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16}}>
      {sectors.map(s=><section key={s.name} style={{border:'1px solid #64748b55',borderRadius:12,padding:20}}>
        <h2>{s.name}</h2><p>{s.detail}</p>
        {s.ready?<Link href={s.href}>Open sector →</Link>:<small>Volgt later</small>}
      </section>)}
    </div>
    <p style={{opacity:.7,marginTop:24}}>Precious Metals verwijst voorlopig naar de bestaande Master Ranking. De sectorindeling wordt stapsgewijs uitgebreid.</p>
  </div>;
}
