
import { advantageEnergyReportedData as data } from "./advantage-energy-reported-data";

export type AdvantageReadinessStatus =
  | "ready"
  | "blocked";

export interface AdvantageReadinessReport {
  companyId: string;
  status: AdvantageReadinessStatus;
  errors: string[];
  warnings: string[];
  checks: Record<string, boolean>;
}

export function evaluateAdvantageEnergyReadiness(
  input: typeof data = data
): AdvantageReadinessReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const event = input.corporateEvents.find(
    (item) => item.eventId === "wembley-divestiture-2026"
  );

  const finite = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

  const checks: Record<string, boolean> = {
    identity:
      input.identity.companyId === "advantage-energy" &&
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
            Boolean(input.reserves.divestitureAdjustment.sourceVerified) &&
      finite(input.reserves.divestitureAdjustment.provedGasReservesBcf) &&
      finite(
        input.reserves.divestitureAdjustment
          .provedPlusProbableGasReservesBcf
      ),

    currentDebt:
      // The published Q2 debt predates the Wembley sale.
      // An actual post-sale debt figure is still required.
      false,

    currentDilutedShares:
      // Q2 weighted-average shares cannot automatically be
      // used as current fully diluted shares.
      false,

    currentProduction:
      // The Q2 average includes the Glacier turnaround.
      // A verified post-sale starting production mix is needed.
      false,

    forwardEconomicAssumptions:
      // A complete, sourced multi-year forecast has
      // not yet been constructed.
      false,
  };

  for (const [name, passed] of Object.entries(checks)) {
    if (!passed) {
      errors.push(`Valuation requirement not satisfied: ${name}`);
    }
  }

  if (
    input.production.measurement === "quarterly-average"
  ) {
    warnings.push(
      "Q2 production is a historical quarterly average, not a " +
      "verified post-Wembley forecast starting rate."
    );
  }

  if (event?.netDebtImpactCad === null) {
    warnings.push(
      "Wembley net debt impact has not been independently verified."
    );
  }

  warnings.push(
    "Reserve volumes in Mboe cannot be subtracted directly " +
    "from gas-only reserves in Bcf."
  );

  warnings.push(
    "Reported CAD/boe costs require a documented conversion " +
    "before use in a CAD/Mcfe economic model."
  );

  warnings.push(
    "Entropy must be valued separately without double counting " +
    "its debt, assets or cash flows."
  );

  return {
    companyId: input.identity.companyId,
    status: errors.length === 0 ? "ready" : "blocked",
    errors,
    warnings,
    checks,
  };
}
