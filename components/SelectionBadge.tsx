export type SelectionGroup =
  | "Kernpositie"
  | "Behouden"
  | "Afbouwen"
  | "Uitstappen / watchlist"
  | "Nog beoordelen"
  | "Apart";

export function selectionGroup(
  score?: number,
  category?: string,
): SelectionGroup {
  if (
    category === "ETF" ||
    category === "Fysiek" ||
    category === "apart"
  ) {
    return "Apart";
  }

  if (score === undefined) {
    return "Nog beoordelen";
  }

  if (score >= 95) {
    return "Kernpositie";
  }

  if (score >= 90) {
    return "Behouden";
  }

  if (score >= 84) {
    return "Afbouwen";
  }

  return "Uitstappen / watchlist";
}

export default function SelectionBadge({
  group,
}: {
  group: SelectionGroup;
}) {
  const cls =
    group === "Kernpositie"
      ? "badge-core"
      : group === "Behouden"
        ? "badge-keep"
        : group === "Afbouwen"
          ? "badge-reduce"
          : group === "Apart"
            ? "badge-apart"
            : group === "Nog beoordelen"
              ? "badge-review"
              : "badge-exit";

  return (
    <span className={`selection-badge ${cls}`}>
      {group}
    </span>
  );
}