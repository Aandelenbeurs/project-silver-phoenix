import {
  buildPhoenixScenarioRanking,
} from "../../data/scenario-upside";

import {
  getPhoenixCompanyV2,
} from "../../data/phoenix-v2";

import StatCard from "../../components/StatCard";
import NewMoneyOptimizerV2 from "../../components/NewMoneyOptimizerV2";

import SelectionBadge, {
  type SelectionGroup,
} from "../../components/SelectionBadge";

import {
  corePositions,
  keepPositions,
  reducePositions,
  exitPositions,
  reviewPositions,
  equityPositions,
  type PortfolioPosition,
} from "../../data/portfolio";

import {
  getLivePortfolio,
  determinePortfolioAdviceV2,
} from "../../data/portfolio-engine";

function sortByRank(
  positions: PortfolioPosition[],
): PortfolioPosition[] {
  return [...positions].sort((a, b) => {
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
}

function statusToSelectionGroup(
  position: PortfolioPosition,
): SelectionGroup {
  if (position.status === "core") {
    return "Kernpositie";
  }

  if (position.status === "keep") {
    return "Behouden";
  }

  if (position.status === "reduce") {
    return "Afbouwen";
  }

  if (position.status === "review") {
    return "Nog beoordelen";
  }

  return "Uitstappen / watchlist";
}

function PositionRow({
  position,
}: {
  position: PortfolioPosition;
}) {
  const group = statusToSelectionGroup(position);

  return (
    <div className="company-row">
      <div>
        <strong>
          {position.rank !== null
            ? `#${position.rank} `
            : ""}
          {position.name}
        </strong>

        <small>
          {position.masterScore !== null
            ? `Score ${position.masterScore.toFixed(1)}`
            : "Nog geen Master Score"}

          {position.isEquity
            ? ` · doel ${position.targetAllocation.toFixed(1)}%`
            : ""}
        </small>
      </div>

      <SelectionBadge group={group} />
    </div>
  );
}

export default async function OptimizerPage() {
  const portfolio =
  await getLivePortfolio();

  const liveMetalPrices =
  portfolio.referenceSilverPriceUsd !== null &&
  portfolio.referenceGoldPriceUsd !== null
    ? {
        silverPriceUsd:
          portfolio.referenceSilverPriceUsd,

        goldPriceUsd:
          portfolio.referenceGoldPriceUsd,
      }
    : null;

  const portfolioV2 =
  portfolio.portfolioV2;

  const scenarioRanking =
  liveMetalPrices
    ? buildPhoenixScenarioRanking({
        livePrices:
          liveMetalPrices,
      })
    : [];

    const portfolioAdviceV2 =
  portfolioV2.positions
    .map((position) => {
      const phoenix =
        getPhoenixCompanyV2(
          position.companyId,
        );

      if (!phoenix) {
        return null;
      }

      const scenarioData =
        scenarioRanking.find(
          (item) =>
            item.companyId ===
            position.companyId,
        );

      const investmentScore =
        scenarioData?.investmentScore ??
        phoenix.scores.opportunity ??
        null;

      const advice =
        determinePortfolioAdviceV2({
          currentAllocation:
            position.allocationPercent,

          idealMin:
            phoenix.portfolio.idealMin,

          idealMax:
            phoenix.portfolio.idealMax,

          hardMax:
            phoenix.portfolio.hardMax,

          investmentScore,
        });

      return {
        position,
        phoenix,
        investmentScore,
        advice,
      };
    })
    .filter(
      (
        item,
      ): item is NonNullable<
        typeof item
      > => item !== null,
    );

    const strongBuyV2 =
  portfolioAdviceV2.filter(
    (item) =>
      item.advice ===
      "STERK BIJKOPEN",
  );

const buyV2 =
  portfolioAdviceV2.filter(
    (item) =>
      item.advice ===
      "BIJKOPEN",
  );

const onTargetV2 =
  portfolioAdviceV2.filter(
    (item) =>
      item.advice ===
      "OP DOEL",
  );

const noBuyV2 =
  portfolioAdviceV2.filter(
    (item) =>
      item.advice ===
      "NIET BIJKOPEN",
  );

const reduceV2 =
  portfolioAdviceV2.filter(
    (item) =>
      item.advice ===
      "AFBOUWEN",
  );

const reviewV2 =
  portfolioAdviceV2.filter(
    (item) =>
      item.advice ===
      "NOG BEOORDELEN",
  );

const optimizerV2Positions =
  portfolio.positions
    .filter(
      (position) =>
        position.isEquity &&
        position.company &&
        position.marketValueEur !== null,
    )
    .map((position) => ({
      companyId:
        position.company!.id,

      marketValueEur:
        position.marketValueEur!,
    }));
  const core = sortByRank(corePositions);
  const keep = sortByRank(keepPositions);
  const reduce = sortByRank(reducePositions);
  const exit = sortByRank(exitPositions);
  const review = sortByRank(reviewPositions);

  const targetPortfolio = [...core, ...keep];

  return (
  <>
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            PHOENIX PORTFOLIO
          </p>

          <h3>
            Portfolio Score
          </h3>

          <p>
            Actuele portefeuille-analyse op basis van Phoenix V2.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Portfolio Score"
          value={
            portfolioV2.partialPortfolioScore !== null
              ? portfolioV2.partialPortfolioScore.toFixed(1)
              : "—"
          }
          detail="Phoenix V2"
          tone="green"
        />

        <StatCard
          label="Opportunity Quality"
          value={
            portfolioV2.components.opportunityQuality !== null
              ? portfolioV2.components.opportunityQuality.toFixed(1)
              : "—"
          }
        />

        <StatCard
          label="Allocation Efficiency"
          value={
            portfolioV2.components.allocationEfficiency !== null
              ? portfolioV2.components.allocationEfficiency.toFixed(1)
              : "—"
          }
        />

        <StatCard
          label="Position Sizing"
          value={
            portfolioV2.components.positionSizingDiscipline !== null
              ? portfolioV2.components.positionSizingDiscipline.toFixed(1)
              : "—"
          }
        />

        <StatCard
          label="Risk & Concentration"
          value={
            portfolioV2.components.riskAndConcentration !== null
              ? portfolioV2.components.riskAndConcentration.toFixed(1)
              : "—"
          }
        />

        <StatCard
          label="Portfolio Balance"
          value={
            portfolioV2.components.portfolioBalance !== null
              ? portfolioV2.components.portfolioBalance.toFixed(1)
              : "—"
          }
        />
      </div>
    </section>

    <NewMoneyOptimizerV2
  positions={optimizerV2Positions}
  liveMetalPrices={liveMetalPrices}
/>

      <section className="stats-grid">
  <StatCard
    label="Huidige aandelenposities"
    value={equityPositions.length}
  />

  <StatCard
    label="Sterk bijkopen"
    value={strongBuyV2.length}
    tone="green"
  />

  <StatCard
    label="Bijkopen"
    value={buyV2.length}
    tone="green"
  />

  <StatCard
    label="Op doel"
    value={onTargetV2.length}
  />

  <StatCard
    label="Niet bijkopen"
    value={noBuyV2.length}
    tone="gold"
  />

  <StatCard
    label="Afbouwen"
    value={reduceV2.length}
    tone="red"
  />

  <StatCard
    label="Nog beoordelen"
    value={reviewV2.length}
    tone="gold"
  />
</section>

<section className="content-grid two-columns optimizer-grid">
  <article className="panel">
    <div className="panel-heading">
      <div>
        <p className="eyebrow">
          STERK BIJKOPEN
        </p>

        <h3>Hoogste prioriteit</h3>

        <p>
          Posities onder hun ideale allocatie met een
          Investment Score van 90 of hoger.
        </p>
      </div>
    </div>

    <div className="company-list">
      {strongBuyV2.map((item) => (
        <div
          className="company-row"
          key={item.position.companyId}
        >
          <div>
            <strong>
              {item.phoenix.companyId}
            </strong>

            <small>
              Investment{" "}
              {item.investmentScore !== null
  ? item.investmentScore.toFixed(1)
  : "—"}
              {" · "}
              Allocatie{" "}
              {item.position.allocationPercent.toFixed(2)}%
            </small>
          </div>

          <strong>
            STERK BIJKOPEN
          </strong>
        </div>
      ))}
    </div>
  </article>

  <div className="stacked-panels">
    <article className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            BIJKOPEN
          </p>

          <h3>Aantrekkelijke onderwegingen</h3>

          <p>
            Posities onder hun ideale allocatie met voldoende
            Investment Score om nieuw kapitaal te rechtvaardigen.
          </p>
        </div>
      </div>

      <div className="company-list compact">
        {buyV2.map((item) => (
          <div
            className="company-row"
            key={item.position.companyId}
          >
            <div>
              <strong>
                {item.phoenix.companyId}
              </strong>

              <small>
                Investment{" "}
                {item.investmentScore !== null
  ? item.investmentScore.toFixed(1)
  : "—"}
                {" · "}
                Allocatie{" "}
                {item.position.allocationPercent.toFixed(2)}%
              </small>
            </div>

            <strong>
              BIJKOPEN
            </strong>
          </div>
        ))}
      </div>
    </article>

    <article className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            OP DOEL
          </p>

          <h3>Binnen ideale bandbreedte</h3>

          <p>
            Deze posities zitten momenteel binnen hun
            Phoenix V2 idealMin–idealMax range.
          </p>
        </div>
      </div>

      <div className="company-list compact">
        {onTargetV2.map((item) => (
          <div
            className="company-row"
            key={item.position.companyId}
          >
            <div>
              <strong>
                {item.phoenix.companyId}
              </strong>

              <small>
                Allocatie{" "}
                {item.position.allocationPercent.toFixed(2)}%
              </small>
            </div>

            <strong>
              OP DOEL
            </strong>
          </div>
        ))}
      </div>
    </article>

    <article className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            NIET BIJKOPEN
          </p>

          <h3>Geen prioriteit voor nieuw geld</h3>

          <p>
            Deze posities hoeven momenteel niet verder te worden
            uitgebreid.
          </p>
        </div>
      </div>

      <div className="company-list compact">
        {noBuyV2.map((item) => (
          <div
            className="company-row"
            key={item.position.companyId}
          >
            <div>
              <strong>
                {item.phoenix.companyId}
              </strong>

              <small>
                Investment{" "}
                {item.investmentScore !== null
  ? item.investmentScore.toFixed(1)
  : "—"}
                {" · "}
                Allocatie{" "}
                {item.position.allocationPercent.toFixed(2)}%
              </small>
            </div>

            <strong>
              NIET BIJKOPEN
            </strong>
          </div>
        ))}
      </div>
    </article>

    <article className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            AFBOUWEN
          </p>

          <h3>Boven de harde limiet</h3>

          <p>
            Deze posities zitten boven hun Phoenix V2 hardMax
            en zijn echte reductiekandidaten.
          </p>
        </div>
      </div>

      <div className="company-list compact">
        {reduceV2.map((item) => (
          <div
            className="company-row"
            key={item.position.companyId}
          >
            <div>
              <strong>
                {item.phoenix.companyId}
              </strong>

              <small>
                Allocatie{" "}
                {item.position.allocationPercent.toFixed(2)}%
                {" · "}
                Hard max{" "}
                {item.phoenix.portfolio.hardMax !== null
                  ? item.phoenix.portfolio.hardMax.toFixed(1)
                  : "—"}
                %
              </small>
            </div>

            <strong>
              AFBOUWEN
            </strong>
          </div>
        ))}
      </div>
    </article>
  </div>
</section>

    </>
  );
}