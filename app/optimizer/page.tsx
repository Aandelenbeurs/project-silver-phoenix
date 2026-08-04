import StatCard from '../../components/StatCard';
import SelectionBadge, { selectionGroup } from '../../components/SelectionBadge';
import { holdings } from '../../data/portfolio';

export default function OptimizerPage() {
  const stocks = holdings.filter((h) => !['ETF', 'Fysiek'].includes(h.category));
  const grouped = stocks.map((h) => ({ ...h, group: selectionGroup(h.score, h.category) }));
  const keep = grouped.filter((h) => ['Kernpositie', 'Behouden'].includes(h.group));
  const reduce = grouped.filter((h) => h.group === 'Afbouwen');
  const exit = grouped.filter((h) => h.group === 'Uitstappen / watchlist');

  return (
    <>
      <section className="stats-grid">
        <StatCard label="Huidige aandelenposities" value={stocks.length} />
        <StatCard label="Doelportefeuille" value="20–25" tone="gold" />
        <StatCard label="Kern + behouden" value={keep.length} tone="green" />
        <StatCard label="Te beoordelen" value={reduce.length + exit.length} tone="red" />
      </section>
      <section className="content-grid two-columns optimizer-grid">
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">BEHOUDEN</p><h3>Doelportefeuille</h3></div></div><div className="company-list">{keep.sort((a,b)=>(a.rank??999)-(b.rank??999)).map(h=><div className="company-row" key={h.name}><div><strong>#{h.rank} {h.name}</strong><small>Score {h.score?.toFixed(1)} · doel {((h.target??0)*100).toFixed(1)}%</small></div><SelectionBadge group={h.group}/></div>)}</div></article>
        <div className="stacked-panels"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">AFBOUWEN</p><h3>Klein houden of reduceren</h3></div></div><div className="company-list compact">{reduce.map(h=><div className="company-row" key={h.name}><div><strong>{h.name}</strong><small>Score {h.score?.toFixed(1)}</small></div><SelectionBadge group={h.group}/></div>)}</div></article><article className="panel"><div className="panel-heading"><div><p className="eyebrow">UITSTAPPEN</p><h3>Watchlist / verkoopkandidaten</h3></div></div><div className="company-list compact">{exit.map(h=><div className="company-row" key={h.name}><div><strong>{h.name}</strong><small>Score {h.score?.toFixed(1)}</small></div><SelectionBadge group={h.group}/></div>)}</div></article></div>
      </section>
    </>
  );
}
