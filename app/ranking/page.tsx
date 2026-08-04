import SelectionBadge, {
  selectionGroup,
} from "../../components/SelectionBadge";

import {
  rankedCompanies,
} from "../../data/portfolio";

export default function RankingPage() {
  const ranked = rankedCompanies;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            ULTIMATE MASTER RANKING v3.0
          </p>

          <h2>Definitieve vergelijkingslijst</h2>

          <p>
            Gerangschikt op assetkwaliteit, leverage,
            financieringsrisico, jurisdictie en portefeuillebelang.
          </p>
        </div>
      </div>

      <div className="compact-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Bedrijf</th>
              <th>Score</th>
              <th>Tier</th>
              <th>Doel</th>
              <th>Maximum</th>
              <th>Selectiegroep</th>
            </tr>
          </thead>

          <tbody>
            {ranked.map((company) => (
              <tr key={company.id}>
                <td className="rank-cell">
                  #{company.rank}
                </td>

                <td>
                  <strong>{company.name}</strong>

                  <small className="cell-subtitle">
                    {company.commodity}
                  </small>
                </td>

                <td className="score-cell">
                  {company.masterScore?.toFixed(1)}
                </td>

                <td>{company.tier}</td>

                <td>
                  {company.targetAllocation.toFixed(1)}%
                </td>

                <td>
                  {company.maximumAllocation.toFixed(1)}%
                </td>

                <td>
                  <SelectionBadge
                    group={selectionGroup(
                      company.masterScore ?? undefined,
                      company.commodity,
                    )}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}