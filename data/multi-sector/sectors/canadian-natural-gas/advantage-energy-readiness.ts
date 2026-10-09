
import {
  advantageEnergyReportedData as data,
} from "./advantage-energy-reported-data";

import {
  advantageValuationInput,
  type AdvantageValuationInput,
  type Evidence,
} from "./advantage-energy-valuation-input";

import {
  validateAdvantageEvidence,
} from "./advantage-energy-evidence";

import {
  advantageSources,
  type AdvantageSource,
} from "./advantage-energy-sources";

export type AdvantageReadinessStatus = "ready" | "blocked";

export interface AdvantageReadinessReport {
  companyId: string;
  status: AdvantageReadinessStatus;
  errors: string[];
  warnings: string[];
  checks: Record<string, boolean>;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);


function validEvidence(
  evidence: Evidence<number> | undefined,
  options: {
    positive?: boolean;
    nonnegative?: boolean;
    actualOnly?: boolean;
  } = {},
  registry: readonly AdvantageSource[] = advantageSources
): boolean {
  return validateAdvantageEvidence(evidence, {
    ...options,
    registry,
  }).valid;
}


export function evaluateAdvantageEnergyReadiness(
  input: typeof data = data,
  valuation: AdvantageValuationInput = advantageValuationInput,
  registry: readonly AdvantageSource[] = advantageSources
): AdvantageReadinessReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const event = input.corporateEvents.find(
    (item) => item.eventId === "wembley-divestiture-2026"
  );

  const reserveAdjustment =
    input.reserves.divestitureAdjustment;

  const postSaleDate = "2026-09-11";

  
const postSaleActual = (
  evidence: Evidence<number> | undefined,
  positive = false
): boolean =>
  validateAdvantageEvidence(evidence, {
    positive,
    nonnegative: !positive,
    actualOnly: true,
    afterDate: postSaleDate,
    registry,
  }).valid;


  const reservesValid =
    postSaleActual(
      valuation.adjustedProvedGasReservesBcf,
      true
    ) &&
    postSaleActual(
      valuation.adjustedProvedPlusProbableGasReservesBcf,
      true
    ) &&
    valuation.adjustedProvedGasReservesBcf!.value <=
      valuation.adjustedProvedPlusProbableGasReservesBcf!.value;

  const economics = valuation.forwardEconomics;

  
const forwardEconomicsValid = Boolean(
  economics &&
  validEvidence(
    economics.declineRate,
    { nonnegative: true },
    registry
  ) &&
  economics.declineRate.value <= 1 &&
  validEvidence(
    economics.annualCapitalExpenditureCad,
    { nonnegative: true },
    registry
  ) &&
  validEvidence(
    economics.operatingCostCadPerMcfe,
    { nonnegative: true },
    registry
  ) &&
  validEvidence(
    economics.transportationCostCadPerMcfe,
    { nonnegative: true },
    registry
  ) &&
  validEvidence(
    economics.gasPriceCadPerMcf,
    { nonnegative: true },
    registry
  ) &&
  validEvidence(
    economics.liquidsPriceCadPerBbl,
    { nonnegative: true },
    registry
  )
);


  const checks: Record<string, boolean> = {
    identity:
      input.identity.companyId === "advantage-energy" &&
      valuation.companyId === "advantage-energy" &&
      input.identity.ticker === "AAV" &&
      input.identity.currency === "CAD",

    production:
      finite(input.production.gasProductionMmcfPerDay) &&
      input.production.gasProductionMmcfPerDay > 0 &&
      finite(input.production.liquidsProductionBblPerDay) &&
      input.production.liquidsProductionBblPerDay >= 0,

    historicalDebt:
      finite(input.balanceSheet.netDebtCad),

    historicalShares:
      finite(input.financialsQ2.shares.basicWeightedAverage) &&
      finite(input.financialsQ2.shares.dilutedWeightedAverage) &&
      input.financialsQ2.shares.basicWeightedAverage > 0 &&
      input.financialsQ2.shares.dilutedWeightedAverage >=
        input.financialsQ2.shares.basicWeightedAverage,

    wembleySale:
      event?.completionDate === "2026-09-11" &&
      event.proceedsCad === 316_000_000 &&
      event.divestedProduction?.gasMmcfPerDay === 19 &&
      event.divestedProduction?.crudeOilBblPerDay === 1358 &&
      event.divestedProduction?.nglsBblPerDay === 1206,

    reserveCategories:
      finite(input.reserves.provedGasReservesBcf) &&
      finite(input.reserves.provedPlusProbableGasReservesBcf) &&
      input.reserves.provedPlusProbableGasReservesBcf >=
        input.reserves.provedGasReservesBcf,

    reserveAdjustment:
      Boolean(reserveAdjustment.sourceVerified) &&
      finite(reserveAdjustment.provedGasReservesBcf) &&
      finite(
        reserveAdjustment.provedPlusProbableGasReservesBcf
      ),

    currentDebt: postSaleActual(
      valuation.postSaleNetDebtCad
    ),

    currentDilutedShares: postSaleActual(
      valuation.currentFullyDilutedShares,
      true
    ),

    currentProduction:
      postSaleActual(
        valuation.postSaleGasProductionMmcfPerDay,
        true
      ) &&
      postSaleActual(
        valuation.postSaleLiquidsProductionBblPerDay
      ),

    forwardEconomicAssumptions: forwardEconomicsValid,
  };

  // The reserve gate needs both a verified divestiture
  // adjustment and verified post-sale gas-only reserves.
  checks.reserveAdjustment =
    checks.reserveAdjustment && reservesValid;

  for (const [name, passed] of Object.entries(checks)) {
    if (!passed) {
      errors.push(
        `Valuation requirement not satisfied: ${name}`
      );
    }
  }

  if (input.production.measurement === "quarterly-average") {
    warnings.push(
      "Q2 production is historical, not post-sale production."
    );
  }

  if (event?.netDebtImpactCad === null) {
    warnings.push(
      "Wembley net debt impact is not verified."
    );
  }

  warnings.push(
    "Mboe reserves cannot be subtracted from gas-only Bcf."
  );

  warnings.push(
    "CAD/boe costs require documented CAD/Mcfe conversion."
  );

  warnings.push(
    "Entropy assets, debt and cash flows require separate treatment."
  );

  warnings.push(
    "Readiness checks input completeness and provenance, " +
    "not the economic reliability of forecasts."
  );

  return {
    companyId: valuation.companyId,
    status: errors.length === 0 ? "ready" : "blocked",
    errors,
    warnings,
    checks,
  };
}
