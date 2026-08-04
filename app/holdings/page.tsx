import SelectionBadge, {
  type SelectionGroup,
} from "../../components/SelectionBadge";

import {
  getLivePortfolio,
  type ValuedPortfolioPosition,
} from "../../data/portfolio-engine";

import {
  formatEur,
  formatPercent,
} from "../../data/prices";

function adviceToSelectionGroup(
  position: ValuedPortfolioPosition,
): SelectionGroup {
  if (position.advice === "NOG BEOORDELEN") {
    return "Nog beoordelen";
  }

  if (position.advice === "APART") {
    return "Apart";
  }

  if (position.advice === "UITSTAPPEN") {
    return "Uitstappen / watchlist";
  }

  if (
    position.advice === "AFBOUWEN" ||
    position.advice === "NIET BIJKOPEN"
  ) {
    return "Afbouwen";
  }

  if (position.status === "core") {
    return "Kernpositie";
  }

  return "Behouden";
}

function formatLocalPrice(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatQuantity(
  value: number,
): string {
  return value.toLocaleString("nl-NL", {
    maximumFractionDigits: 6,
  });
}

export default async function HoldingsPage() {
  const portfolio = await getLivePortfolio();

  const rows = [...portfolio.positions].sort((a, b) => {
    const valueDifference =
      (b.marketValueEur ?? -1) -
      (a.marketValueEur ?? -1);

    if (valueDifference !== 0) {
      return valueDifference;
    }

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
    <>
      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">
            Totale portefeuille
          </span>

          <strong className="stat-value">
            {formatEur(
              portfolio.totals.totalMarketValueEur,
            )}
          </strong>

          <small className="stat-detail">
            {portfolio.totals.pricedPositions} posities geprijsd
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            Aandelenwaarde
          </span>

          <strong className="stat-value">
            {formatEur(
              portfolio.totals.equityValueEur,
            )}
          </strong>

          <small className="stat-detail">
            Individuele mijnbouwaandelen
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            ETF / ETC
          </span>

          <strong className="stat-value">
            {formatEur(
              portfolio.totals.etfValueEur,
            )}
          </strong>

          <small className="stat-detail">
            Zilverproducten en miners-ETF
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            Fysiek zilver
          </span>

          <strong className="stat-value">
            {formatEur(
              portfolio.totals.physicalValueEur,
            )}
          </strong>

          <small className="stat-detail">
            404 gram
          </small>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              LIVE HOLDINGS
            </p>

            <h2>Alle huidige posities</h2>

            <p>
              Gesorteerd op actuele marktwaarde. Koersen,
              valutaconversie, allocatie en advies worden live
              berekend.
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
                <th>Koers</th>
                <th>Valuta</th>
                <th>Waarde</th>
                <th>Actueel</th>
                <th>Doel</th>
                <th>Verschil</th>
                <th>Dag</th>
                <th>Score</th>
                <th>Tier</th>
                <th>Advies</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((position) => {
                const group =
                  adviceToSelectionGroup(position);

                return (
                  <tr key={position.id}>
                    <td className="rank-cell">
                      {position.rank !== null
                        ? `#${position.rank}`
                        : "—"}
                    </td>

                    <td>
                      <strong>{position.name}</strong>

                      <small className="cell-subtitle">
                        {position.holding.type === "equity"
                          ? position.company?.commodity ?? "onbekend"
                          : position.holding.type === "etf"
                            ? "ETF / ETC"
                            : "Fysiek"}
                      </small>
                    </td>

                    <td>{position.ticker ?? "—"}</td>

                    <td>
                      {formatQuantity(position.quantity)}
                    </td>

                    <td>
                      {formatLocalPrice(
                        position.localPrice,
                      )}
                    </td>

                    <td>{position.currency}</td>

                    <td>
                      {formatEur(
                        position.marketValueEur,
                      )}
                    </td>

                    <td>
                      {formatPercent(
                        position.currentAllocation,
                      )}
                    </td>

                    <td>
                      {position.isEquity
                        ? `${position.targetAllocation.toFixed(
                            1,
                          )}%`
                        : "—"}
                    </td>

                    <td>
                      {position.allocationDifference !== null
                        ? `${position.allocationDifference.toFixed(
                            2,
                          )}%`
                        : "—"}
                    </td>

                    <td>
                      {formatPercent(
                        position.quote.dayChangePercent,
                      )}
                    </td>

                    <td className="score-cell">
                      {position.masterScore !== null
                        ? position.masterScore.toFixed(1)
                        : "—"}
                    </td>

                    <td>{position.tier}</td>

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