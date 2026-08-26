"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardHistoryPoint = {
  date: string;
  totalMarketValueEur: number;
};

type DashboardPeriod =
  | "week"
  | "month"
  | "all";

export default function DashboardPortfolioChart() {
  const [
    timeline,
    setTimeline,
  ] = useState<DashboardHistoryPoint[]>(
    [],
  );

  const [
    period,
    setPeriod,
  ] = useState<DashboardPeriod>(
    "week",
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const response =
          await fetch(
            `/api/workspaces/history?period=${period}`,
            {
              cache: "no-store",
            },
          );

        const result =
          (await response.json()) as {
            success: boolean;
            timeline?: DashboardHistoryPoint[];
          };

        if (
          !response.ok ||
          !result.success
        ) {
          return;
        }

        if (!cancelled) {
          setTimeline(
            result.timeline ?? [],
          );
        }
      } catch {
        if (!cancelled) {
          setTimeline([]);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [period]);

 const chartData =
  timeline.map((point) => ({
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
  }));

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

return (
 <section className="panel dashboard-chart-panel">
    <div className="panel-heading">
      <div>
        <p className="eyebrow">
          PORTEFEUILLE-ONTWIKKELING
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className={
  period === "week"
    ? "chart-period-button active"
    : "chart-period-button"
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
    ? "chart-period-button active"
    : "chart-period-button"
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
    ? "chart-period-button active"
    : "chart-period-button"
}
          onClick={() =>
            setPeriod("all")
          }
        >
          Vanaf begin
        </button>

        <a
  className="chart-report-link"
  href="/report"
>
  Rapport →
</a>
      </div>
    </div>

    {chartData.length > 0 ? (
      <div
  className="dashboard-chart-wrap"
  style={{
    height: "180px",
  }}
>
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={chartData}
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
              domain={[
                "dataMin - 100",
                "dataMax + 100",
              ]}
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
  labelFormatter={(label) =>
    String(label)
  }
  formatter={(value) => [
    formatEur(Number(value)),
    "Dagwaarde",
  ]}
  contentStyle={{
    borderRadius: "8px",
    fontSize: "13px",
  }}
   labelStyle={{
    color: "#111827",
    fontWeight: 700,
  }}
/>

            <Line
              type="linear"
              dataKey="value"
              name="Dagwaarde"
              strokeWidth={3}
              dot={{
                r: 4,
              }}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <p>
        Nog geen historische
        dagwaarden beschikbaar.
      </p>
    )}
  </section>
);
}