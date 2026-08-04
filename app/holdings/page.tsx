import SelectionBadge, {
  selectionGroup,
  type SelectionGroup,
} from "../../components/SelectionBadge";

import {
  portfolioPositions,
} from "../../data/portfolio";

export default function HoldingsPage() {
  const rows = [...portfolioPositions].sort((a, b) => {
    if (a.rank === null && b.rank === null) {
      return a.name.localeCompare(b.name);
    }

    if (a.rank === null) {
      return 1;
    }

    if (b.rank === null) {
      return -1;
    }

    return a.rank - b.rank;
  });

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">DATABASE</p>

          <h2>Alle huidige posities</h2>

          <p>
            Broker-aantallen zijn samengevoegd en fractionele aandelen
            zijn behouden. ETF’s en fysiek zilver worden apart behandeld.
          </p>
        </div>
      </div>

      <div className="compact-table-wrap">
        <table className="data-table wide-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Bedrijf</th>
              <th>Ticker</th>
              <th>Aantal</th>
              <th>Type</th>
              <th>Metaal</th>
              <th>Score</th>
              <th>Tier</th>
              <th>Doel</th>
              <th>Maximum</th>
              <th>Selectie</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((position) => {
              const commodity =
                position.company?.commodity ?? "apart";

              const group: SelectionGroup =
                position.status === "review"
                  ? "Nog beoordelen"
                  : position.status === "separate"
                    ? "Apart"
                    : selectionGroup(
                        position.masterScore ?? undefined,
                        commodity,
                      );

              return (
                <tr key={position.id}>
                  <td className="rank-cell">
                    {position.rank !== null
                      ? `#${position.rank}`
                      : "—"}
                  </td>

                  <td>
                    <strong>{position.name}</strong>

                    {!position.hasValidScore &&
                      position.isEquity && (
                        <small className="cell-subtitle">
                          Nog beoordelen
                        </small>
                      )}
                  </td>

                  <td>{position.ticker ?? "—"}</td>

                  <td>
                    {position.quantity.toLocaleString("nl-NL", {
                      maximumFractionDigits: 6,
                    })}
                  </td>

                  <td>
                    {position.holding.type === "equity"
                      ? "Aandeel"
                      : position.holding.type === "etf"
                        ? "ETF / ETC"
                        : "Fysiek"}
                  </td>

                  <td>{commodity}</td>

                  <td className="score-cell">
                    {position.masterScore !== null
                      ? position.masterScore.toFixed(1)
                      : "—"}
                  </td>

                  <td>{position.tier}</td>

                  <td>
                    {position.isEquity
                      ? `${position.targetAllocation.toFixed(1)}%`
                      : "—"}
                  </td>

                  <td>
                    {position.isEquity
                      ? `${position.maximumAllocation.toFixed(1)}%`
                      : "—"}
                  </td>

                  <td>
                    <SelectionBadge group={group} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}