import Link from "next/link";

import StatCard from "../components/StatCard";

import SelectionBadge, {
  type SelectionGroup,
} from "../components/SelectionBadge";

import {
  corePositions,
  keepPositions,
  reducePositions,
  exitPositions,
  reviewPositions,
  equityPositions,
  rankedCompanies,
} from "../data/portfolio";

export default function DashboardPage() {
  const targetPortfolio = [
    ...corePositions,
    ...keepPositions,
  ];

  const averageScore =
    rankedCompanies.length > 0
      ? rankedCompanies.reduce(
          (sum, company) =>
            sum + (company.masterScore ?? 0),
          0,
        ) / rankedCompanies.length
      : 0;

  const selectionSummary: {
    group: SelectionGroup;
    count: number;
  }[] = [
    {
      group: "Kernpositie",
      count: corePositions.length,
    },
    {
      group: "Behouden",
      count: keepPositions.length,
    },
    {
      group: "Afbouwen",
      count: reducePositions.length,
    },
    {
      group: "Uitstappen / watchlist",
      count: exitPositions.length,
    },
    {
      group: "Nog beoordelen",
      count: reviewPositions.length,
    },
  ];

  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">
            PORTEFEUILLE IN ÉÉN OOGOPSLAG
          </p>

          <h2>
            Van {equityPositions.length} aandelen naar
            een doelportefeuille van 20–25 sterke posities.
          </h2>

          <p>
            Het dashboard gebruikt jouw huidige holdings en
            Ultimate Master Ranking v3.0 als centrale basis.
          </p>
        </div>

        <Link
          className="primary-button"
          href="/optimizer"
        >
          Open optimizer →
        </Link>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Individuele aandelen"
          value={equityPositions.length}
          detail="ETF en fysiek apart"
        />

        <StatCard
          label="Kern + behouden"
          value={targetPortfolio.length}
          detail="Binnen de doelportefeuille"
          tone="green"
        />

        <StatCard
          label="Gemiddelde score"
          value={averageScore.toFixed(1)}
          detail="Van alle gerangschikte bedrijven"
          tone="gold"
        />

        <StatCard
          label="Afbouwen / uitstappen"
          value={
            reducePositions.length +
            exitPositions.length
          }
          detail="Lagere prioriteit"
          tone="red"
        />

        <StatCard
          label="Nog beoordelen"
          value={reviewPositions.length}
          detail="Geen automatisch advies"
          tone="gold"
        />
      </section>

      <section className="content-grid two-columns">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SELECTIE</p>

              <h3>Portefeuillevereenvoudiging</h3>
            </div>
          </div>

          <div className="selection-grid">
            {selectionSummary.map(
              ({ group, count }) => (
                <div
                  className="selection-summary"
                  key={group}
                >
                  <SelectionBadge group={group} />

                  <strong>{count}</strong>
                </div>
              ),
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">TOP 5</p>

              <h3>Hoogste overtuiging</h3>
            </div>

            <Link href="/ranking">
              Volledige ranking
            </Link>
          </div>

          <ol className="top-list">
            {rankedCompanies
              .slice(0, 5)
              .map((company) => (
                <li key={company.id}>
                  <span className="rank-number">
                    {company.rank}
                  </span>

                  <div>
                    <strong>{company.name}</strong>

                    <small>
                      Tier {company.tier} · doel{" "}
                      {company.targetAllocation.toFixed(1)}%
                    </small>
                  </div>

                  <b>
                    {company.masterScore?.toFixed(1)}
                  </b>
                </li>
              ))}
          </ol>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              KERNSELECTIE
            </p>

            <h3>
              Phoenix 20 – eerste overzicht
            </h3>
          </div>

          <Link href="/holdings">
            Alle holdings
          </Link>
        </div>

        <div className="compact-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Bedrijf</th>
                <th>Commodity</th>
                <th>Score</th>
                <th>Doel</th>
                <th>Selectie</th>
              </tr>
            </thead>

            <tbody>
              {rankedCompanies
                .slice(0, 20)
                .map((company) => {
                  const group: SelectionGroup =
                    company.status === "core"
                      ? "Kernpositie"
                      : company.status === "keep"
                        ? "Behouden"
                        : company.status === "reduce"
                          ? "Afbouwen"
                          : company.status === "review"
                            ? "Nog beoordelen"
                            : "Uitstappen / watchlist";

                  return (
                    <tr key={company.id}>
                      <td>#{company.rank}</td>

                      <td>
                        <strong>
                          {company.name}
                        </strong>
                      </td>

                      <td>
                        {company.commodity}
                      </td>

                      <td className="score-cell">
                        {company.masterScore?.toFixed(1)}
                      </td>

                      <td>
                        {company.targetAllocation.toFixed(1)}%
                      </td>

                      <td>
                        <SelectionBadge
                          group={group}
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}