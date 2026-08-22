"use client";

import {
  useEffect,
  useState,
} from "react";

type ReportPeriod =
  | "week"
  | "month";

type PortfolioPeriodSummary = {
  snapshotCount: number;

  startValueEur: number;
  endValueEur: number;

  differenceEur: number;
  returnPercent: number;

  positions: {
  companyId: string;
  companyName: string;

  startMarketValueEur: number;
    endMarketValueEur: number;

    marketValueDifferenceEur: number;

    startAllocationPercent: number;
    endAllocationPercent: number;

    allocationDifferencePercent: number;
  }[];
};

type HistoryResponse = {
  success: boolean;

  workspaceId: string;
  workspaceName: string;

  period: ReportPeriod;

  summary: PortfolioPeriodSummary;

  netTransactionFlowEur: number;
adjustedDifferenceEur: number | null;
adjustedReturnPercent: number | null;

  transactions: {
    id: string;
    holdingId: string;
    companyName: string;
    type: "buy" | "sell";
    quantity: number;
    price: number | null;
    currency: string | null;
    date: string;
    costs: number | null;
    note?: string;
  }[];

  error?: string;
};

function formatEur(
  value: number,
): string {
  return new Intl.NumberFormat(
    "nl-NL",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatPercent(
  value: number,
): string {
  return (
    new Intl.NumberFormat(
      "nl-NL",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(value) + "%"
  );
}

export default function PortfolioReportPage() {
  const [
    period,
    setPeriod,
  ] = useState<ReportPeriod>(
    "week",
  );

  const [
    data,
    setData,
  ] = useState<HistoryResponse | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            `/api/workspaces/history?period=${period}`,
            {
              cache: "no-store",
            },
          );

        const result =
          (await response.json()) as
            HistoryResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ??
              "Rapport kon niet worden geladen.",
          );
        }

        if (!cancelled) {
          setData(result);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setData(null);

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Rapport kon niet worden geladen.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [period]);

const biggestGainer =
  data?.summary.positions
    .filter(
      (position) =>
        position.marketValueDifferenceEur > 0,
    )
    .sort(
      (a, b) =>
        b.marketValueDifferenceEur -
        a.marketValueDifferenceEur,
    )[0] ?? null;

const biggestDecliner =
  data?.summary.positions
    .filter(
      (position) =>
        position.marketValueDifferenceEur < 0,
    )
    .sort(
      (a, b) =>
        a.marketValueDifferenceEur -
        b.marketValueDifferenceEur,
    )[0] ?? null;
  
  return (
    <main className="page-shell">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              PORTFOLIO REPORT
            </p>

            <h1>
              {data?.workspaceName ??
                "Portfolio-overzicht"}
            </h1>

            <p>
              Bekijk de ontwikkeling van
              de actieve portefeuille.
            </p>
          </div>

          <div className="metal-scenario-actions">
            <button
              type="button"
              className={
                period === "week"
                  ? "primary-button"
                  : "secondary-button"
              }
              onClick={() =>
                setPeriod("week")
              }
            >
              Week
            </button>

            <button
              type="button"
              className={
                period === "month"
                  ? "primary-button"
                  : "secondary-button"
              }
              onClick={() =>
                setPeriod("month")
              }
            >
              Maand
            </button>

            <button
  type="button"
  className="secondary-button"
  onClick={() =>
    window.print()
  }
>
  Exporteren / PDF
</button>
          </div>
        </div>

        {loading && (
          <p>
            Rapport laden...
          </p>
        )}

        {error && (
          <p className="workspace-selector-error">
            {error}
          </p>
        )}

        {!loading &&
          data &&
          data.summary.snapshotCount < 2 && (
            <p>
              Er is nog onvoldoende
              historische data om de
              ontwikkeling over deze
              periode te berekenen.
            </p>
          )}
{!loading && data && (
  <div className="stats-grid">
    <div className="stat-card">
      <span className="stat-label">
        Beginwaarde
      </span>

      <strong>
        {formatEur(
          data.summary.startValueEur,
        )}
      </strong>
    </div>

    <div className="stat-card">
      <span className="stat-label">
        Eindwaarde
      </span>

      <strong>
        {formatEur(
          data.summary.endValueEur,
        )}
      </strong>
    </div>

    <div
      className={
        data.adjustedDifferenceEur === null
          ? "stat-card"
          : data.adjustedDifferenceEur >= 0
            ? "stat-card tone-green"
            : "stat-card tone-red"
      }
    >
      <span className="stat-label">
        Beleggingsresultaat
      </span>

      <strong>
        {data.adjustedDifferenceEur === null
          ? "—"
          : `${
              data.adjustedDifferenceEur >= 0
                ? "+"
                : ""
            }${formatEur(
              data.adjustedDifferenceEur,
            )}`}
      </strong>

      <small>
        Gecorrigeerd voor transacties
      </small>
    </div>

    <div
      className={
        data.adjustedReturnPercent === null
          ? "stat-card"
          : data.adjustedReturnPercent >= 0
            ? "stat-card tone-green"
            : "stat-card tone-red"
      }
    >
      <span className="stat-label">
        Rendement
      </span>

      <strong>
        {data.adjustedReturnPercent === null
          ? "—"
          : `${
              data.adjustedReturnPercent >= 0
                ? "+"
                : ""
            }${formatPercent(
              data.adjustedReturnPercent,
            )}`}
      </strong>

      <small>
        Gecorrigeerd voor transacties
      </small>
    </div>
  </div>
)}

{!loading &&
  data &&
  data.summary.positions.length > 0 && (
    <div
      style={{
        marginTop: "24px",
      }}
    >
      <p className="eyebrow">
        POSITIE-ONTWIKKELING
      </p>

      <div className="compact-table-wrap">
        <table className="data-table wide-table">
          <thead>
            <tr>
              <th>Bedrijf</th>
              <th>Beginwaarde</th>
              <th>Eindwaarde</th>
              <th>Verschil</th>
              <th>Allocatie</th>
            </tr>
          </thead>

          <tbody>
            {data.summary.positions.map(
              (position) => (
                <tr key={position.companyId}>
                  <td>
                    <strong>
                      {position.companyName}
                    </strong>
                  </td>

                  <td>
                    {formatEur(
                      position.startMarketValueEur,
                    )}
                  </td>

                  <td>
                    {formatEur(
                      position.endMarketValueEur,
                    )}
                  </td>

                  <td>
                    <strong>
                      {position.marketValueDifferenceEur >=
                      0
                        ? "+"
                        : ""}

                      {formatEur(
                        position.marketValueDifferenceEur,
                      )}
                    </strong>
                  </td>

                  <td>
                    {formatPercent(
                      position.startAllocationPercent,
                    )}
                    {" → "}
                    {formatPercent(
                      position.endAllocationPercent,
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}

{!loading &&
  data &&
  data.transactions.length > 0 && (
    <div
      style={{
        marginTop: "24px",
      }}
    >
      <p className="eyebrow">
        TRANSACTIES IN DEZE PERIODE
      </p>

      <div className="compact-table-wrap">
        <table className="data-table wide-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Type</th>
              <th>Holding</th>
              <th>Aantal</th>
              <th>Prijs</th>
              <th>Valuta</th>
            </tr>
          </thead>

          <tbody>
            {data.transactions.map(
              (transaction) => (
                <tr key={transaction.id}>
                  <td>
                    {new Date(
                      transaction.date,
                    ).toLocaleDateString(
                      "nl-NL",
                    )}
                  </td>

                  <td>
                    <strong>
                      {transaction.type ===
                      "buy"
                        ? "Aankoop"
                        : "Verkoop"}
                    </strong>
                  </td>

                  <td>
                    {transaction.companyName}
                  </td>

                  <td>
                    {transaction.quantity.toLocaleString(
                      "nl-NL",
                    )}
                  </td>

                  <td>
                    {transaction.price !== null
                      ? transaction.price.toLocaleString(
                          "nl-NL",
                          {
                            minimumFractionDigits:
                              2,
                            maximumFractionDigits:
                              6,
                          },
                        )
                      : "—"}
                  </td>

                  <td>
                    {transaction.currency ??
                      "—"}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}

{!loading && data && (
  <div
    style={{
      marginTop: "16px",
    }}
  >
    <p>
      Netto transacties in deze periode:{" "}
      <strong>
        {data.netTransactionFlowEur >= 0
          ? "+"
          : ""}
        {formatEur(
          data.netTransactionFlowEur,
        )}
      </strong>
    </p>

    <small>
      Positief betekent netto verkoopopbrengst,
      negatief betekent netto aankopen.
    </small>
  </div>
)}

      </section>
    </main>
  );
}