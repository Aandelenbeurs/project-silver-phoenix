import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentWorkspace,
} from "../../../../data/workspace";

import {
  readWorkspaceSnapshots,
  readWorkspaceTransactions,
} from "../../../../data/workspace-data-storage";

import {
  buildMonthlyPortfolioSummary,
  buildWeeklyPortfolioSummary,
} from "../../../../data/portfolio-history";

import {
  getCompanyById,
} from "../../../../data/companies";

import {
  getYahooMarketSnapshot,
} from "../../../../services/yahoo";

import {
  convertPriceToEur,
} from "../../../../data/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  try {
    const workspace =
      await getCurrentWorkspace();

   const [
  snapshots,
  transactions,
  marketSnapshot,
] = await Promise.all([
  readWorkspaceSnapshots(
    workspace.id,
  ),

  readWorkspaceTransactions(
    workspace.id,
  ),

  getYahooMarketSnapshot(),
]);

    const period =
      request.nextUrl.searchParams.get(
        "period",
      );

      const endDate =
  new Date();

const startDate =
  new Date(endDate);

startDate.setDate(
  endDate.getDate() -
    (
      period === "month"
        ? 30
        : 7
    ),
);

const periodTransactions =
  transactions
    .filter((transaction) => {
      const transactionTime =
        new Date(
          transaction.date,
        ).getTime();

      return (
        transactionTime >=
          startDate.getTime() &&
        transactionTime <=
          endDate.getTime()
      );
    })
    .map((transaction) => {
      const companyId =
        transaction.holdingId.startsWith(
          "holding-",
        )
          ? transaction.holdingId.slice(
              "holding-".length,
            )
          : transaction.holdingId;

      const company =
        getCompanyById(
          companyId,
        );

    const transactionValueEur =
  transaction.transactionValueEur ??
  (
    transaction.price !== null &&
    transaction.currency !== null
      ? transaction.quantity *
        convertPriceToEur(
          transaction.price,
          transaction.currency as
            | "EUR"
            | "CAD"
            | "USD"
            | "AUD"
            | "GBP"
            | "HKD",
          marketSnapshot.exchangeRates,
        )
      : null
  );

return {
  ...transaction,

  companyName:
    company?.name ??
    transaction.holdingId,

  transactionValueEur,
};
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(
          b.date,
        ),
    );

const netTransactionFlowEur =
  periodTransactions.reduce(
    (total, transaction) => {
      if (
        transaction.transactionValueEur ===
        null
      ) {
        return total;
      }

      return transaction.type === "buy"
        ? total -
            transaction.transactionValueEur
        : total +
            transaction.transactionValueEur;
    },
    0,
  );

const summary =
  period === "month"
    ? buildMonthlyPortfolioSummary(
        snapshots,
      )
    : buildWeeklyPortfolioSummary(
        snapshots,
      );

const hasSufficientHistory =
  summary.snapshotCount >= 2;

const adjustedDifferenceEur =
  hasSufficientHistory
    ? summary.differenceEur +
      netTransactionFlowEur
    : null;

const adjustedReturnPercent =
  hasSufficientHistory &&
  summary.startValueEur > 0 &&
  adjustedDifferenceEur !== null
    ? (
        adjustedDifferenceEur /
        summary.startValueEur
      ) * 100
    : null;

return NextResponse.json({
  success: true,

  workspaceId:
    workspace.id,

  workspaceName:
    workspace.name,

  period:
    period === "month"
      ? "month"
      : "week",

  summary,

  netTransactionFlowEur,

  adjustedDifferenceEur,

  adjustedReturnPercent,

  transactions:
    periodTransactions,
});

  } catch (error) {
    console.error(
      "Portfoliohistorie ophalen mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      {
        status: 500,
      },
    );
  }
}