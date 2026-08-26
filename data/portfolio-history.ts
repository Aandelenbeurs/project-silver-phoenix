import type {
  WorkspacePortfolioSnapshot,
} from "./workspace-data-storage";

import {
  getCompanyById,
} from "./companies";

export type PortfolioPeriodSummary = {
  startSnapshot:
    WorkspacePortfolioSnapshot | null;

  endSnapshot:
    WorkspacePortfolioSnapshot | null;

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

export function buildPortfolioPeriodSummary({
  snapshots,
  startDate,
  endDate,
}: {
  snapshots: WorkspacePortfolioSnapshot[];
  startDate: Date;
  endDate: Date;
}): PortfolioPeriodSummary {
  const startTime =
    startDate.getTime();

  const endTime =
    endDate.getTime();

  const periodSnapshots =
    snapshots
      .filter((snapshot) => {
        const capturedTime =
          new Date(
            snapshot.capturedAt,
          ).getTime();

        return (
          capturedTime >= startTime &&
          capturedTime <= endTime
        );
      })
      .sort(
        (a, b) =>
          a.capturedAt.localeCompare(
            b.capturedAt,
          ),
      );

  const startSnapshot =
    periodSnapshots[0] ??
    null;

  const endSnapshot =
    periodSnapshots[
      periodSnapshots.length - 1
    ] ?? null;

  if (
    startSnapshot === null ||
    endSnapshot === null
  ) {
    return {
      startSnapshot,
      endSnapshot,
      snapshotCount:
        periodSnapshots.length,

      startValueEur: 0,
      endValueEur: 0,
      differenceEur: 0,
      returnPercent: 0,

      positions: [],
    };
  }

  const startValueEur =
    startSnapshot.totalMarketValueEur;

  const endValueEur =
    endSnapshot.totalMarketValueEur;

  const differenceEur =
    endValueEur -
    startValueEur;

  const returnPercent =
    startValueEur > 0
      ? (
          differenceEur /
          startValueEur
        ) * 100
      : 0;

  const companyIds =
    new Set<string>([
      ...startSnapshot.positions.map(
        (position) =>
          position.companyId,
      ),

      ...endSnapshot.positions.map(
        (position) =>
          position.companyId,
      ),
    ]);

  const positions =
    Array.from(companyIds)
      .map((companyId) => {
        const startPosition =
          startSnapshot.positions.find(
            (position) =>
              position.companyId ===
              companyId,
          );

        const endPosition =
          endSnapshot.positions.find(
            (position) =>
              position.companyId ===
              companyId,
          );

        const startMarketValueEur =
          startPosition
            ?.marketValueEur ?? 0;

        const endMarketValueEur =
          endPosition
            ?.marketValueEur ?? 0;

        const startAllocationPercent =
          startPosition
            ?.allocationPercent ?? 0;

        const endAllocationPercent =
          endPosition
            ?.allocationPercent ?? 0;

        const company =
  getCompanyById(
    companyId,
  );

return {
  companyId,

  companyName:
    company?.name ??
    companyId,

  startMarketValueEur,
  endMarketValueEur,

          marketValueDifferenceEur:
            endMarketValueEur -
            startMarketValueEur,

          startAllocationPercent,
          endAllocationPercent,

          allocationDifferencePercent:
            endAllocationPercent -
            startAllocationPercent,
        };
      })
      .sort(
        (a, b) =>
          Math.abs(
            b.marketValueDifferenceEur,
          ) -
          Math.abs(
            a.marketValueDifferenceEur,
          ),
      );

  return {
    startSnapshot,
    endSnapshot,

    snapshotCount:
      periodSnapshots.length,

    startValueEur,
    endValueEur,
    differenceEur,
    returnPercent,

    positions,
  };
}

export function buildWeeklyPortfolioSummary(
  snapshots: WorkspacePortfolioSnapshot[],
): PortfolioPeriodSummary {
  const endDate =
    new Date();

  const startDate =
    new Date(endDate);

  startDate.setDate(
    endDate.getDate() - 7,
  );

  return buildPortfolioPeriodSummary({
    snapshots,
    startDate,
    endDate,
  });
}

export type PortfolioHistoryPoint = {
  date: string;
  totalMarketValueEur: number;
};

export function buildPortfolioHistoryTimeline(
  snapshots: WorkspacePortfolioSnapshot[],
): PortfolioHistoryPoint[] {
  return snapshots
    .map((snapshot) => ({
      date:
        snapshot.capturedAt,
      totalMarketValueEur:
        snapshot.totalMarketValueEur,
    }))
    .sort(
      (a, b) =>
        a.date.localeCompare(
          b.date,
        ),
    );
}

export function buildMonthlyPortfolioSummary(
  snapshots: WorkspacePortfolioSnapshot[],
): PortfolioPeriodSummary {
  const endDate =
    new Date();

  const startDate =
    new Date(endDate);

  startDate.setDate(
    endDate.getDate() - 30,
  );

  return buildPortfolioPeriodSummary({
    snapshots,
    startDate,
    endDate,
  });
}