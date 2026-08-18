"use server";

import {
  saveCompanyReview,
} from "../../data/review-store";

import {
  type ThesisHealth,
} from "../../data/exit-engine";

export async function saveReviewAction({
  companyId,
  reviewDate,
  investmentScore,
  thesisHealth,
  thesisNote,
}: {
  companyId: string;

  reviewDate: string;

  investmentScore: number | null;

  thesisHealth: ThesisHealth;

  thesisNote: string | null;
}) {
  await saveCompanyReview({
    companyId,
    reviewDate,
    investmentScore,
    thesisHealth,
    thesisNote,
  });

  return {
    success: true,
  };
}