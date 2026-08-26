"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReportPeriod =
  | "week"
  | "month"
  | "all";

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

  timeline: {
  date: string;
  totalMarketValueEur: number;
}[];

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

  const [
  includePositionDetailsInPdf,
  setIncludePositionDetailsInPdf,
] = useState(false);

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

const biggestGainers =
  data?.summary.positions
    .filter(
      (position) =>
        position.marketValueDifferenceEur > 0,
    )
    .sort(
      (a, b) =>
        b.marketValueDifferenceEur -
        a.marketValueDifferenceEur,
    )
    .slice(0, 3) ?? [];

const biggestDecliners =
  data?.summary.positions
    .filter(
      (position) =>
        position.marketValueDifferenceEur < 0,
    )
    .sort(
      (a, b) =>
        a.marketValueDifferenceEur -
        b.marketValueDifferenceEur,
    )
    .slice(0, 3) ?? [];

   const chartTimeline =
  data?.timeline.map(
    (point) => {
      const pointDate =
        new Date(
          point.date,
        ).toLocaleDateString(
          "nl-NL",
        );

      const pointTransactions =
        data.transactions.filter(
          (transaction) =>
            new Date(
              transaction.date,
            ).toLocaleDateString(
              "nl-NL",
            ) === pointDate,
        );

      return {
        date:
          new Date(
            point.date,
          ).toLocaleDateString(
            "nl-NL",
            {
              day: "2-digit",
              month: "2-digit",
            },
          ),

        value:
          point.totalMarketValueEur,

        transactionCount:
          pointTransactions.length,

          transactions:
  pointTransactions.map(
    (transaction) => ({
      companyName:
        transaction.companyName,
      type:
        transaction.type,
      quantity:
        transaction.quantity,
    }),
  ),

        hasBuy:
          pointTransactions.some(
            (transaction) =>
              transaction.type ===
              "buy",
          ),

        hasSell:
          pointTransactions.some(
            (transaction) =>
              transaction.type ===
              "sell",
          ),
      };
    },
  ) ?? [];

  const reportPeriodLabel =
  period === "week"
    ? "Weekrapport"
    : period === "month"
      ? "Maandrapport"
      : "Rapport vanaf begin";

const reportDateRange =
  data &&
  data.timeline.length > 0
    ? `${new Date(
        data.timeline[0].date,
      ).toLocaleDateString(
        "nl-NL",
      )} t/m ${new Date(
        data.timeline[
          data.timeline.length - 1
        ].date,
      ).toLocaleDateString(
        "nl-NL",
      )}`
    : null;
  
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

{data && (
  <p className="report-period-label">
    {reportPeriodLabel}

    {reportDateRange && (
      <>
        {" · "}
        {reportDateRange}
      </>
    )}
  </p>
)}
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
  className={
    period === "all"
      ? "primary-button"
      : "secondary-button"
  }
  onClick={() =>
    setPeriod("all")
  }
>
  Vanaf begin
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

          <label className="report-pdf-toggle">
  <input
    type="checkbox"
    checked={
      includePositionDetailsInPdf
    }
    onChange={(event) =>
      setIncludePositionDetailsInPdf(
        event.target.checked,
      )
    }
  />

  Details meenemen in PDF
</label>

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
  chartTimeline.length > 0 && (
    <div
      style={{
        marginTop: "24px",
      }}
    >
      <p className="eyebrow">
        PORTEFEUILLE-ONTWIKKELING
      </p>

      <div
  className="report-chart"
  style={{
    width: "100%",
    height: "320px",
  }}
>
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={chartTimeline}
            margin={{
              top: 10,
              right: 20,
              bottom: 0,
              left: 10,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              opacity={0.2}
            />

            <XAxis
              dataKey="date"
            />

            <YAxis
            domain={["dataMin - 100", "dataMax + 100"]}
              tickFormatter={(value) =>
                `€${Number(
                  value,
                ).toLocaleString(
                  "nl-NL",
                  {
                    maximumFractionDigits:
                      0,
                  },
                )}`
              }
            />

           <Tooltip
  content={({ active, payload, label }) => {
    if (
      !active ||
      !payload ||
      payload.length === 0
    ) {
      return null;
    }

    const point =
      chartTimeline.find(
        (item) =>
          item.date === label,
      );

    if (!point) {
      return null;
    }

    return (
      <div
        style={{
          background:
            "#ffffff",
          border:
            "1px solid #cbd5e1",
          padding:
            "10px 12px",
          borderRadius:
            "6px",
          color:
            "#0f172a",
          minWidth:
            "220px",
        }}
      >
        <strong>
          {point.date}
        </strong>

        <div
          style={{
            marginTop:
              "6px",
          }}
        >
          Dagwaarde:{" "}
          <strong>
            {formatEur(
              point.value,
            )}
          </strong>
        </div>

        {point.transactions.length > 0 && (
          <div
            style={{
              marginTop:
                "8px",
              paddingTop:
                "8px",
              borderTop:
                "1px solid #e2e8f0",
            }}
          >
            {point.transactions.map(
              (
                transaction,
                index,
              ) => (
                <div
                  key={`${point.date}-${index}`}
                  style={{
                    marginTop:
                      index === 0
                        ? 0
                        : "6px",
                  }}
                >
                  <strong>
                    {transaction.type ===
                    "buy"
                      ? "Aankoop"
                      : "Verkoop"}
                    :
                  </strong>{" "}
                  {
                    transaction.companyName
                  }
                  {" · "}
                  {transaction.quantity.toLocaleString(
                    "nl-NL",
                  )}
                  {" aandelen"}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    );
  }}
/>

            <Line
              type="linear"
              dataKey="value"
              name="Portefeuillewaarde"
              strokeWidth={3}
              dot={{
                r: 5,
              }}
              activeDot={{
                r: 7,
              }}
            />

            {chartTimeline
  .filter(
    (point) =>
      point.transactionCount > 0,
  )
  .map((point) => {
    const transactionLabel =
      point.hasBuy && point.hasSell
        ? "A/V"
        : point.hasBuy
          ? "A"
          : "V";

    return (
      <ReferenceDot
        key={`transaction-${point.date}`}
        x={point.date}
        y={point.value}
        r={8}
        label={{
          value:
            transactionLabel,
          position: "top",
        }}
      />
    );
  })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )}

 {!loading &&
  data &&
  data.summary.snapshotCount >= 2 && (
    <div
      style={{
        marginTop: "24px",
      }}
    >
      <p className="eyebrow">
        GROOTSTE BEWEGINGEN
      </p>

      <div className="report-movers-grid">
        <section className="report-movers-box report-movers-up">
          <span className="stat-label">
            Top 3 waardestijgingen
          </span>

          <ol className="report-movers-list">
            {biggestGainers.map(
              (position) => (
                <li key={position.companyId}>
                  <strong>
                    {position.companyName}
                  </strong>

                  <strong>
                    +
                    {formatEur(
                      position.marketValueDifferenceEur,
                    )}
                  </strong>
                </li>
              ),
            )}
          </ol>
        </section>

        <section className="report-movers-box report-movers-down">
          <span className="stat-label">
            Top 3 waardedalingen
          </span>

          <ol className="report-movers-list">
            {biggestDecliners.map(
              (position) => (
                <li key={position.companyId}>
                  <strong>
                    {position.companyName}
                  </strong>

                  <strong>
                    {formatEur(
                      position.marketValueDifferenceEur,
                    )}
                  </strong>
                </li>
              ),
            )}
          </ol>
        </section>
      </div>
    </div>
  )}

{!loading &&
  data &&
  data.summary.positions.length > 0 && (
    <details
      className={
  includePositionDetailsInPdf
    ? "report-position-details report-position-details-print"
    : "report-position-details"
}
      
      style={{
        marginTop: "24px",
      }}
    >
      <summary
        className="eyebrow"
        style={{
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        POSITIE-ONTWIKKELING
      </summary>

      <div
        className="compact-table-wrap"
        style={{
          marginTop: "12px",
        }}
      >
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
    </details>
  )}

{!loading &&
  data &&
  data.transactions.length > 0 && (
    <div
  className={
    includePositionDetailsInPdf
      ? "report-transactions report-transactions-new-page"
      : "report-transactions"
  }
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