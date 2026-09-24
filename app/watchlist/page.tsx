import {
  getLivePortfolio,
} from "../../data/portfolio-engine";

import {
  companies,
} from "../../data/companies";

import {
  phoenixCompaniesV2,
} from "../../data/phoenix-v2";

import {
  buildPhoenixScenarioRanking,
} from "../../data/scenario-upside";

import {
  readEntryReviewStore,
  getLatestEntryReview,
} from "../../data/entry-review-store";

import EntryReviewForm from "./EntryReviewForm";

export default async function WatchlistPage() {
  const portfolio =
    await getLivePortfolio();

    const entryReviewStore =
  await readEntryReviewStore();

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

const phoenixRanked =
  phoenixCompaniesV2
    .map((phoenix) => {
      const scenario =
        scenarioRanking.find(
          (item) =>
            item.companyId ===
            phoenix.companyId,
        );

      return {
        companyId:
          phoenix.companyId,

        investmentScore:
          scenario?.investmentScore ??
          phoenix.scores.opportunity,

          bucket:
    phoenix.portfolio.bucket,
      };
    })
    .sort(
      (a, b) =>
        (b.investmentScore ?? -1) -
        (a.investmentScore ?? -1),
    );

const rankByCompanyId =
  new Map(
    phoenixRanked.map(
      (item, index) => [
        item.companyId,
        index + 1,
      ],
    ),
  );

  const rankingDataByCompanyId =
  new Map(
    phoenixRanked.map(
      (item) => [
        item.companyId,
        item,
      ],
    ),
  );

  const ownedCompanyIds =
    new Set(
      portfolio.portfolioV2.positions.map(
        (position) =>
          position.companyId,
      ),
    );

  const watchlistCompanies =
    companies.filter(
      (company) =>
        !ownedCompanyIds.has(company.id),
    );

function isEntryReviewDue(
  reviewDate: string | null,
) {
  if (!reviewDate) {
    return true;
  }

  const reviewTime =
    new Date(
      `${reviewDate}T00:00:00Z`,
    ).getTime();

  const now = Date.now();

  const ageInDays =
    (now - reviewTime) /
    (1000 * 60 * 60 * 24);

  return ageInDays >= 30;
}

const currentEntryReviews =
  watchlistCompanies.map(
    (company) => {
      const review =
        getLatestEntryReview(
          entryReviewStore,
          company.id,
        );

      return {
        company,
        review,
        reviewDue:
          isEntryReviewDue(
            review?.reviewDate ??
              null,
          ),
        entryStatus:
          review?.entryStatus ??
          "WAIT",
      };
    },
  );

const entryReviewedCount =
  currentEntryReviews.filter(
    (item) =>
      !item.reviewDue,
  ).length;

const entryReviewNeededCount =
  currentEntryReviews.filter(
    (item) =>
      item.reviewDue,
  ).length;

const watchCount =
  currentEntryReviews.filter(
    (item) =>
      item.entryStatus ===
      "WATCH",
  ).length;

const reviewCount =
  currentEntryReviews.filter(
    (item) =>
      item.entryStatus ===
      "REVIEW",
  ).length;

const candidateCount =
  currentEntryReviews.filter(
    (item) =>
      item.entryStatus ===
      "CANDIDATE",
  ).length;

  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              PHOENIX WATCHLIST
            </p>

            <h1>
              Entry Review
            </h1>

            <p>
              Phoenix-bedrijven die momenteel
              niet in de portefeuille zitten.
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
                {watchlistCompanies.length} kandidaten
              </span>

              <span className="review-badge review-badge-ready">
  {entryReviewedCount} klaar
</span>

<span className="review-badge review-badge-needed">
  {entryReviewNeededCount} review nodig
</span>

{watchCount > 0 && (
  <span className="review-badge">
    {watchCount} watch
  </span>
)}

{reviewCount > 0 && (
  <span className="review-badge review-badge-needed">
    {reviewCount} review
  </span>
)}

{candidateCount > 0 && (
  <span className="review-badge review-badge-ready">
    {candidateCount} candidate
  </span>
)}
            </div>
          </div>
        </div>

        <div className="company-list">
          {watchlistCompanies.map(
            (company) => {

const rankingData =
  rankingDataByCompanyId.get(
    company.id,
  );

  const latestEntryReview =
    getLatestEntryReview(
      entryReviewStore,
      company.id,
    );

  const entryStatus =
    latestEntryReview?.entryStatus ??
    "WAIT";

const entryReviewDue =
  isEntryReviewDue(
    latestEntryReview?.reviewDate ??
      null,
  );

  const currentEntryReviews =
  watchlistCompanies.map(
    (company) => {
      const review =
        getLatestEntryReview(
          entryReviewStore,
          company.id,
        );

      return {
        company,
        review,
        reviewDue:
          isEntryReviewDue(
            review?.reviewDate ??
              null,
          ),
        entryStatus:
          review?.entryStatus ??
          "WAIT",
      };
    },
  );

const entryReviewedCount =
  currentEntryReviews.filter(
    (item) =>
      !item.reviewDue,
  ).length;

const entryReviewNeededCount =
  currentEntryReviews.filter(
    (item) =>
      item.reviewDue,
  ).length;

const watchCount =
  currentEntryReviews.filter(
    (item) =>
      item.entryStatus ===
      "WATCH",
  ).length;

const reviewCount =
  currentEntryReviews.filter(
    (item) =>
      item.entryStatus ===
      "REVIEW",
  ).length;

const candidateCount =
  currentEntryReviews.filter(
    (item) =>
      item.entryStatus ===
      "CANDIDATE",
  ).length;

  return (
              <div
                className="review-row"
                key={company.id}
              >
                <div className="review-row-main">
                  <div className="review-company">
                    <strong>
                      {company.name}
                    </strong>

                     <span
    style={{
      display: "block",
      marginTop: "4px",
    }}
  >
    {company.ticker}
  </span>
                  </div>

                  <div className="review-cell">
                    <span>
                      Rank
                    </span>

                    <strong>
  {rankByCompanyId.get(
    company.id,
  ) ?? "—"}
</strong>
                  </div>

                  <div className="review-cell">
  <span>
    Investment
  </span>

  <strong>
    {rankingData?.investmentScore !==
    null &&
    rankingData?.investmentScore !==
    undefined
      ? rankingData.investmentScore.toFixed(
          1,
        )
      : "—"}
  </strong>
</div>

<div className="review-cell">
  <span>
    Bucket
  </span>

  <strong>
    {rankingData?.bucket ??
      "—"}
  </strong>
</div>

                  <div className="review-cell">
                    <span>
                      Entry status
                    </span>

                    <strong className="review-badge">
  {entryStatus}
</strong>
                  </div>

                  <div className="review-cell">
  <span>
    Review
  </span>

  <strong
    className={`review-badge ${
      entryReviewDue
        ? "review-badge-needed"
        : "review-badge-ready"
    }`}
  >
    {entryReviewDue
      ? "REVIEW NODIG"
      : "KLAAR"}
  </strong>
</div>

<EntryReviewForm
  companyId={company.id}
  previousEntryStatus={
    entryStatus
  }
  previousEntryNote={
    latestEntryReview?.entryNote ??
    null
  }
  reviewDue={entryReviewDue}
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