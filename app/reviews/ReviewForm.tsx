"use client";

import {
  useState,
} from "react";

import {
  saveReviewAction,
} from "./actions";

import {
  type ThesisHealth,
} from "../../data/exit-engine";

export default function ReviewForm({
  companyId,
  currentInvestmentScore,
  previousThesisHealth,
}: {
  companyId: string;
  currentInvestmentScore: number | null;
  previousThesisHealth: ThesisHealth;
}) {
 
    const [thesisHealth, setThesisHealth] =
  useState<ThesisHealth>(
    previousThesisHealth,
  );

  const [isOpen, setIsOpen] =
  useState(false);

  const [thesisNote, setThesisNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const today =
        new Date()
          .toISOString()
          .slice(0, 10);

      await saveReviewAction({
        companyId,
        reviewDate: today,

        investmentScore:
          currentInvestmentScore,

        thesisHealth,

        thesisNote:
          thesisNote.trim() ||
          null,
      });

      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

return (
  <>
    <button
      type="button"
      className="review-toggle"
      onClick={() =>
        setIsOpen(
          (current) => !current,
        )
      }
    >
      {isOpen
        ? "Sluiten"
        : previousThesisHealth ===
            "UNKNOWN"
          ? "Review"
          : "Bekijken"}
    </button>

    {isOpen && (
      <div className="review-editor">
        <div className="review-thesis-buttons">
          {(
            [
              "INTACT",
              "WEAKENING",
              "BROKEN",
            ] as ThesisHealth[]
          ).map((status) => (
            <button
              key={status}
              type="button"
              className={
                thesisHealth === status
                  ? "active"
                  : ""
              }
              onClick={() =>
                setThesisHealth(
                  status,
                )
              }
              disabled={saving}
            >
              {thesisHealth === status
                ? `✓ ${status}`
                : status}
            </button>
          ))}
        </div>

        <textarea
          value={thesisNote}
          onChange={(event) =>
            setThesisNote(
              event.target.value,
            )
          }
          placeholder="Optionele thesis-notitie..."
          disabled={saving}
          rows={3}
        />

        <div className="review-save-row">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving ||
              thesisHealth === "UNKNOWN"
            }
          >
            {saving
              ? "Opslaan..."
              : thesisHealth ===
                    "UNKNOWN"
                ? "Selecteer thesis"
                : "Review opslaan"}
          </button>

          {saved && (
            <small>
              ✓ Review opgeslagen
            </small>
          )}
        </div>
      </div>
    )}
  </>
);
}