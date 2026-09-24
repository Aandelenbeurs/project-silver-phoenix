import fs from "fs/promises";
import path from "path";

/**
 * Phoenix Entry Review status.
 *
 * WAIT
 * Geen reden voor actieve opvolging.
 * Belangrijke entry-voorwaarden zijn nog onvoldoende gerealiseerd.
 *
 * WATCH
 * Betekenisvolle positieve ontwikkeling.
 * Verhoogde aandacht is gerechtvaardigd, maar belangrijke
 * entry-voorwaarden ontbreken nog.
 *
 * REVIEW
 * Een belangrijke entry-trigger is gerealiseerd of de
 * investment case is materieel veranderd.
 * Een volledige nieuwe Phoenix-beoordeling is nodig.
 *
 * CANDIDATE
 * De volledige Phoenix-herbeoordeling is uitgevoerd en
 * het bedrijf voldoet aan de criteria om als actieve
 * instapkandidaat te worden beschouwd.
 *
 * CANDIDATE is geen automatische koopopdracht.
 */
export type EntryStatus =
  | "WAIT"
  | "WATCH"
  | "REVIEW"
  | "CANDIDATE";

export type EntryReview = {
  companyId: string;
  reviewDate: string;
  entryStatus: EntryStatus;
  entryNote: string;
};

export type EntryReviewSnapshot = {
  reviewDate: string;
  companies: Record<
    string,
    EntryReview
  >;
};

export type EntryReviewStore = {
  reviews: EntryReviewSnapshot[];
};

const filePath = path.join(
  process.cwd(),
  "data",
  "entry-reviews.json",
);

const emptyStore: EntryReviewStore = {
  reviews: [],
};

export async function readEntryReviewStore(): Promise<EntryReviewStore> {
  try {
    const raw =
      await fs.readFile(
        filePath,
        "utf8",
      );

    return JSON.parse(
      raw,
    ) as EntryReviewStore;
  } catch (error) {
    const nodeError =
      error as NodeJS.ErrnoException;

    if (
      nodeError.code === "ENOENT"
    ) {
      return emptyStore;
    }

    throw error;
  }
}

export async function writeEntryReviewStore(
  store: EntryReviewStore,
): Promise<void> {
  await fs.writeFile(
    filePath,
    JSON.stringify(
      store,
      null,
      2,
    ),
    "utf8",
  );
}

export async function saveEntryReview(
  entryReview: EntryReview,
): Promise<void> {
  const store =
    await readEntryReviewStore();

  let snapshot =
    store.reviews.find(
      (review) =>
        review.reviewDate ===
        entryReview.reviewDate,
    );

  if (!snapshot) {
    snapshot = {
      reviewDate:
        entryReview.reviewDate,
      companies: {},
    };

    store.reviews.push(
      snapshot,
    );
  }

  snapshot.companies[
    entryReview.companyId
  ] = entryReview;

  store.reviews.sort(
    (a, b) =>
      b.reviewDate.localeCompare(
        a.reviewDate,
      ),
  );

  await writeEntryReviewStore(
    store,
  );
}

export function getLatestEntryReview(
  store: EntryReviewStore,
  companyId: string,
): EntryReview | null {
  const reviews =
    [...store.reviews].sort(
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