"use client";

import { useMemo, useState } from "react";

import SelectionBadge, {
  type SelectionGroup,
} from "./SelectionBadge";

import {
  type ValuedPortfolioPosition,
} from "../data/portfolio-engine";

import {
  formatEur,
  formatPercent,
} from "../data/prices";

type SortKey =
  | "value"
  | "rank"
  | "score"
  | "allocation"
  | "difference"
  | "name";

type SortDirection =
  | "asc"
  | "desc";

type HoldingsTableProps = {
  positions: ValuedPortfolioPosition[];
};

function adviceToSelectionGroup(
  position: ValuedPortfolioPosition,
): SelectionGroup {
  if (position.advice === "NOG BEOORDELEN") {
    return "Nog beoordelen";
  }

  if (position.advice === "APART") {
    return "Apart";
  }

  if (position.advice === "UITSTAPPEN") {
    return "Uitstappen / watchlist";
  }

  if (
    position.advice === "AFBOUWEN" ||
    position.advice === "NIET BIJKOPEN"
  ) {
    return "Afbouwen";
  }

  if (position.status === "core") {
    return "Kernpositie";
  }

  return "Behouden";
}

function formatLocalPrice(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatQuantity(
  value: number,
): string {
  return value.toLocaleString("nl-NL", {
    maximumFractionDigits: 6,
  });
}

function compareNullableNumbers(
  a: number | null,
  b: number | null,
): number {
  if (a === null && b === null) {
    return 0;
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  return a - b;
}

export default function HoldingsTable({
  positions,
}: HoldingsTableProps) {
  const [search, setSearch] = useState("");

  const [metalFilter, setMetalFilter] =
    useState("all");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [adviceFilter, setAdviceFilter] =
    useState("all");

  const [sortKey, setSortKey] =
    useState<SortKey>("value");

  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const filteredPositions = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    const filtered = positions.filter(
      (position) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          position.name
            .toLowerCase()
            .includes(normalizedSearch) ||
          (position.ticker ?? "")
            .toLowerCase()
            .includes(normalizedSearch);

        const commodity =
          position.company?.commodity ??
          "apart";

        const matchesMetal =
          metalFilter === "all" ||
          commodity === metalFilter;

        const matchesType =
          typeFilter === "all" ||
          position.holding.type ===
            typeFilter;

        const matchesAdvice =
          adviceFilter === "all" ||
          position.advice ===
            adviceFilter;

        return (
          matchesSearch &&
          matchesMetal &&
          matchesType &&
          matchesAdvice
        );
      },
    );

    return [...filtered].sort(
      (a, b) => {
        let comparison = 0;

        switch (sortKey) {
          case "rank":
            comparison =
              compareNullableNumbers(
                a.rank,
                b.rank,
              );
            break;

          case "score":
            comparison =
              compareNullableNumbers(
                a.masterScore,
                b.masterScore,
              );
            break;

          case "allocation":
            comparison =
              compareNullableNumbers(
                a.currentAllocation,
                b.currentAllocation,
              );
            break;

          case "difference":
            comparison =
              compareNullableNumbers(
                a.allocationDifference,
                b.allocationDifference,
              );
            break;

          case "name":
            comparison =
              a.name.localeCompare(
                b.name,
                "nl",
              );
            break;

          case "value":
          default:
            comparison =
              compareNullableNumbers(
                a.marketValueEur,
                b.marketValueEur,
              );
            break;
        }

        return sortDirection === "asc"
          ? comparison
          : -comparison;
      },
    );
  }, [
    positions,
    search,
    metalFilter,
    typeFilter,
    adviceFilter,
    sortKey,
    sortDirection,
  ]);

  function toggleSort(
    nextSortKey: SortKey,
  ): void {
    if (sortKey === nextSortKey) {
      setSortDirection(
        sortDirection === "asc"
          ? "desc"
          : "asc",
      );

      return;
    }

    setSortKey(nextSortKey);

    setSortDirection(
      nextSortKey === "name" ||
        nextSortKey === "rank"
        ? "asc"
        : "desc",
    );
  }

  function sortIndicator(
    key: SortKey,
  ): string {
    if (sortKey !== key) {
      return "";
    }

    return sortDirection === "asc"
      ? " ↑"
      : " ↓";
  }

  function resetFilters(): void {
    setSearch("");
    setMetalFilter("all");
    setTypeFilter("all");
    setAdviceFilter("all");
    setSortKey("value");
    setSortDirection("desc");
  }

  return (
    <>
      <div className="holdings-toolbar">
        <label className="holdings-search">
          <span>Zoeken</span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Bedrijf of ticker"
          />
        </label>

        <label>
          <span>Metaal</span>

          <select
            value={metalFilter}
            onChange={(event) =>
              setMetalFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              Alle metalen
            </option>

            <option value="silver">
              Zilver
            </option>

            <option value="gold">
              Goud
            </option>

            <option value="mixed">
              Gemengd
            </option>

            <option value="apart">
              Apart
            </option>
          </select>
        </label>

        <label>
          <span>Type</span>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              Alle typen
            </option>

            <option value="equity">
              Aandelen
            </option>

            <option value="etf">
              ETF / ETC
            </option>

            <option value="physical">
              Fysiek
            </option>
          </select>
        </label>

        <label>
          <span>Advies</span>

          <select
            value={adviceFilter}
            onChange={(event) =>
              setAdviceFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              Alle adviezen
            </option>

            <option value="STERK BIJKOPEN">
              Sterk bijkopen
            </option>

            <option value="BIJKOPEN">
              Bijkopen
            </option>

            <option value="OP DOEL">
              Op doel
            </option>

            <option value="NIET BIJKOPEN">
              Niet bijkopen
            </option>

            <option value="AFBOUWEN">
              Afbouwen
            </option>

            <option value="UITSTAPPEN">
              Uitstappen
            </option>

            <option value="NOG BEOORDELEN">
              Nog beoordelen
            </option>

            <option value="APART">
              Apart
            </option>
          </select>
        </label>

        <button
          type="button"
          className="secondary-button"
          onClick={resetFilters}
        >
          Reset
        </button>
      </div>

      <div className="holdings-results">
        <strong>
          {filteredPositions.length}
        </strong>{" "}
        van {positions.length} posities
      </div>

      <div className="compact-table-wrap">
        <table className="data-table wide-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() =>
                    toggleSort("rank")
                  }
                >
                  Rang
                  {sortIndicator("rank")}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() =>
                    toggleSort("name")
                  }
                >
                  Bedrijf
                  {sortIndicator("name")}
                </button>
              </th>

              <th>Ticker</th>
              <th>Aantal</th>
              <th>Koers</th>
              <th>Valuta</th>

              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() =>
                    toggleSort("value")
                  }
                >
                  Waarde
                  {sortIndicator("value")}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() =>
                    toggleSort(
                      "allocation",
                    )
                  }
                >
                  Actueel
                  {sortIndicator(
                    "allocation",
                  )}
                </button>
              </th>

              <th>Doel</th>

              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() =>
                    toggleSort(
                      "difference",
                    )
                  }
                >
                  Verschil
                  {sortIndicator(
                    "difference",
                  )}
                </button>
              </th>

              <th>Dag</th>

              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() =>
                    toggleSort("score")
                  }
                >
                  Score
                  {sortIndicator("score")}
                </button>
              </th>

              <th>Tier</th>
              <th>Advies</th>
            </tr>
          </thead>

          <tbody>
            {filteredPositions.map(
              (position) => {
                const group =
                  adviceToSelectionGroup(
                    position,
                  );

                return (
                  <tr key={position.id}>
                    <td className="rank-cell">
                      {position.rank !== null
                        ? `#${position.rank}`
                        : "—"}
                    </td>

                    <td>
                      <strong>
                        {position.name}
                      </strong>

                      <small className="cell-subtitle">
                        {position.holding
                          .type === "equity"
                          ? position.company
                              ?.commodity ??
                            "onbekend"
                          : position.holding
                                .type === "etf"
                            ? "ETF / ETC"
                            : "Fysiek"}
                      </small>
                    </td>

                    <td>
                      {position.ticker ??
                        "—"}
                    </td>

                    <td>
                      {formatQuantity(
                        position.quantity,
                      )}
                    </td>

                    <td>
                      {formatLocalPrice(
                        position.localPrice,
                      )}
                    </td>

                    <td>
                      {position.currency}
                    </td>

                    <td>
                      {formatEur(
                        position.marketValueEur,
                      )}
                    </td>

                    <td>
                      {formatPercent(
                        position.currentAllocation,
                      )}
                    </td>

                    <td>
                      {position.isEquity
                        ? `${position.targetAllocation.toFixed(
                            1,
                          )}%`
                        : "—"}
                    </td>

                    <td>
                      {position.allocationDifference !==
                      null
                        ? `${position.allocationDifference.toFixed(
                            2,
                          )}%`
                        : "—"}
                    </td>

                    <td>
                      {formatPercent(
                        position.quote
                          .dayChangePercent,
                      )}
                    </td>

                    <td className="score-cell">
                      {position.masterScore !==
                      null
                        ? position.masterScore.toFixed(
                            1,
                          )
                        : "—"}
                    </td>

                    <td>
                      {position.tier}
                    </td>

                    <td>
                      <SelectionBadge
                        group={group}
                      />
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}