import {
  getLivePortfolio,
} from "../../data/portfolio-engine";

import {
  buildLiveExitReview,
} from "../../data/live-exit-review";

import ExitPositionRow from "./ExitPositionRow";

export default async function ExitPage() {
  const portfolio =
    await getLivePortfolio();

  const exitReview =
    await buildLiveExitReview({
      portfolio,
    });

  const reviews =
    exitReview.portfolioExitReviews;

    const silverMarketHeat =
  exitReview.silverMarketHeat;

const goldMarketHeat =
  exitReview.goldMarketHeat;

  const counts = {
    EXIT:
      reviews.filter(
        (item) =>
          item.result.status === "EXIT",
      ).length,

    SCALE_OUT:
      reviews.filter(
        (item) =>
          item.result.status === "SCALE_OUT",
      ).length,

    TRIM:
      reviews.filter(
        (item) =>
          item.result.status === "TRIM",
      ).length,

    WATCH:
      reviews.filter(
        (item) =>
          item.result.status === "WATCH",
      ).length,

    HOLD:
      reviews.filter(
        (item) =>
          item.result.status === "HOLD",
      ).length,

    REVIEW:
      reviews.filter(
        (item) =>
          item.result.status === "REVIEW",
      ).length,
  };

  const sortedReviews =
    [...reviews].sort(
      (a, b) =>
        (
          b.result.exitPressureScore ??
          -1
        ) -
        (
          a.result.exitPressureScore ??
          -1
        ),
    );

  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              PHOENIX EXIT ENGINE
            </p>

            <h1>
              Exit Strategy
            </h1>

            <p>
              Bewaak exit pressure,
              thesis deterioration en
              verkoopmomenten binnen de
              portefeuille.
            </p>
          </div>
        </div>

        <div
          className="stats-grid"
          style={{
            marginTop: "20px",
          }}
        >
          <div className="stat-card">
            <span className="stat-label">
              Exit
            </span>

            <strong>
              {counts.EXIT}
            </strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              Scale Out
            </span>

            <strong>
              {counts.SCALE_OUT}
            </strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              Trim
            </span>

            <strong>
              {counts.TRIM}
            </strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              Watch
            </span>

            <strong>
              {counts.WATCH}
            </strong>
          </div>

          <div className="stat-card tone-green">
            <span className="stat-label">
              Hold
            </span>

            <strong>
              {counts.HOLD}
            </strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              Review
            </span>

            <strong>
              {counts.REVIEW}
            </strong>
          </div>
        </div>

        <div
  style={{
    marginTop: "28px",
  }}
>
  <p className="eyebrow">
    MARKET HEAT
  </p>

  <div className="stats-grid">
    <div className="stat-card">
      <span className="stat-label">
        Silver Market Heat
      </span>

      <strong>
        {silverMarketHeat !== null
          ? silverMarketHeat.marketHeatScore.toFixed(
              1,
            )
          : "—"}
      </strong>

      <small>
        {silverMarketHeat?.marketHeatLevel ??
          "Geen data"}
      </small>
    </div>

    <div className="stat-card">
      <span className="stat-label">
        Gold Market Heat
      </span>

      <strong>
        {goldMarketHeat !== null
          ? goldMarketHeat.marketHeatScore.toFixed(
              1,
            )
          : "—"}
      </strong>

      <small>
        {goldMarketHeat?.marketHeatLevel ??
          "Geen data"}
      </small>
    </div>
  </div>
</div>

      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              EXIT PRESSURE
            </p>

            <h3>
              Portfolio posities
            </h3>

            <p>
              Gesorteerd van hoogste naar
              laagste exit pressure.
            </p>
          </div>
        </div>

        <div className="company-list">
        {sortedReviews.map(
  (item) => (
    <ExitPositionRow
      key={
        item.position.companyId
      }

      companyId={
        item.position.companyId
      }

      status={
        item.result.status
      }

      coverage={
        item.result.dataCoveragePercent
      }

      thesisHealth={
        item.input.thesisHealth
      }

      exitPressureScore={
        item.result.exitPressureScore
      }

      reasons={
        item.result.reasons
      }

      remainingUpsidePercent={
        item.input.remainingUpsidePercent
      }

      estimatedCompanyUpsidePercent={
  item.input.estimatedCompanyUpsidePercent ??
  null
}

latestInvestmentDecline={
  item.input.latestInvestmentDecline ??
  null
}

totalInvestmentDecline={
  item.input.totalInvestmentDecline ??
  null
}

consecutiveInvestmentDeclines={
  item.input.consecutiveInvestmentDeclines ??
  null
}

      unrealizedReturnPercent={
        item.input.unrealizedReturnPercent
      }

      marketHeatScore={
  item.input.marketHeatScore
}

opportunityScore={
  item.input.opportunityScore
}
action={
  item.actionSuggestion.action
}

targetSellPercent={
  item.actionSuggestion.targetSellPercent
}

minSellPercent={
  item.actionSuggestion.minSellPercent
}

maxSellPercent={
  item.actionSuggestion.maxSellPercent
}

actionExplanation={
  item.actionSuggestion.explanation
}

      components={
        item.result.components
      }
    />
  ),
)}
        </div>
      </section>
    </>
  );
}