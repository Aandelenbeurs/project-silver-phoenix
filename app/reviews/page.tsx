import {
  getLivePortfolio,
} from "../../data/portfolio-engine";

import {
  readReviewStore,
} from "../../data/review-store";

import {
  buildPhoenixScenarioRanking,
} from "../../data/scenario-upside";

import ReviewForm from "./ReviewForm";

export default async function ReviewsPage() {
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

const scenarioRanking =
  liveMetalPrices
    ? buildPhoenixScenarioRanking({
        livePrices:
          liveMetalPrices,
      })
    : [];

const totalPositions =
  portfolio.portfolioV2.positions.length;

const reviewedPositions =
  portfolio.portfolioV2.positions.filter(
    (position) =>
      getLatestStoredReview(
        position.companyId,
      ) !== null,
  );

const reviewedCount =
  reviewedPositions.length;

const reviewNeededCount =
  totalPositions -
  reviewedCount;

const weakeningCount =
  reviewedPositions.filter(
    (position) =>
      getLatestStoredReview(
        position.companyId,
      )?.thesisHealth ===
      "WEAKENING",
  ).length;

const brokenCount =
  reviewedPositions.filter(
    (position) =>
      getLatestStoredReview(
        position.companyId,
      )?.thesisHealth ===
      "BROKEN",
  ).length;

  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              PHOENIX REVIEW WORKSPACE
            </p>

            <h1>
              Maandelijkse portfolio review
            </h1>

            <p>
              Controleer per positie de actuele status
              en vergelijk deze met de vorige review.
            </p>
           <div
  className="review-summary"
  style={{
    marginTop: "16px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  }}
>
  <span className="review-badge">
    {totalPositions} posities
  </span>

  <span className="review-badge review-badge-ready">
    {reviewedCount} klaar
  </span>

  <span className="review-badge review-badge-needed">
    {reviewNeededCount} review nodig
  </span>

  {weakeningCount > 0 && (
    <span className="review-badge review-badge-weakening">
      {weakeningCount} weakening
    </span>
  )}

  {brokenCount > 0 && (
    <span className="review-badge review-badge-broken">
      {brokenCount} broken
    </span>
  )}
</div>
          </div>
        </div>

        <div className="company-list">
          {portfolio.portfolioV2.positions.map(
            (position) => {
              const previousReview =
                getLatestStoredReview(
                  position.companyId,
                );

                const scenarioData =
  scenarioRanking.find(
    (item) =>
      item.companyId ===
      position.companyId,
  );

const currentInvestmentScore =
  scenarioData?.investmentScore ??
  position.opportunity ??
  null;

const previousInvestmentScore =
  previousReview?.investmentScore ??
  null;

const investmentScoreChange =
  currentInvestmentScore !== null &&
  previousInvestmentScore !== null
    ? currentInvestmentScore -
      previousInvestmentScore
    : null;

return (
  <div
    className="review-row"
    key={position.companyId}
  >
    <div className="review-row-main">
      <div className="review-company">
        <strong>
          {position.companyId}
        </strong>
      </div>

      <div className="review-cell">
        <span>
          Investment
        </span>

        <strong>
          {currentInvestmentScore !== null
            ? currentInvestmentScore.toFixed(1)
            : "—"}
        </strong>
      </div>

      <div className="review-cell">
        <span>
          Δ
        </span>

        <strong>
          {investmentScoreChange !== null
            ? `${investmentScoreChange >= 0 ? "+" : ""}${investmentScoreChange.toFixed(
                1,
              )}`
            : "—"}
        </strong>
      </div>

  <div className="review-cell">
  <span>
    Thesis
  </span>

  <strong
    className={`review-badge review-badge-thesis review-badge-${
      (
        previousReview?.thesisHealth ??
        "UNKNOWN"
      ).toLowerCase()
    }`}
  >
    {previousReview?.thesisHealth ??
      "UNKNOWN"}
  </strong>
</div>

      <div className="review-cell">
        <span>
          Allocatie
        </span>

        <strong>
          {position.allocationPercent.toFixed(
            2,
          )}
          %
        </strong>
      </div>

      <div className="review-cell">
  <span>
    Status
  </span>

  <strong
    className={`review-badge ${
      previousReview
        ? "review-badge-ready"
        : "review-badge-needed"
    }`}
  >
    {previousReview
      ? "KLAAR"
      : "REVIEW NODIG"}
  </strong>
</div>

   <ReviewForm
  companyId={
    position.companyId
  }
  currentInvestmentScore={
    currentInvestmentScore
  }
  previousThesisHealth={
    previousReview?.thesisHealth ??
    "UNKNOWN"
  }
  previousThesisNote={
    previousReview?.thesisNote ??
    null
  }
/>
    </div>
  </div>
);
            },
          )}
        </div>
      </section>
    </>
  );
}