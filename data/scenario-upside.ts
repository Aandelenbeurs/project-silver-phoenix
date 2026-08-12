import {
  getCompanyById,
} from "./companies";

import {
  phoenixCompaniesV2,
} from "./phoenix-v2";


export type MetalsScenario = {
  silverTargetUsd: number;
  goldTargetUsd: number;
};


export type LiveMetalPrices = {
  silverPriceUsd: number;
  goldPriceUsd: number;
};


export type ScenarioUpsideResult = {
  companyId: string;

  silverRemainingUpside: number;
  goldRemainingUpside: number;

  silverContribution: number;
  goldContribution: number;

  rawScenarioPower: number;

  scenarioUpsideScore: number;
};


export const phoenixBullScenario: MetalsScenario = {
  silverTargetUsd: 300,
  goldTargetUsd: 7000,
};


function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    max,
    Math.max(min, value),
  );
}


export function calculateScenarioUpside({
  companyId,
  livePrices,
  scenario = phoenixBullScenario,
}: {
  companyId: string;
  livePrices: LiveMetalPrices;
  scenario?: MetalsScenario;
}): ScenarioUpsideResult | null {
  const company =
    getCompanyById(companyId);

  if (!company) {
    return null;
  }


  if (
    livePrices.silverPriceUsd <= 0 ||
    livePrices.goldPriceUsd <= 0
  ) {
    return null;
  }


  const silverRemainingUpside =
    Math.max(
      0,
      scenario.silverTargetUsd /
        livePrices.silverPriceUsd -
        1,
    );


  const goldRemainingUpside =
    Math.max(
      0,
      scenario.goldTargetUsd /
        livePrices.goldPriceUsd -
        1,
    );


  const silverExposure =
    company.silverExposure ?? 0;

  const goldExposure =
    company.goldExposure ?? 0;


  const silverLeverage =
    company.scenarioLeverage ?? 1;

  const goldLeverage =
    company.goldScenarioLeverage ?? 1;


  const silverContribution =
    silverExposure *
    silverRemainingUpside *
    silverLeverage;


  const goldContribution =
    goldExposure *
    goldRemainingUpside *
    goldLeverage;


  const rawScenarioPower =
    silverContribution +
    goldContribution;


  /**
   * Normalisatie.
   *
   * We willen sterke scenario leverage
   * belonen, maar voorkomen dat pure
   * silver torque alle andere factoren
   * volledig wegdrukt.
   *
   * rawScenarioPower ~4 of hoger
   * benadert de maximale score.
   */
  const normalized =
    Math.sqrt(
      clamp(
        rawScenarioPower / 4,
        0,
        1,
      ),
    );


  const scenarioUpsideScore =
    normalized * 100;


  return {
    companyId,

    silverRemainingUpside,
    goldRemainingUpside,

    silverContribution,
    goldContribution,

    rawScenarioPower,

    scenarioUpsideScore,
  };
}


export function buildPhoenixScenarioRanking({
  livePrices,
  scenario = phoenixBullScenario,
}: {
  livePrices: LiveMetalPrices;
  scenario?: MetalsScenario;
}) {
  return phoenixCompaniesV2
    .map((phoenix) => {
      const scenarioResult =
        calculateScenarioUpside({
          companyId:
            phoenix.companyId,

          livePrices,
          scenario,
        });

      const opportunity =
  phoenix.scores.opportunity;

const scenarioUpside =
  scenarioResult?.scenarioUpsideScore ??
  null;

const investmentScore =
  opportunity !== null &&
  scenarioUpside !== null
    ? opportunity * 0.7 +
      scenarioUpside * 0.3
    : opportunity;

return {
  companyId:
    phoenix.companyId,

  opportunity,

  scenarioUpside,

  investmentScore,

  silverContribution:
    scenarioResult?.silverContribution ??
    0,

  goldContribution:
    scenarioResult?.goldContribution ??
    0,

  rawScenarioPower:
    scenarioResult?.rawScenarioPower ??
    0,
};
    })
    .sort(
  (a, b) =>
    (b.investmentScore ?? -1) -
    (a.investmentScore ?? -1),
);
}