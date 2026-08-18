import {
  exitEngineTestCases,
} from "../../data/exit-engine";

import {
  buildPhoenixScenarioRanking,
  calculateScenarioUpside,
} from "../../data/scenario-upside";

import {
  getPhoenixCompanyV2,
  phoenixCompaniesV2,
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

import {
  getTopRotationSellPlan,
  simulateRotation,
} from "../../data/rotation-engine";

import {
  reviewPortfolioExits,
  type ExitReviewSupplement,
} from "../../data/exit-engine";

import {
  calculateCompanyMarketHeat,
} from "../../data/market-heat";

import {
  getCompanyById,
} from "../../data/companies";

import {
  calculateUnrealizedReturnPercent,
} from "../../data/cost-basis";

import {
  readReviewStore,
} from "../../data/review-store";

import RotationSimulator from "../../components/RotationSimulator";

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
  {position.isEquity
    ? `Doel ${position.targetAllocation.toFixed(1)}%`
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

  const reviewStore =
  await readReviewStore();

  function getLatestStoredReview(
  companyId: string,
) {
  const reviews =
    [...reviewStore.reviews].sort(
      (a, b) =>
        b.reviewDate.localeCompare(
          a.reviewDate,
        ),
    );

  for (const review of reviews) {
    const companyReview =
      review.companies[
        companyId
      ];

    if (companyReview) {
      return companyReview;
    }
  }

  return null;
}

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

const investmentScores =
  new Map(
    scenarioRanking.map(
      (item) => [
        item.companyId,
        item.investmentScore ?? 0,
      ],
    ),
  );

const exitSupplements =
  new Map<
    string,
    ExitReviewSupplement
  >(
    portfolioV2.positions.map(
      (position) => {
        const marketHeat =
          liveMetalPrices
            ? calculateCompanyMarketHeat({
                companyId:
                  position.companyId,

                livePrices:
                  liveMetalPrices,
              })
            : null;

            const scenarioUpside =
  liveMetalPrices
    ? calculateScenarioUpside({
        companyId:
          position.companyId,

        livePrices:
          liveMetalPrices,
      })
    : null;

const company =
  getCompanyById(
    position.companyId,
  );

const silverExposure =
  company?.silverExposure ?? 0;

const goldExposure =
  company?.goldExposure ?? 0;

const totalExposure =
  silverExposure +
  goldExposure;

const remainingUpsidePercent =
  scenarioUpside !== null &&
  totalExposure > 0
    ? (
        (
          silverExposure *
            scenarioUpside.silverRemainingUpside +
          goldExposure *
            scenarioUpside.goldRemainingUpside
        ) /
        totalExposure
      ) * 100
    : null;

    const portfolioPosition =
  portfolio.positions.find(
    (item) =>
      item.company?.id ===
      position.companyId,
  );

const unrealizedReturnPercent =
  portfolioPosition?.localPrice !== null &&
  portfolioPosition?.localPrice !== undefined
    ? calculateUnrealizedReturnPercent({
        companyId:
          position.companyId,

        currentPrice:
          portfolioPosition.localPrice,

        currentCurrency:
          portfolioPosition.currency,

        exchangeRates:
          portfolio.exchangeRates,
      })
    : null;

    const latestStoredReview =
  getLatestStoredReview(
    position.companyId,
  );

const thesisHealth =
  latestStoredReview?.thesisHealth ??
  "UNKNOWN";

const previousInvestmentScore =
  latestStoredReview?.investmentScore ??
  null;

        return [
          position.companyId,
          {
            investmentScore:
              investmentScores.get(
                position.companyId,
              ) ?? null,

            previousInvestmentScore,

            thesisHealth,

            marketHeatScore:
              marketHeat?.marketHeatScore ??
              null,

           remainingUpsidePercent,

            unrealizedReturnPercent,
          },
        ];
      },
    ),
  );

const portfolioExitReviews =
  reviewPortfolioExits({
    positions:
      portfolioV2.positions,

    supplements:
      exitSupplements,
  });

  const candidateCompanyIds =
  phoenixCompaniesV2.map(
    (company) =>
      company.companyId,
  );

const rotationSellTest =
  getTopRotationSellPlan({
    positions: optimizerV2Positions,
    investmentScores,
    limit: 10,
  });

  const rotationSimulation =
  simulateRotation({
    positions:
      optimizerV2Positions,

    investmentScores,

    liveMetalPrices:
      liveMetalPrices ?? undefined,

    maxSellPositions: 4,
  });

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
        ROTATION SIMULATION
      </p>

      <h3>
        Verkoop → herallocatie
      </h3>

      <p>
        Selecteer welke verkoopkandidaten je daadwerkelijk
        wilt meenemen. Phoenix berekent daarna de herallocatie
        opnieuw.
      </p>
    </div>
  </div>

 <RotationSimulator
  sellOptions={
    rotationSimulation.sellPlan
  }
  initialSimulation={
    rotationSimulation
  }
/>

</section>

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

    <section className="panel">
  <div className="panel-heading">
    <div>
      <p className="eyebrow">
        EXIT ENGINE TEST
      </p>

      <h3>
        Exit Pressure testscenario&apos;s
      </h3>
    </div>
  </div>

  <div className="company-list">
    {Object.entries(
      exitEngineTestCases,
    ).map(
      ([name, result]) => (
        <div
          className="company-row"
          key={name}
        >
          <div>
            <strong>
              {name}
            </strong>

            <small>
              {result.status}
              {" · "}
              {result.reasons.length > 0
                ? result.reasons.join(" · ")
                : "Geen exitredenen"}
            </small>
          </div>

          <strong>
            {result.exitPressureScore !== null
              ? result.exitPressureScore.toFixed(
                  1,
                )
              : "—"}
          </strong>
        </div>
      ),
    )}
  </div>
</section>

<section className="panel">
  <div className="panel-heading">
    <div>
      <p className="eyebrow">
        LIVE EXIT REVIEW
      </p>

      <h3>
        Echte portefeuille
      </h3>

      <p>
        Voorlopige Exit Pressure op basis van de
        data die nu beschikbaar is.
      </p>
    </div>
  </div>

  <div className="company-list">
    {portfolioExitReviews
      .filter(
        (item) =>
          item.result.exitPressureScore !== null,
      )
      .sort(
        (a, b) =>
          (b.result.exitPressureScore ?? 0) -
          (a.result.exitPressureScore ?? 0),
      )
      .slice(0, 15)
      .map((item) => (
        <div
          className="company-row"
          key={item.position.companyId}
        >
          <div>
            <strong>
              {item.position.companyId}
            </strong>

            <small>
  {item.result.status}
  {" · "}
  Investment{" "}
  {item.input.investmentScore !== null
    ? item.input.investmentScore.toFixed(1)
    : "—"}
  {" · "}
  Thesis{" "}
  {item.input.thesisHealth}
  {" · "}
  Coverage{" "}
  {item.result.dataCoveragePercent.toFixed(0)}%
  {" · "}
  {item.result.scoreIsReliable
    ? "BETROUWBAAR"
    : "ONVOLDOENDE DATA"}
</small>
          </div>

          <strong>
            {item.result.exitPressureScore !== null
              ? item.result.exitPressureScore.toFixed(1)
              : "—"}
          </strong>
        </div>
      ))}
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