import StatCard from "../../components/StatCard";
import HoldingsTable from "../../components/HoldingsTable";

import {
  getLivePortfolio,
} from "../../data/portfolio-engine";

import {
  formatEur,
} from "../../data/prices";

export default async function HoldingsPage() {
  const portfolio = await getLivePortfolio();

  const {
    positions,
    totals,
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
    </>
  );
}