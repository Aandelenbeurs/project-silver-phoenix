import SelectionBadge, { selectionGroup } from '../../components/SelectionBadge';
import { holdings } from '../../data/portfolio';

export default function RankingPage() {
  const ranked = holdings.filter((h) => h.rank).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  return (
    <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">ULTIMATE MASTER RANKING v3.0</p><h2>Definitieve vergelijkingslijst</h2><p>Gerangschikt op assetkwaliteit, leverage, financieringsrisico, jurisdictie en portefeuillebelang.</p></div></div>
      <div className="compact-table-wrap">
        <table className="data-table">
          <thead><tr><th>Rang</th><th>Bedrijf</th><th>Score</th><th>Tier</th><th>Doel</th><th>Maximum</th><th>Selectiegroep</th></tr></thead>
          <tbody>{ranked.map((h) => <tr key={h.name}><td className="rank-cell">#{h.rank}</td><td><strong>{h.name}</strong><small className="cell-subtitle">{h.category}</small></td><td className="score-cell">{h.score?.toFixed(1)}</td><td>{h.tier}</td><td>{((h.target ?? 0) * 100).toFixed(1)}%</td><td>{((h.max ?? 0) * 100).toFixed(1)}%</td><td><SelectionBadge group={selectionGroup(h.score, h.category)} /></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
