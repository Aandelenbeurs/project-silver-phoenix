import Link from 'next/link';
import StatCard from '../components/StatCard';
import SelectionBadge, { selectionGroup } from '../components/SelectionBadge';
import { holdings } from '../data/portfolio';

export default function DashboardPage() {
  const stocks = holdings.filter((h) => !['ETF', 'Fysiek'].includes(h.category));
  const ranked = stocks.filter((h) => h.rank).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const core = stocks.filter((h) => selectionGroup(h.score, h.category) === 'Kernpositie');
  const keep = stocks.filter((h) => selectionGroup(h.score, h.category) === 'Behouden');
  const reduce = stocks.filter((h) => selectionGroup(h.score, h.category) === 'Afbouwen');
  const exit = stocks.filter((h) => selectionGroup(h.score, h.category) === 'Uitstappen / watchlist');
  const averageScore = ranked.reduce((sum, h) => sum + (h.score ?? 0), 0) / ranked.length;

  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">PORTEFEUILLE IN ÉÉN OOGOPSLAG</p>
          <h2>Van 45 aandelen naar een doelportefeuille van 20–25 sterke posities.</h2>
          <p>Deze eerste sprint gebruikt jouw holdings en Ultimate Master Ranking v3.0 als vaste basis.</p>
        </div>
        <Link className="primary-button" href="/optimizer">Open optimizer →</Link>
      </section>

      <section className="stats-grid">
        <StatCard label="Individuele aandelen" value={stocks.length} detail="ETF en fysiek apart" />
        <StatCard label="Kern + behouden" value={core.length + keep.length} detail="Binnen doelbereik" tone="green" />
        <StatCard label="Gemiddelde score" value={averageScore.toFixed(1)} detail="Van gerangschikte posities" tone="gold" />
        <StatCard label="Reviewkandidaten" value={reduce.length + exit.length} detail="Afbouwen of uitstappen" tone="red" />
      </section>

      <section className="content-grid two-columns">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">SELECTIE</p><h3>Portefeuillevereenvoudiging</h3></div></div>
          <div className="selection-grid">
            {[
              ['Kernpositie', core.length],
              ['Behouden', keep.length],
              ['Afbouwen', reduce.length],
              ['Uitstappen / watchlist', exit.length],
            ].map(([group, count]) => (
              <div className="selection-summary" key={String(group)}>
                <SelectionBadge group={group as ReturnType<typeof selectionGroup>} />
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">TOP 5</p><h3>Hoogste overtuiging</h3></div><Link href="/ranking">Volledige ranking</Link></div>
          <ol className="top-list">
            {ranked.slice(0, 5).map((holding) => (
              <li key={holding.name}><span className="rank-number">{holding.rank}</span><div><strong>{holding.name}</strong><small>{holding.tier} · doel {((holding.target ?? 0) * 100).toFixed(1)}%</small></div><b>{holding.score?.toFixed(1)}</b></li>
            ))}
          </ol>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">KERNSELECTIE</p><h3>Phoenix 20 – eerste overzicht</h3></div><Link href="/holdings">Alle holdings</Link></div>
        <div className="compact-table-wrap">
          <table className="data-table">
            <thead><tr><th>Rang</th><th>Bedrijf</th><th>Commodity</th><th>Score</th><th>Doel</th><th>Selectie</th></tr></thead>
            <tbody>{ranked.slice(0, 20).map((h) => <tr key={h.name}><td>#{h.rank}</td><td><strong>{h.name}</strong></td><td>{h.category}</td><td className="score-cell">{h.score?.toFixed(1)}</td><td>{((h.target ?? 0) * 100).toFixed(1)}%</td><td><SelectionBadge group={selectionGroup(h.score, h.category)} /></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
