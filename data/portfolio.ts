import {
  companies,
  getCompanyById,
  type Company,
  type CompanyStatus,
} from "./companies";

import {
  holdings,
  type Holding,
} from "./holdings";

export type PortfolioPosition = {
  holding: Holding;
  company?: Company;

  id: string;
  name: string;
  ticker?: string;
  quantity: number;

  rank: number | null;
  masterScore: number | null;
  tier: string;
  targetAllocation: number;
  maximumAllocation: number;
  status: CompanyStatus | "separate";

  hasValidScore: boolean;
  isEquity: boolean;
};

function getSafeStatus(
  holding: Holding,
  company?: Company,
): CompanyStatus | "separate" {
  if (holding.type !== "equity") {
    return "separate";
  }

  if (!company) {
    return "review";
  }

  if (
    company.masterScore === null ||
    company.rank === null ||
    company.tier === "REVIEW"
  ) {
    return "review";
  }

  return company.status;
}

function buildPortfolioPosition(
  holding: Holding,
): PortfolioPosition {
  const company = holding.companyId
    ? getCompanyById(holding.companyId)
    : undefined;

  const hasValidScore =
    company !== undefined &&
    company.masterScore !== null &&
    company.rank !== null &&
    company.tier !== "REVIEW";

  return {
    holding,
    company,

    id: holding.id,
    name: company?.name ?? holding.name,
    ticker: company?.ticker ?? holding.ticker,
    quantity: holding.quantity,

    rank: company?.rank ?? null,
    masterScore: company?.masterScore ?? null,
    tier: company?.tier ?? "APART",
    targetAllocation:
      company?.targetAllocation ?? 0,
    maximumAllocation:
      company?.maximumAllocation ?? 0,
    status: getSafeStatus(
      holding,
      company,
    ),

    hasValidScore,
    isEquity: holding.type === "equity",
  };
}

/**
 * Zet een willekeurige holdingslijst om naar
 * volledige PortfolioPosition-objecten.
 *
 * Hierdoor kan dezelfde Portfolio Engine later werken met:
 * - live holdings;
 * - aangepaste holdings;
 * - simulaties;
 * - scenario-workspaces.
 */
export function buildPortfolioPositions(
  sourceHoldings: Holding[],
): PortfolioPosition[] {
  return sourceHoldings.map(
    buildPortfolioPosition,
  );
}

/**
 * Statische standaardportefeuille.
 *
 * Deze exports blijven bestaan voor Ranking en andere
 * onderdelen die nog niet via de Workspace Manager lopen.
 */
export const portfolioPositions =
  buildPortfolioPositions(holdings);

export const equityPositions =
  portfolioPositions.filter(
    (position) => position.isEquity,
  );

export const separatePositions =
  portfolioPositions.filter(
    (position) => !position.isEquity,
  );

export const corePositions =
  equityPositions.filter(
    (position) =>
      position.status === "core",
  );

export const keepPositions =
  equityPositions.filter(
    (position) =>
      position.status === "keep",
  );

export const reducePositions =
  equityPositions.filter(
    (position) =>
      position.status === "reduce",
  );

export const exitPositions =
  equityPositions.filter(
    (position) =>
      position.status === "exit",
  );

export const reviewPositions =
  equityPositions.filter(
    (position) =>
      position.status === "review",
  );

export function getPositionByCompanyId(
  companyId: string,
): PortfolioPosition | undefined {
  return portfolioPositions.find(
    (position) =>
      position.company?.id === companyId,
  );
}

export function getPositionsByStatus(
  status:
    | CompanyStatus
    | "separate",
): PortfolioPosition[] {
  return portfolioPositions.filter(
    (position) =>
      position.status === status,
  );
}

export const portfolioSummary = {
  totalPositions:
    portfolioPositions.length,

  equityPositions:
    equityPositions.length,

  separatePositions:
    separatePositions.length,

  core: corePositions.length,
  keep: keepPositions.length,
  reduce: reducePositions.length,
  exit: exitPositions.length,
  review: reviewPositions.length,
};