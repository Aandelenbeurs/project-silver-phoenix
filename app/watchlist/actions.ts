"use server";

import {
  EntryStatus,
  saveEntryReview,
} from "../../data/entry-review-store";

import {
  revalidatePath,
} from "next/cache";

export async function saveEntryReviewAction(
  formData: FormData,
) {
  const companyId =
    formData.get("companyId");

  const entryStatus =
    formData.get("entryStatus");

  const entryNote =
    formData.get("entryNote");

  if (
    typeof companyId !== "string" ||
    companyId.length === 0
  ) {
    throw new Error(
      "Company ID ontbreekt.",
    );
  }

  if (
    entryStatus !== "WAIT" &&
    entryStatus !== "WATCH" &&
    entryStatus !== "REVIEW" &&
    entryStatus !== "CANDIDATE"
  ) {
    throw new Error(
      "Ongeldige entry status.",
    );
  }

  if (
    typeof entryNote !== "string"
  ) {
    throw new Error(
      "Entry note ontbreekt.",
    );
  }

  const reviewDate =
    new Date()
      .toISOString()
      .slice(0, 10);

  await saveEntryReview({
    companyId,
    reviewDate,
    entryStatus:
      entryStatus as EntryStatus,
    entryNote:
      entryNote.trim(),
  });

  revalidatePath(
  "/watchlist",
);
}