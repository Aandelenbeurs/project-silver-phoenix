import MetalScenarioCalculator from "../components/MetalScenarioCalculator";
import AllocationPanel from "../components/AllocationPanel";
import Link from "next/link";

import StatCard from "../components/StatCard";

import {
  getLivePortfolio,
  getScenarioComparison,
  type ValuedPortfolioPosition,
} from "../data/portfolio-engine";

import {
  formatEur,
  formatPercent,
} from "../data/prices";

import DashboardPortfolioChart from "../components/DashboardPortfolioChart";

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const [
  portfolio,
  scenarioComparison,
] = await Promise.all([
  getLivePortfolio(),
  getScenarioComparison(),
]);

  const {
    positions,
    totals,
  } = portfolio;

  const dailyChangeEur =
  positions.reduce(
    (total, position) => {
      if (
        position.marketValueEur === null ||
        position.quote.dayChangePercent === null
      ) {
        return total;
      }

      const changeFraction =
        position.quote.dayChangePercent /
        100;

      const previousValue =
        position.marketValueEur /
        (1 + changeFraction);

      return (
        total +
        (
          position.marketValueEur -
          previousValue
        )
      );
    },
    0,
  );

const previousPortfolioValue =
  totals.totalMarketValueEur -
  dailyChangeEur;

const dailyChangePercent =
  previousPortfolioValue > 0
    ? (
        dailyChangeEur /
        previousPortfolioValue
      ) * 100
    : 0;

  const isScenario =
  positions.some(
    (position) =>
      position.scenarioApplied,
  );

const liveReferenceValueEur =
  positions.reduce(
    (total, position) => {
      if (
        position.marketValueEur === null
      ) {
        return total;
      }

      if (
        !position.scenarioApplied ||
        position.scenarioUpsidePercent ===
          null
      ) {
        return (
          total +
          position.marketValueEur
        );
      }

      const multiplier =
        1 +
        position.scenarioUpsidePercent /
          100;

      if (multiplier <= 0) {
        return total;
      }

      return (
        total +
        position.marketValueEur /
          multiplier
      );
    },
    0,
  );

const scenarioDifferenceEur =
  totals.totalMarketValueEur -
  liveReferenceValueEur;

const scenarioReturnPercent =
  liveReferenceValueEur > 0
    ? (
        scenarioDifferenceEur /
        liveReferenceValueEur
      ) * 100
    : 0;

    const scenarioContributions =
  positions
    .filter(
      (position) =>
        position.scenarioApplied &&
        position.marketValueEur !== null &&
        position.scenarioUpsidePercent !== null,
    )
    .map((position) => {
      const multiplier =
        1 +
        position.scenarioUpsidePercent! / 100;

      const liveValue =
        multiplier > 0
          ? position.marketValueEur! /
            multiplier
          : position.marketValueEur!;

      const contributionEur =
  position.marketValueEur! -
  liveValue;

return {
  id: position.holding.id,
  name: position.holding.name,
  contributionEur,
  contributionPercent:
    scenarioDifferenceEur > 0
      ? (
          contributionEur /
          scenarioDifferenceEur
        ) * 100
      : 0,
};
    })
    .sort(
      (a, b) =>
        b.contributionEur -
        a.contributionEur,
    )
    .slice(0, 3);

    const topScenarioContributionPercent =
  scenarioContributions.reduce(
    (total, item) =>
      total + item.contributionPercent,
    0,
  );

  const equities = positions.filter(
    (position) => position.isEquity,
  );

  const pricedEquities = equities.filter(
    (position) => position.marketValueEur !== null,
  );

const phoenixPortfolioScore =
  portfolio.portfolioV2
    .partialPortfolioScore;

  return (
    <>
     <section className="hero-panel">
  <div>
    <p className="eyebrow">
      LIVE PORTEFEUILLE
    </p>

    <h2>
      {formatEur(
        isScenario
          ? liveReferenceValueEur
          : totals.totalMarketValueEur,
      )}
    </h2>

    <p
  style={{
    marginTop: "8px",
    fontWeight: 700,
    color:
      dailyChangeEur >= 0
        ? "#22c55e"
        : "#ef4444",
  }}
>
  {dailyChangeEur >= 0 ? "▲" : "▼"}{" "}
  {dailyChangeEur >= 0 ? "+" : ""}
  {formatEur(dailyChangeEur)}
  {" "}
  (
  {dailyChangePercent >= 0 ? "+" : ""}
  {formatPercent(dailyChangePercent)}
  )
  vandaag
</p>

    <p
      style={{
        marginTop: "10px",
      }}
    >
      Phoenix Portfolio Score{" "}
      <strong>
        {phoenixPortfolioScore !== null
          ? phoenixPortfolioScore.toFixed(1)
          : "—"}
      </strong>
    </p>

    <p>
      {portfolio.successfulSymbols} van{" "}
      {portfolio.requestedSymbols} koersen geladen ·{" "}
      {formatUpdatedAt(portfolio.fetchedAt)}
    </p>
  </div>

  <div
    style={{
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    }}
  >
    <Link
      className="primary-button"
      href="/optimizer"
    >
      Optimizer →
    </Link>

    <Link
      className="secondary-button"
      href="/holdings"
    >
      Holdings →
    </Link>

    <Link
      className="secondary-button"
      href="/ranking"
    >
      Phoenix Ranking →
    </Link>
  </div>
</section>

<DashboardPortfolioChart />

{isScenario &&
  scenarioContributions.length > 0 && (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            SCENARIO BIJDRAGEN
          </p>

          <h3>
            Grootste bijdragers aan de
            scenariogroei
          </h3>
        </div>
      </div>

      <div className="scenario-contribution-list">
        {scenarioContributions.map(
          (item, index) => (
            <div
  key={item.id}
  className="scenario-contribution-row"
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
    padding: "10px 0",
  }}
>
              <span>
                {index + 1}. {item.name}
              </span>

              <div
  style={{
    textAlign: "right",
    flexShrink: 0,
  }}
>
  <strong>
    +{formatEur(
      item.contributionEur,
    )}
  </strong>

  <div
    style={{
      fontSize: "12px",
      color: "var(--muted)",
      marginTop: "2px",
    }}
  >
    {formatPercent(
      item.contributionPercent,
    )}{" "}
    van totale groei
  </div>
</div>
            </div>
          ),
        )}
      </div>

      <div
  style={{
    marginTop: "16px",
    paddingTop: "14px",
    borderTop:
      "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
  }}
>
  <span
    style={{
      color: "var(--muted)",
    }}
  >
    Aandeel Top 5 in totale
    scenariogroei
  </span>

  <strong>
    {formatPercent(
      topScenarioContributionPercent,
    )}
  </strong>
</div>

    </section>
  )}

<MetalScenarioCalculator />

      <section className="stats-grid">
  <StatCard
    label="Aandelenwaarde"
    value={formatEur(
      totals.equityValueEur,
    )}
    detail={`${equities.length} individuele aandelen`}
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

  <StatCard
    label="Aandelenposities"
    value={equities.length}
    detail="Actieve individuele posities"
  />
</section>
<AllocationPanel totals={totals} />

    </>
  );
}