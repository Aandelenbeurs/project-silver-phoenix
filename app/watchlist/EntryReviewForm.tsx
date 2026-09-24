"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  saveEntryReviewAction,
} from "./actions";

import type {
  EntryStatus,
} from "../../data/entry-review-store";

type Props = {
  companyId: string;
  previousEntryStatus: EntryStatus;
  previousEntryNote: string | null;
  reviewDue?: boolean;
};

export default function EntryReviewForm({
  companyId,
  previousEntryStatus,
  previousEntryNote,
   reviewDue = false,
}: Props) {
  const router = useRouter();

  const [
    entryStatus,
    setEntryStatus,
  ] = useState<EntryStatus>(
    previousEntryStatus,
  );

  const [
    entryNote,
    setEntryNote,
  ] = useState(
    previousEntryNote ?? "",
  );

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    saved,
    setSaved,
  ] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const formData =
        new FormData();

      formData.set(
        "companyId",
        companyId,
      );

      formData.set(
        "entryStatus",
        entryStatus,
      );

      formData.set(
        "entryNote",
        entryNote.trim(),
      );

      await saveEntryReviewAction(
        formData,
      );

      setSaved(true);
      router.refresh();
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
  : reviewDue
    ? "Review"
    : "Bekijken"}
      </button>

      {isOpen && (
        <div className="review-editor">
          <div className="review-thesis-buttons">
            {(
              [
                "WAIT",
                "WATCH",
                "REVIEW",
                "CANDIDATE",
              ] as EntryStatus[]
            ).map((status) => (
              <button
                key={status}
                type="button"
                className={
                  entryStatus === status
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setEntryStatus(
                    status,
                  )
                }
                disabled={saving}
              >
                {entryStatus === status
                  ? `✓ ${status}`
                  : status}
              </button>
            ))}
          </div>

          <textarea
            value={entryNote}
            onChange={(event) =>
              setEntryNote(
                event.target.value,
              )
            }
            placeholder="Entry-notitie: welke triggers zijn gerealiseerd of ontbreken nog?"
            disabled={saving}
            rows={3}
          />

          <div className="review-save-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? "Opslaan..."
                : "Entry review opslaan"}
            </button>

            {saved && (
              <small>
                ✓ Entry review opgeslagen
              </small>
            )}
          </div>
        </div>
      )}
    </>
  );
}