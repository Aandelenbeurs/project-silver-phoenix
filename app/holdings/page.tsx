import {
  buildPhoenixScenarioRanking,
} from "../../data/scenario-upside";

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

const liveSilverPrice =
  portfolio.referenceSilverPriceUsd;

const liveGoldPrice =
  portfolio.referenceGoldPriceUsd;

const scenarioRanking =
  liveSilverPrice !== null &&
  liveGoldPrice !== null
    ? buildPhoenixScenarioRanking({
        livePrices: {
          silverPriceUsd:
            liveSilverPrice,

          goldPriceUsd:
            liveGoldPrice,
        },
      })
    : [];

const investmentScores =
  Object.fromEntries(
    scenarioRanking.map(
      (item) => [
        item.companyId,
        item.investmentScore,
      ],
    ),
  );

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
  portfolioV2={portfolioV2}
  investmentScores={investmentScores}
/>
      </section>

    </>
  );
}