import SelectionBadge, { selectionGroup } from '../../components/SelectionBadge';
import { holdings } from '../../data/portfolio';

export default function HoldingsPage() {
  const rows = [...holdings].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  return (
    <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">DATABASE</p><h2>Alle huidige posities</h2><p>Broker-aantallen zijn samengevoegd; fractionele aandelen zijn behouden.</p></div></div>
      <div className="compact-table-wrap">
        <table className="data-table wide-table">
          <thead><tr><th>Rang</th><th>Bedrijf</th><th>Ticker</th><th>Aantal</th><th>Categorie</th><th>Score</th><th>Tier</th><th>Doel</th><th>Max</th><th>Selectie</th></tr></thead>
          <tbody>{rows.map((h) => <tr key={`${h.name}-${h.ticker}`}><td>{h.rank ? `#${h.rank}` : '—'}</td><td><strong>{h.name}</strong></td><td>{h.ticker}</td><td>{h.shares.toLocaleString('nl-NL', { maximumFractionDigits: 6 })}</td><td>{h.category}</td><td className="score-cell">{h.score?.toFixed(1) ?? '—'}</td><td>{h.tier ?? '—'}</td><td>{h.target != null ? `${(h.target * 100).toFixed(1)}%` : '—'}</td><td>{h.max != null ? `${(h.max * 100).toFixed(1)}%` : '—'}</td><td><SelectionBadge group={selectionGroup(h.score, h.category)} /></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
