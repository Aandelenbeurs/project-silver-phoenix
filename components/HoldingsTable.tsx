"use client";

import {
  determinePortfolioAdviceV2,
} from "../data/portfolio-advice-v2";

import { useMemo, useState } from "react";

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
  | "allocation"
  | "difference"
  | "name";

type SortDirection =
  | "asc"
  | "desc";

import type {
  PortfolioV2Result,
} from "../data/portfolio-v2";

type HoldingsTableProps = {
  positions: ValuedPortfolioPosition[];
  portfolioV2: PortfolioV2Result;
  investmentScores:
    Record<string, number | null>;
};

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
  portfolioV2,
  investmentScores,
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

    const [editingHoldingId, setEditingHoldingId] =
  useState<string | null>(null);

const [editingQuantity, setEditingQuantity] =
  useState("");

const [isSavingQuantity, setIsSavingQuantity] =
  useState(false);

const [quantityError, setQuantityError] =
  useState<string | null>(null);

const [
  pendingQuantityChange,
  setPendingQuantityChange,
] = useState<{
  holdingId: string;
  name: string;
  oldQuantity: number;
  newQuantity: number;
} | null>(null);

function getPhoenixAdvice(
  position: ValuedPortfolioPosition,
) {

  if (!position.isEquity) {
  return "APART";
}

  const phoenixPosition =
    portfolioV2.positions.find(
      (item) =>
        item.companyId ===
        position.company?.id,
    );

  const investmentScore =
    position.company?.id
      ? investmentScores[position.company.id] ?? null
      : null;

  return determinePortfolioAdviceV2({
    currentAllocation:
      phoenixPosition?.allocationPercent ?? null,
    idealMin:
      phoenixPosition?.idealMin ?? null,
    idealMax:
      phoenixPosition?.idealMax ?? null,
    hardMax:
      phoenixPosition?.hardMax ?? null,
    investmentScore,
  });
}

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
  getPhoenixAdvice(position) ===
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

  function startEditing(
  position: ValuedPortfolioPosition,
): void {
  setEditingHoldingId(position.holding.id);

  setEditingQuantity(
    String(position.quantity),
  );

  setQuantityError(null);
}

function cancelEditing(): void {
  if (isSavingQuantity) {
    return;
  }

  setEditingHoldingId(null);
  setEditingQuantity("");
  setQuantityError(null);
}

function prepareQuantityChange(
  position: ValuedPortfolioPosition,
): void {
  const normalizedQuantity =
    editingQuantity
      .trim()
      .replace(",", ".");

  const quantity =
    Number(normalizedQuantity);

  if (
    normalizedQuantity.length === 0 ||
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    setQuantityError(
      "Vul een geldig aantal van 0 of hoger in.",
    );

    return;
  }

  if (quantity === position.quantity) {
    setEditingHoldingId(null);
    setEditingQuantity("");
    setQuantityError(null);

    return;
  }

  setPendingQuantityChange({
    holdingId: position.holding.id,
    name: position.name,
    oldQuantity: position.quantity,
    newQuantity: quantity,
  });

  setQuantityError(null);
}

async function confirmQuantityChange(): Promise<void> {
  if (
    pendingQuantityChange === null ||
    isSavingQuantity
  ) {
    return;
  }

  setIsSavingQuantity(true);
  setQuantityError(null);

  try {
    const response = await fetch(
      "/api/workspaces/holdings",
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          holdingId:
            pendingQuantityChange.holdingId,
          quantity:
            pendingQuantityChange.newQuantity,
        }),
      },
    );

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
    };

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ??
          "Het aantal kon niet worden opgeslagen.",
      );
    }

    setPendingQuantityChange(null);
    setEditingHoldingId(null);
    setEditingQuantity("");

    window.location.reload();
  } catch (saveError) {
    setQuantityError(
      saveError instanceof Error
        ? saveError.message
        : "Onbekende fout bij het opslaan.",
    );
  } finally {
    setIsSavingQuantity(false);
  }
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
                    toggleSort("name")
                  }
                >
                  Bedrijf
                  {sortIndicator("name")}
                </button>
              </th>

              <th>Aantal</th>
              <th>Live koers</th>

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
<th>Opportunity</th>
<th>Investment</th>
<th>Ideal band</th>
<th>Hard max</th>
<th>Phoenix advies</th>
            </tr>
          </thead>

          <tbody>
            {filteredPositions.map(
              (position) => {
                const phoenixPosition =
  portfolioV2.positions.find(
    (item) =>
      item.companyId ===
      position.company?.id,
  );

  const investmentScore =
  position.company?.id
    ? investmentScores[position.company.id] ?? null
    : null;

const phoenixAdvice =
  determinePortfolioAdviceV2({
    currentAllocation:
      phoenixPosition?.allocationPercent ?? null,

    idealMin:
      phoenixPosition?.idealMin ?? null,

    idealMax:
      phoenixPosition?.idealMax ?? null,

    hardMax:
      phoenixPosition?.hardMax ?? null,

    investmentScore,
  });

                return (
                  <tr key={position.id}>

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
                              {" - "}
                             {position.ticker ?? "—"}
  
                      </small>
                    </td>

                    <td>
  {editingHoldingId ===
  position.holding.id ? (
    <div className="quantity-editor">
      <input
        type="text"
        inputMode="decimal"
        value={editingQuantity}
        onChange={(event) =>
          setEditingQuantity(
            event.target.value,
          )
        }
        disabled={isSavingQuantity}
        aria-label={`Aantal ${position.name}`}
        autoFocus
      />

      <button
        type="button"
        className="quantity-save-button"
        onClick={() =>
          prepareQuantityChange(position)
        }
        disabled={isSavingQuantity}
        title="Doorgaan naar bevestiging"
      >
        Doorgaan
      </button>

      <button
        type="button"
        className="quantity-cancel-button"
        onClick={cancelEditing}
        disabled={isSavingQuantity}
        title="Annuleren"
      >
        Annuleren
      </button>

      {quantityError && (
        <small className="quantity-error">
          {quantityError}
        </small>
      )}
    </div>
  ) : (
    <button
      type="button"
      className="quantity-edit-button"
      onClick={() =>
        startEditing(position)
      }
      title="Aantal aanpassen"
    >
      {formatQuantity(
        position.quantity,
      )}
      <span aria-hidden="true">
        ✎
      </span>
    </button>
  )}
</td>

                    <td>
  {formatLocalPrice(
    position.quote.price,
  )}
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

<td className="score-cell">
  {phoenixPosition?.opportunity !== null &&
  phoenixPosition?.opportunity !== undefined
    ? phoenixPosition.opportunity.toFixed(1)
    : "—"}
</td>

<td className="score-cell">
  {position.company?.id &&
  investmentScores[
    position.company.id
  ] !== null &&
  investmentScores[
    position.company.id
  ] !== undefined
    ? investmentScores[
        position.company.id
      ]!.toFixed(1)
    : "—"}
</td>

<td>
  {phoenixPosition?.idealMin !== null &&
  phoenixPosition?.idealMin !== undefined &&
  phoenixPosition?.idealMax !== null &&
  phoenixPosition?.idealMax !== undefined
    ? `${phoenixPosition.idealMin.toFixed(1)}% – ${phoenixPosition.idealMax.toFixed(1)}%`
    : "—"}
</td>

<td>
  {phoenixPosition?.hardMax !== null &&
  phoenixPosition?.hardMax !== undefined
    ? `${phoenixPosition.hardMax.toFixed(1)}%`
    : "—"}
</td>

<td>
  <strong>
    {phoenixAdvice}
  </strong>
</td>

                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      {pendingQuantityChange && (
        <div
          className="quantity-confirm-backdrop"
          role="presentation"
        >
          <div
            className="quantity-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quantity-confirm-title"
          >
            <p className="eyebrow">
              WIJZIGING BEVESTIGEN
            </p>

            <h3 id="quantity-confirm-title">
              {pendingQuantityChange.name}
            </h3>

            <div className="quantity-confirm-grid">
              <span>Huidig aantal</span>
              <strong>
                {formatQuantity(
                  pendingQuantityChange.oldQuantity,
                )}
              </strong>

              <span>Nieuw aantal</span>
              <strong>
                {formatQuantity(
                  pendingQuantityChange.newQuantity,
                )}
              </strong>

              <span>Verschil</span>
              <strong>
                {formatQuantity(
                  pendingQuantityChange.newQuantity -
                    pendingQuantityChange.oldQuantity,
                )}
              </strong>
            </div>

            <p className="quantity-confirm-warning">
              Controleer het nieuwe aantal zorgvuldig.
              Na bevestigen wordt de actieve workspace
              direct aangepast.
            </p>

            {quantityError && (
              <p className="workspace-selector-error">
                {quantityError}
              </p>
            )}

            <div className="quantity-confirm-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (!isSavingQuantity) {
                    setPendingQuantityChange(null);
                  }
                }}
                disabled={isSavingQuantity}
              >
                Annuleren
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  void confirmQuantityChange()
                }
                disabled={isSavingQuantity}
              >
                {isSavingQuantity
                  ? "Opslaan..."
                  : "Bevestigen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}