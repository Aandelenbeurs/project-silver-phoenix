import MetalScenarioCalculator from "../components/MetalScenarioCalculator";
import AllocationPanel from "../components/AllocationPanel";
import Link from "next/link";

import StatCard from "../components/StatCard";

import SelectionBadge, {
  type SelectionGroup,
} from "../components/SelectionBadge";

import {
  getLivePortfolio,
  getScenarioComparison,
  type ValuedPortfolioPosition,
} from "../data/portfolio-engine";

import {
  formatEur,
  formatPercent,
} from "../data/prices";

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
    buyQueue,
    sellQueue,
  } = portfolio;

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
    .slice(0, 5);

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

  const weightedScoreNumerator =
    pricedEquities.reduce(
      (total, position) =>
        total +
        (position.marketValueEur ?? 0) *
          (position.masterScore ?? 0),
      0,
    );

  const weightedScoreDenominator =
    pricedEquities.reduce(
      (total, position) =>
        total + (position.marketValueEur ?? 0),
      0,
    );

  const weightedPortfolioScore =
    weightedScoreDenominator > 0
      ? weightedScoreNumerator /
        weightedScoreDenominator
      : 0;

  const topHoldings = [...positions]
    .filter(
      (position) =>
        position.marketValueEur !== null,
    )
    .sort(
      (a, b) =>
        (b.marketValueEur ?? 0) -
        (a.marketValueEur ?? 0),
    )
    .slice(0, 10);

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

          <p>
            Gebaseerd op {portfolio.successfulSymbols} van{" "}
            {portfolio.requestedSymbols} live Yahoo-symbolen.
            Laatste update:{" "}
            {formatUpdatedAt(portfolio.fetchedAt)}.
          </p>
        </div>

        <Link
          className="primary-button"
          href="/optimizer"
        >
          Open optimizer →
        </Link>
      </section>

      {isScenario && (
  <section className="stats-grid">
    <StatCard
      label="Scenario portefeuillewaarde"
      value={formatEur(
        totals.totalMarketValueEur,
      )}
    />

    <StatCard
      label="Verschil vs live"
      value={formatEur(
        scenarioDifferenceEur,
      )}
    />

    <StatCard
  label="Scenario rendement"
  value={formatPercent(
    scenarioReturnPercent,
  )}
/>
</section>
)}

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

  <section className="panel">
  <div className="panel-heading">
    <div>
      <p className="eyebrow">
        SCENARIOVERGELIJKING
      </p>

      <h3>
        Live vs Silver $100 vs Silver $300
      </h3>
    </div>
  </div>

  <div className="stats-grid">
    <StatCard
      label="Live"
      value={formatEur(
        scenarioComparison.liveValueEur,
      )}
    />

    <StatCard
  label="Silver $100"
  value={formatEur(
    scenarioComparison.silver100ValueEur,
  )}
  detail={`+${formatEur(
    scenarioComparison.silver100DifferenceEur,
  )} · ${formatPercent(
    scenarioComparison.silver100ReturnPercent,
  )} vs live`}
/>

    <StatCard
  label="Silver $300"
  value={formatEur(
    scenarioComparison.silver300ValueEur,
  )}
  detail={`+${formatEur(
    scenarioComparison.silver300DifferenceEur,
  )} · ${formatPercent(
    scenarioComparison.silver300ReturnPercent,
  )} vs live`}
/>
  </div>
</section>
<MetalScenarioCalculator />

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
          label="Gewogen Phoenix Score"
          value={weightedPortfolioScore.toFixed(1)}
          detail="Gewogen naar actuele marktwaarde"
          tone="green"
        />

        <StatCard
          label="Koersfouten"
          value={portfolio.failedSymbols}
          detail={
            portfolio.failedSymbols === 0
              ? "Alle symbolen beschikbaar"
              : "Controle vereist"
          }
          tone={
            portfolio.failedSymbols === 0
              ? "green"
              : "red"
          }
        />
      </section>
<AllocationPanel totals={totals} />
      <section className="content-grid two-columns">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                BUY QUEUE
              </p>

              <h3>Hoogste koopprioriteit</h3>

              <p>
                Gebaseerd op Master Score en actuele
                onderweging ten opzichte van de doelallocatie.
              </p>
            </div>

            <Link href="/optimizer">
              Volledige optimizer
            </Link>
          </div>

          <div className="company-list">
            {buyQueue.length === 0 ? (
              <p>
                Er zijn momenteel geen berekende
                koopkandidaten.
              </p>
            ) : (
              buyQueue
                .slice(0, 8)
                .map((position) => (
                  <div
                    className="company-row"
                    key={position.id}
                  >
                    <div>
                      <strong>
                        {position.rank !== null
                          ? `#${position.rank} `
                          : ""}
                        {position.name}
                      </strong>

                      <small>
                        Actueel{" "}
                        {formatPercent(
                          position.currentAllocation,
                        )}{" "}
                        · doel{" "}
                        {position.targetAllocation.toFixed(
                          1,
                        )}
                        % · waarde{" "}
                        {formatEur(
                          position.marketValueEur,
                        )}
                      </small>
                    </div>

                    <SelectionBadge
                      group={adviceToSelectionGroup(
                        position,
                      )}
                    />
                  </div>
                ))
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                SELL QUEUE
              </p>

              <h3>Afbouwen en uitstappen</h3>

              <p>
                Verkoopkandidaten en posities boven hun
                maximale allocatie.
              </p>
            </div>

            <Link href="/optimizer">
              Bekijk selectie
            </Link>
          </div>

          <div className="company-list">
            {sellQueue.length === 0 ? (
              <p>
                Er zijn momenteel geen berekende
                verkoopkandidaten.
              </p>
            ) : (
              sellQueue
                .slice(0, 8)
                .map((position) => (
                  <div
                    className="company-row"
                    key={position.id}
                  >
                    <div>
                      <strong>
                        {position.rank !== null
                          ? `#${position.rank} `
                          : ""}
                        {position.name}
                      </strong>

                      <small>
                        Actueel{" "}
                        {formatPercent(
                          position.currentAllocation,
                        )}{" "}
                        · doel{" "}
                        {position.targetAllocation.toFixed(
                          1,
                        )}
                        % · waarde{" "}
                        {formatEur(
                          position.marketValueEur,
                        )}
                      </small>
                    </div>

                    <SelectionBadge
                      group={adviceToSelectionGroup(
                        position,
                      )}
                    />
                  </div>
                ))
            )}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              TOP 10 HOLDINGS
            </p>

            <h3>
              Grootste posities naar actuele marktwaarde
            </h3>
          </div>

          <Link href="/holdings">
            Alle holdings
          </Link>
        </div>

        <div className="compact-table-wrap">
          <table className="data-table wide-table">
            <thead>
              <tr>
                <th>Bedrijf</th>
                <th>Koers</th>
                <th>Valuta</th>
                <th>Waarde</th>
                <th>Actueel</th>
                <th>Doel</th>
                <th>Verschil</th>
                <th>Advies</th>
              </tr>
            </thead>

            <tbody>
              {topHoldings.map((position) => (
                <tr key={position.id}>
                  <td>
                    <strong>
                      {position.name}
                    </strong>
                  </td>

                  <td>
                    {position.localPrice !== null
                      ? position.localPrice.toLocaleString(
                          "nl-NL",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          },
                        )
                      : "—"}
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
                    <SelectionBadge
                      group={adviceToSelectionGroup(
                        position,
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}