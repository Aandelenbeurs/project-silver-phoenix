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