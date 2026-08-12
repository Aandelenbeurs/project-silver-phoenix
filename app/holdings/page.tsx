import StatCard from "../../components/StatCard";
import HoldingsTable from "../../components/HoldingsTable";

import {
  getLivePortfolio,
} from "../../data/portfolio-engine";

import {
  formatEur,
  formatPercent,
} from "../../data/prices";

export default async function HoldingsPage() {
  const portfolio = await getLivePortfolio();

  const {
    positions,
    totals,
    portfolioV2,
  } = portfolio;

  const equityPositions = positions.filter(
    (position) => position.isEquity,
  );

  return (
    <>
      <section className="stats-grid">
        <StatCard
          label="Totale portefeuille"
          value={formatEur(
            totals.totalMarketValueEur,
          )}
          detail={`${totals.pricedPositions} posities geprijsd`}
          tone="gold"
        />

        <StatCard
          label="Aandelenwaarde"
          value={formatEur(
            totals.equityValueEur,
          )}
          detail={`${equityPositions.length} individuele aandelen`}
        />

        <StatCard
          label="ETF / ETC"
          value={formatEur(
            totals.etfValueEur,
          )}
          detail="Zilverproducten en miners-ETF"
        />

        <StatCard
          label="Fysiek zilver"
          value={formatEur(
            totals.physicalValueEur,
          )}
          detail="404 gram"
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              LIVE HOLDINGS
            </p>

            <h2>Alle huidige posities</h2>

            <p>
              Zoek, filter en sorteer de portefeuille op
              marktwaarde, rang, score, allocatie en advies.
            </p>
          </div>
        </div>

        <HoldingsTable
          positions={positions}
        />
      </section>

      <section className="panel">
  <div className="panel-heading">
    <div>
      <p className="eyebrow">
        PHOENIX V2
      </p>

      <h2>
        Opportunity & allocatie
      </h2>

      <p>
        Phoenix V2 analyse per aandeel op basis van
        Opportunity Score, actuele weging en position sizing.
      </p>
    </div>
  </div>

  <div className="compact-table-wrap">
    <table className="data-table wide-table">
      <thead>
        <tr>
          <th>Bedrijf</th>
          <th>Opportunity</th>
          <th>Actueel</th>
          <th>Ideal band</th>
          <th>Hard max</th>
          <th>Allocation fit</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {portfolioV2.positions
          .sort(
            (a, b) =>
              b.marketValueEur -
              a.marketValueEur,
          )
          .map((position) => {
            const livePosition =
              positions.find(
                (item) =>
                  item.company?.id ===
                  position.companyId,
              );

            let allocationStatus =
              "Binnen band";

            if (
              position.opportunity === null
            ) {
              allocationStatus =
                "Nog niet gescoord";
            } else if (
              position.isAboveHardMax
            ) {
              allocationStatus =
                "BOVEN HARD MAX";
            } else if (
              position.isAboveIdeal
            ) {
              allocationStatus =
                "Boven ideal";
            } else if (
              position.isBelowIdeal
            ) {
              allocationStatus =
                "Onder ideal";
            }

            return (
              <tr key={position.companyId}>
                <td>
                  <strong>
                    {livePosition?.name ??
                      position.companyId}
                  </strong>
                </td>

                <td>
                  {position.opportunity !== null
                    ? position.opportunity.toFixed(
                        1,
                      )
                    : "—"}
                </td>

                <td>
                  {formatPercent(
                    position.allocationPercent,
                  )}
                </td>

                <td>
                  {position.idealMin !== null &&
                  position.idealMax !== null
                    ? `${position.idealMin.toFixed(
                        1,
                      )}% – ${position.idealMax.toFixed(
                        1,
                      )}%`
                    : "—"}
                </td>

                <td>
                  {position.hardMax !== null
                    ? `${position.hardMax.toFixed(
                        1,
                      )}%`
                    : "—"}
                </td>

                <td>
                  {position.allocationFitScore !== null
                    ? position.allocationFitScore.toFixed(
                        1,
                      )
                    : "—"}
                </td>

                <td>
                  <strong>
                    {allocationStatus}
                  </strong>
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