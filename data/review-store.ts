import fs from "fs/promises";
import path from "path";

import {
  type ThesisHealth,
} from "./exit-engine";

export type StoredCompanyReview = {
  companyId: string;
  reviewDate: string;

  investmentScore: number | null;

  thesisHealth: ThesisHealth;
  thesisNote: string | null;
};

export type StoredMonthlyReview = {
  reviewDate: string;

  companies: Record<
    string,
    StoredCompanyReview
  >;
};

type ReviewStore = {
  reviews: StoredMonthlyReview[];
};

const REVIEW_STORE_PATH =
  path.join(
    process.cwd(),
    "data",
    "portfolio-reviews.json",
  );

const EMPTY_STORE: ReviewStore = {
  reviews: [],
};

/**
 * Lees alle opgeslagen reviews.
 */
export async function readReviewStore():
  Promise<ReviewStore> {
  try {
    const raw =
      await fs.readFile(
        REVIEW_STORE_PATH,
        "utf8",
      );

    const parsed =
      JSON.parse(raw) as ReviewStore;

    return parsed;
  } catch (error) {
    const nodeError =
      error as NodeJS.ErrnoException;

    /**
     * Bestand bestaat nog niet.
     * Dat is bij de eerste run normaal.
     */
    if (nodeError.code === "ENOENT") {
      return EMPTY_STORE;
    }

    throw error;
  }
}

/**
 * Schrijf de volledige review store.
 */
async function writeReviewStore(
  store: ReviewStore,
): Promise<void> {
  await fs.writeFile(
    REVIEW_STORE_PATH,
    JSON.stringify(
      store,
      null,
      2,
    ),
    "utf8",
  );
}

/**
 * Zoek de meest recente review
 * van één bedrijf.
 */
export async function getLatestStoredCompanyReview(
  companyId: string,
): Promise<StoredCompanyReview | null> {
  const store =
    await readReviewStore();

  const sorted =
    [...store.reviews].sort(
      (a, b) =>
        b.reviewDate.localeCompare(
          a.reviewDate,
        ),
    );

  for (const review of sorted) {
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

export async function getCompanyReviewHistory(
  companyId: string,
): Promise<StoredCompanyReview[]> {
  const store =
    await readReviewStore();

  return store.reviews
    .map(
      (monthlyReview) =>
        monthlyReview.companies[
          companyId
        ] ?? null,
    )
    .filter(
      (
        review,
      ): review is StoredCompanyReview =>
        review !== null,
    )
    .sort(
      (a, b) =>
        a.reviewDate.localeCompare(
          b.reviewDate,
        ),
    );
}

export type InvestmentDeteriorationTrend = {
  latestScore: number | null;
  previousScore: number | null;

  latestChange: number | null;
  totalChange: number | null;

  consecutiveDeclines: number;

  reviewCount: number;
};

export async function calculateInvestmentDeteriorationTrend(
  companyId: string,
): Promise<InvestmentDeteriorationTrend> {
  const history =
    await getCompanyReviewHistory(
      companyId,
    );

  const scoredHistory =
    history.filter(
      (
        review,
      ): review is StoredCompanyReview & {
        investmentScore: number;
      } =>
        review.investmentScore !== null,
    );

  const reviewCount =
    scoredHistory.length;

  if (reviewCount === 0) {
    return {
      latestScore: null,
      previousScore: null,

      latestChange: null,
      totalChange: null,

      consecutiveDeclines: 0,

      reviewCount: 0,
    };
  }

  const latest =
    scoredHistory[
      scoredHistory.length - 1
    ];

  const previous =
    scoredHistory.length >= 2
      ? scoredHistory[
          scoredHistory.length - 2
        ]
      : null;

  const first =
    scoredHistory[0];

  const latestChange =
    previous !== null
      ? latest.investmentScore -
        previous.investmentScore
      : null;

  const totalChange =
    scoredHistory.length >= 2
      ? latest.investmentScore -
        first.investmentScore
      : null;

  let consecutiveDeclines = 0;

  for (
    let index =
      scoredHistory.length - 1;
    index > 0;
    index -= 1
  ) {
    const current =
      scoredHistory[index];

    const prior =
      scoredHistory[
        index - 1
      ];

    if (
      current.investmentScore <
      prior.investmentScore
    ) {
      consecutiveDeclines += 1;
    } else {
      break;
    }
  }

  return {
    latestScore:
      latest.investmentScore,

    previousScore:
      previous?.investmentScore ??
      null,

    latestChange,
    totalChange,

    consecutiveDeclines,

    reviewCount,
  };
}

export type InvestmentDeteriorationAssessment = {
  pressureScore: number | null;

  latestDecline: number | null;
  totalDecline: number | null;

  consecutiveDeclines: number;

  reason: string | null;
};

export async function calculateInvestmentDeteriorationAssessment({
  companyId,
  currentInvestmentScore,
}: {
  companyId: string;
  currentInvestmentScore: number | null;
}): Promise<InvestmentDeteriorationAssessment> {
  const history =
    await getCompanyReviewHistory(
      companyId,
    );

  const scoredHistory =
    history.filter(
      (
        review,
      ): review is StoredCompanyReview & {
        investmentScore: number;
      } =>
        review.investmentScore !== null,
    );

  /**
   * Zonder huidige score of eerdere
   * historische score kunnen we geen
   * deterioration bepalen.
   *
   * Belangrijk: null betekent
   * ONVOLDOENDE DATA, niet pressure 0.
   */
  if (
    currentInvestmentScore === null ||
    scoredHistory.length === 0
  ) {
    return {
      pressureScore: null,

      latestDecline: null,
      totalDecline: null,

      consecutiveDeclines: 0,

      reason: null,
    };
  }

  const latestStored =
    scoredHistory[
      scoredHistory.length - 1
    ];

  const firstStored =
    scoredHistory[0];

  const latestChange =
    currentInvestmentScore -
    latestStored.investmentScore;

  const totalChange =
    currentInvestmentScore -
    firstStored.investmentScore;

  const latestDecline =
    Math.max(
      0,
      -latestChange,
    );

  const totalDecline =
    Math.max(
      0,
      -totalChange,
    );

  /**
   * Tel historische dalingen vanaf
   * achteren, inclusief de overgang
   * van de laatste review naar NU.
   */
  let consecutiveDeclines = 0;

  if (
    currentInvestmentScore <
    latestStored.investmentScore
  ) {
    consecutiveDeclines = 1;

    for (
      let index =
        scoredHistory.length - 1;
      index > 0;
      index -= 1
    ) {
      const current =
        scoredHistory[index];

      const previous =
        scoredHistory[
          index - 1
        ];

      if (
        current.investmentScore <
        previous.investmentScore
      ) {
        consecutiveDeclines += 1;
      } else {
        break;
      }
    }
  }

  const latestPressure =
    latestDecline * 6;

  const trendPressure =
    totalDecline * 3;

  const consecutivePressure =
    consecutiveDeclines >= 3
      ? 20
      : consecutiveDeclines === 2
        ? 10
        : 0;

  const pressureScore =
    Math.max(
      0,
      Math.min(
        100,
        latestPressure +
          trendPressure +
          consecutivePressure,
      ),
    );

  let reason: string | null =
    null;

  if (
    consecutiveDeclines >= 3
  ) {
    reason =
      `Investment Score daalt al ${consecutiveDeclines} reviews op rij.`;
  } else if (
    totalDecline >= 8
  ) {
    reason =
      `Investment Score is sinds de eerste opgeslagen review ${totalDecline.toFixed(
        1,
      )} punten gedaald.`;
  } else if (
    latestDecline >= 5
  ) {
    reason =
      `Investment Score daalde sinds de vorige review ${latestDecline.toFixed(
        1,
      )} punten.`;
  }

  return {
    pressureScore,

    latestDecline,
    totalDecline,

    consecutiveDeclines,

    reason,
  };
}

/**
 * Sla één bedrijfsreview op.
 *
 * Bestaat er al een portfolio-review
 * voor deze datum, dan voegen we het
 * bedrijf daaraan toe.
 *
 * Bestaat voor dezelfde datum al een
 * review van dit bedrijf, dan wordt
 * die bijgewerkt.
 */
export async function saveCompanyReview(
  review: StoredCompanyReview,
): Promise<void> {
  const store =
    await readReviewStore();

  let monthlyReview =
    store.reviews.find(
      (item) =>
        item.reviewDate ===
        review.reviewDate,
    );

  if (!monthlyReview) {
    monthlyReview = {
      reviewDate:
        review.reviewDate,

      companies: {},
    };

    store.reviews.push(
      monthlyReview,
    );
  }

  monthlyReview.companies[
    review.companyId
  ] = review;

  store.reviews.sort(
    (a, b) =>
      a.reviewDate.localeCompare(
        b.reviewDate,
      ),
  );

  await writeReviewStore(
    store,
  );
}