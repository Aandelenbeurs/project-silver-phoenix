import { companies } from "../data/companies";
import { getPhoenixCompanyV2 } from "../data/phoenix-v2";

import { adaptPreciousMetalsLegacy } from "../data/multi-sector/adapters/precious-metals-legacy";
import { validateMultiSectorInvestmentResult } from "../data/multi-sector/validation";

const companyId = "abrasilver";

const company = companies.find(
  (item) => item.id === companyId
);

const phoenix = getPhoenixCompanyV2(companyId);

if (!company) {
  throw new Error(
    `Company "${companyId}" not found in companies.ts`
  );
}

if (!phoenix) {
  throw new Error(
    `Company "${companyId}" not found in phoenix-v2.ts`
  );
}

const result = adaptPreciousMetalsLegacy({
  company,
  phoenix,

  // Explicit test input:
  // the legacy structures do not currently provide valuation currency.
  currency: "CAD",

  dataAsOf: "2026-09-20",

  sourceSnapshot:
    "Phoenix V2 legacy adapter inspection",
});

const validation =
  validateMultiSectorInvestmentResult(result);

console.dir(
  {
    identity: result.identity,
    sectorAssessment: result.sectorAssessment,
    confidence: result.confidence,
    scenarios: result.scenarios,
    crossAsset: result.crossAsset,
    positionRisk: result.positionRisk,
    portfolioContext: result.portfolioContext,
    provenance: result.provenance,
    validation,
  },
  {
    depth: null,
  }
);

if (!validation.valid) {
  process.exitCode = 1;
}