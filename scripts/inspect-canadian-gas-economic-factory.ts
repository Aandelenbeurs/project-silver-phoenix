import {
  createCanadianGasEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/economic-scenario-factory";

const assumptions = {
  annualBaseDeclineRate: 0.30,
  annualGasProductionAddedMmcfPerDay: 20,
  annualLiquidsProductionAddedBblPerDay: 0,

  realizedGasPriceCadPerMcf: 2.50,
  realizedLiquidsPriceCadPerBbl: 0,

  royaltiesCadPerMcfe: 0.10,
  operatingCostCadPerMcfe: 0.80,
  transportationCostCadPerMcfe: 0.20,
  gAndACostCadPerMcfe: 0.10,

  annualInterestExpenseCad: 0,
  cashTaxesCad: 0,

  sustainingCapexCad: 60_000_000,
  growthCapexCad: 20_000_000,

  dividendsCad: 0,
  shareBuybacksCad: 0,
  debtRepaymentCad: 0,
};

const projection = createCanadianGasEconomicProjection({
  realizationYears: 5,

  beginningGasProductionMmcfPerDay: 100,
  beginningLiquidsProductionBblPerDay: 0,

  beginningNetDebtCad: 100_000_000,
  beginningDilutedShares: 100_000_000,

  annualAssumptions: assumptions,
});

if (projection.years.length !== 5) {
  throw new Error("Expected five projection years");
}

for (let index = 0; index < 5; index += 1) {
  const year = projection.years[index];

  if (year.projectionYear !== index + 1) {
    throw new Error("Incorrect projection year");
  }

  if (year.realizedGasPriceCadPerMcf !== 2.50) {
    throw new Error("Incorrect gas price");
  }

  if (year.sustainingCapexCad !== 60_000_000) {
    throw new Error("Incorrect sustaining capex");
  }
}

console.log("PASS: Five sequential economic projection years");
console.log("PASS: Gas price and capex assumptions preserved");

let invalidYearsRejected = false;

try {
  createCanadianGasEconomicProjection({
    realizationYears: 0,
    beginningGasProductionMmcfPerDay: 100,
    beginningNetDebtCad: 100_000_000,
    beginningDilutedShares: 100_000_000,
    annualAssumptions: assumptions,
  });
} catch {
  invalidYearsRejected = true;
}

if (!invalidYearsRejected) {
  throw new Error("Invalid projection horizon was accepted");
}

console.log("PASS: Invalid projection horizon rejected");

import {
  buildCanadianGasFactoryDistribution,
} from "../data/multi-sector/sectors/canadian-natural-gas/economic-scenario-factory";

const common = {
  beginningGasProductionMmcfPerDay: 100,
  beginningLiquidsProductionBblPerDay: 0,
  beginningNetDebtCad: 100_000_000,
  beginningDilutedShares: 100_000_000,

  producingAssetValueCad: 500_000_000,
  undevelopedInventoryValueCad: 0,
  unbookedOptionalityValueCad: 0,
  otherAssetValueCad: 0,
};

const integratedDistribution =
  buildCanadianGasFactoryDistribution({
    failure: {
      ...common,
      probability: 0.10,
      realizationYears: 5,
      annualAssumptions: {
        ...assumptions,
        realizedGasPriceCadPerMcf: 1,
        annualBaseDeclineRate: 0.35,
        annualGasProductionAddedMmcfPerDay: 5,
        sustainingCapexCad: 30_000_000,
        growthCapexCad: 0,
        dividendsCad: 0,
        shareBuybacksCad: 0,
      },
    },

    bear: {
      ...common,
      probability: 0.25,
      realizationYears: 5,
      annualAssumptions: {
        ...assumptions,
        realizedGasPriceCadPerMcf: 2.5,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 20,
        sustainingCapexCad: 60_000_000,
        growthCapexCad: 20_000_000,
        dividendsCad: 0,
        shareBuybacksCad: 0,
      },
    },

    base: {
      ...common,
      probability: 0.45,
      realizationYears: 5,
      annualAssumptions: {
        ...assumptions,
        realizedGasPriceCadPerMcf: 4,
        annualBaseDeclineRate: 0.25,
        annualGasProductionAddedMmcfPerDay: 30,
        sustainingCapexCad: 70_000_000,
        growthCapexCad: 40_000_000,
        dividendsCad: 10_000_000,
        shareBuybacksCad: 0,
      },
    },

    bull: {
      ...common,
      probability: 0.20,
      realizationYears: 3,
      annualAssumptions: {
        ...assumptions,
        realizedGasPriceCadPerMcf: 6,
        annualBaseDeclineRate: 0.20,
        annualGasProductionAddedMmcfPerDay: 40,
        sustainingCapexCad: 80_000_000,
        growthCapexCad: 60_000_000,
        dividendsCad: 20_000_000,
        shareBuybacksCad: 0,
      },
    },
  });

const scenarioNames = [
  "failure",
  "bear",
  "base",
  "bull",
] as const;

for (const name of scenarioNames) {
  const scenario = integratedDistribution[name];

  const value =
    scenario.shareholderValuePerShare?.mid;

  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`${name}: invalid shareholder value`);
  }

  console.log(
    `PASS: ${name} economic valuation = CAD ${value.toFixed(4)}/share`
  );
}

const probabilitySum = scenarioNames.reduce(
  (sum, name) => sum + integratedDistribution[name].probability,
  0
);

if (Math.abs(probabilitySum - 1) > 1e-9) {
  throw new Error("Scenario probabilities do not sum to 100%");
}

console.log("PASS: Integrated scenario probabilities = 100%");

import {
  calculateScenarioValuation,
} from "../data/multi-sector/sectors/canadian-natural-gas/scenario-engine";

const diagnostics = [
  {
    name: "failure",
    probability: 0.10,
    years: 5,
    gasPrice: 1,
    decline: 0.35,
    additions: 5,
    sustainingCapex: 30_000_000,
    growthCapex: 0,
    dividends: 0,
  },
  {
    name: "bear",
    probability: 0.25,
    years: 5,
    gasPrice: 2.5,
    decline: 0.30,
    additions: 20,
    sustainingCapex: 60_000_000,
    growthCapex: 20_000_000,
    dividends: 0,
  },
  {
    name: "base",
    probability: 0.45,
    years: 5,
    gasPrice: 4,
    decline: 0.25,
    additions: 30,
    sustainingCapex: 70_000_000,
    growthCapex: 40_000_000,
    dividends: 10_000_000,
  },
  {
    name: "bull",
    probability: 0.20,
    years: 3,
    gasPrice: 6,
    decline: 0.20,
    additions: 40,
    sustainingCapex: 80_000_000,
    growthCapex: 60_000_000,
    dividends: 20_000_000,
  },
] as const;

for (const scenario of diagnostics) {
  const valuation = calculateScenarioValuation({
    economicProjection: createCanadianGasEconomicProjection({
      realizationYears: scenario.years,
      beginningGasProductionMmcfPerDay: 100,
      beginningLiquidsProductionBblPerDay: 0,
      beginningNetDebtCad: 100_000_000,
      beginningDilutedShares: 100_000_000,
      annualAssumptions: {
        ...assumptions,
        realizedGasPriceCadPerMcf: scenario.gasPrice,
        annualBaseDeclineRate: scenario.decline,
        annualGasProductionAddedMmcfPerDay: scenario.additions,
        sustainingCapexCad: scenario.sustainingCapex,
        growthCapexCad: scenario.growthCapex,
        dividendsCad: scenario.dividends,
        shareBuybacksCad: 0,
      },
    }),
    producingAssetValueCad: 500_000_000,
    undevelopedInventoryValueCad: 0,
    unbookedOptionalityValueCad: 0,
    otherAssetValueCad: 0,
  });

  const projection = valuation.economicProjection;

  const expectedNetDebt =
  100_000_000 -
  projection.cumulativeFreeCashFlowCad +
  projection.cumulativeDividendsCad +
  projection.cumulativeShareBuybacksCad;

if (
  Math.abs(
    projection.endingNetDebtCad - expectedNetDebt
  ) > 0.01
) {
  throw new Error(
    `${scenario.name}: net debt reconciliation failed`
  );
}

console.log(
  `PASS: ${scenario.name} net debt reconciled`
);

  console.log(
    `${scenario.name.toUpperCase()}: ` +
    `FCF=${(projection.cumulativeFreeCashFlowCad / 1e6).toFixed(2)}m, ` +
    `NetDebt=${(projection.endingNetDebtCad / 1e6).toFixed(2)}m, ` +
    `EndingGas=${projection.endingGasProductionMmcfPerDay.toFixed(2)} MMcf/d, ` +
    `Value=${valuation.totalShareholderValuePerShareCad.toFixed(4)} CAD/share`
  );
}