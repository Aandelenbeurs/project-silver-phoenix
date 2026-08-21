import {
  calculatePortfolioV2,
  type PortfolioV2PositionInput,
  type PortfolioV2Result,
} from "./portfolio-v2";

import {
  getPhoenixCompanyV2,
  phoenixCompaniesV2,
} from "./phoenix-v2";;

import {
  buildPhoenixScenarioRanking,
  type LiveMetalPrices,
} from "./scenario-upside";

import {
  type ExitReviewResult,
} from "./exit-engine";

import {
  evaluateBuyEligibility,
} from "./buy-eligibility";

export type NewMoneyOptimizerInput = {
  /**
   * Huidige aandelenportefeuille.
   *
   * Alleen equities.
   * ETF's en fysiek metaal behandelen
   * we later apart.
   */
  positions: PortfolioV2PositionInput[];

  /**
   * Bedrijven waar Phoenix uit mag kiezen.
   *
   * Dit mogen bestaande holdings zijn,
   * maar ook watchlistaandelen zoals
   * Contango.
   */
  candidateCompanyIds: string[];

  /**
   * Nieuw beschikbaar kapitaal.
   *
   * Bijvoorbeeld:
   * 3000
   */
  newMoneyEur: number;

    liveMetalPrices?: 
    LiveMetalPrices;

  /**
   * Maximaal aantal verschillende
   * kooporders.
   *
   * Default = 3.
   */
  maxPositions?: number;

  /**
   * Minimale praktische order.
   *
   * Voorkomt adviezen zoals:
   * "koop €83 van aandeel X".
   */
  minimumOrderEur?: number;

  exitReviews?: Map<
  string,
  ExitReviewResult
>;
allowStrategicNewPositionFallback?: boolean;
};


export type NewMoneyAllocation = {
  companyId: string;

  amountEur: number;

  allocationBeforePercent: number;
  allocationAfterPercent: number;

  opportunity: number;
  investmentScore: number;

  idealMin: number;
  idealMax: number;
  hardMax: number;

  wasExistingHolding: boolean;
};


export type NewMoneyOptimizerResult = {
  newMoneyEur: number;

  scoreBefore: number | null;
  scoreAfter: number | null;
  scoreImprovement: number | null;

  allocations: NewMoneyAllocation[];

  portfolioBefore: PortfolioV2Result;
  portfolioAfter: PortfolioV2Result;

  moneyInvestedEur: number;
  moneyUnallocatedEur: number;

  isMeaningfulImprovement: boolean;

  explanation: string[];
};

type WorkingPosition = {
  companyId: string;
  marketValueEur: number;
};


const DEFAULT_MAX_POSITIONS = 3;

const DEFAULT_MINIMUM_ORDER_EUR = 500;

/**
 * We testen nieuw geld niet euro voor euro.
 *
 * Dat zou onnodig zwaar zijn en zou
 * schijnprecisie veroorzaken.
 *
 * Phoenix verdeelt kapitaal daarom in
 * praktische blokken.
 */

function determineStepSize(
  newMoneyEur: number,
): number {
  if (newMoneyEur <= 5_000) {
    return 250;
  }

  if (newMoneyEur <= 25_000) {
    return 500;
  }

  return 1_000;
}

function getPortfolioScore(
  portfolio: PortfolioV2Result,
): number | null {
  return portfolio.partialPortfolioScore;
}


function clonePositions(
  positions: PortfolioV2PositionInput[],
): WorkingPosition[] {
  return positions.map(
    (position) => ({
      companyId:
        position.companyId,

      marketValueEur:
        position.marketValueEur,
    }),
  );
}


function addMoneyToCompany({
  positions,
  companyId,
  amountEur,
}: {
  positions: WorkingPosition[];
  companyId: string;
  amountEur: number;
}): WorkingPosition[] {
  const next =
    positions.map(
      (position) => ({
        ...position,
      }),
    );

  const existing =
    next.find(
      (position) =>
        position.companyId ===
        companyId,
    );

  if (existing) {
    existing.marketValueEur +=
      amountEur;

    return next;
  }

  next.push({
    companyId,
    marketValueEur:
      amountEur,
  });

  return next;
}


function getPositionFromPortfolio(
  portfolio: PortfolioV2Result,
  companyId: string,
) {
  return portfolio.positions.find(
    (position) =>
      position.companyId ===
      companyId,
  );
}


/**
 * Controleert of extra geld in deze
 * positie de hardMax zou overschrijden.
 */
function canAddMoney({
  positions,
  companyId,
  amountEur,
}: {
  positions: WorkingPosition[];
  companyId: string;
  amountEur: number;
}): boolean {
  const phoenix =
    getPhoenixCompanyV2(
      companyId,
    );

  if (!phoenix) {
    return false;
  }

  const hardMax =
    phoenix.portfolio.hardMax;

  if (
    hardMax === null ||
    hardMax === undefined
  ) {
    return false;
  }

  const simulated =
    addMoneyToCompany({
      positions,
      companyId,
      amountEur,
    });

  const portfolio =
    calculatePortfolioV2(
      simulated,
    );

  const position =
    getPositionFromPortfolio(
      portfolio,
      companyId,
    );

  if (!position) {
    return false;
  }

  return (
    position.allocationPercent <=
    hardMax
  );
}

function canAddRotationMoney({
  positions,
  companyId,
  amountEur,
  totalCapitalEur,
  effectiveHardMax,
}: {
  positions: WorkingPosition[];
  companyId: string;
  amountEur: number;
  totalCapitalEur: number;
  effectiveHardMax?: number;
}): boolean {

  const phoenix =
    getPhoenixCompanyV2(
      companyId,
    );

  const hardMax =
  effectiveHardMax ??
  phoenix?.portfolio.hardMax;

  if (
    hardMax === null ||
    hardMax === undefined ||
    hardMax <= 0 ||
    totalCapitalEur <= 0
  ) {
    return false;
  }

  const existingAmountEur =
    positions.find(
      (position) =>
        position.companyId ===
        companyId,
    )?.marketValueEur ?? 0;

  const resultingAmountEur =
    existingAmountEur +
    amountEur;

  const resultingAllocationPercent =
    (
      resultingAmountEur /
      totalCapitalEur
    ) * 100;

  return (
    resultingAllocationPercent <=
    hardMax
  );
}

function getRotationAllocationBands({
  originalIdealMin,
  originalIdealMax,
  originalHardMax,
  selectedPositionCount,
  averageOriginalIdealMax,
  averageOriginalHardMax,
}: {
  originalIdealMin: number | null;
  originalIdealMax: number | null;
  originalHardMax: number | null;
  selectedPositionCount: number;
  averageOriginalIdealMax: number;
  averageOriginalHardMax: number;
}) {
  const safePositionCount =
    Math.max(
      1,
      selectedPositionCount,
    );

  const neutralWeight =
    100 / safePositionCount;

  const idealMaxScale =
    averageOriginalIdealMax > 0
      ? neutralWeight /
        averageOriginalIdealMax
      : 1;

  const hardMaxTargetAverage =
    neutralWeight * 1.25;

  const hardMaxScale =
    averageOriginalHardMax > 0
      ? hardMaxTargetAverage /
        averageOriginalHardMax
      : 1;

  const effectiveIdealMin =
    originalIdealMin === null
      ? neutralWeight * 0.75
      : originalIdealMin;

  const effectiveIdealMax =
    originalIdealMax === null
      ? neutralWeight
      : Math.max(
          originalIdealMax,
          originalIdealMax *
            idealMaxScale,
        );

  const effectiveHardMax =
    originalHardMax === null
      ? hardMaxTargetAverage
      : Math.max(
          originalHardMax,
          originalHardMax *
            hardMaxScale,
        );

  return {
    effectiveIdealMin,
    effectiveIdealMax,
    effectiveHardMax,
  };
}

/**
 * Een kandidaat moet echte V2-data
 * hebben voordat de optimizer hem
 * überhaupt mag gebruiken.
 */
function isEligibleCandidate(
  companyId: string,
): boolean {
  
  const phoenix =
    getPhoenixCompanyV2(
      companyId,
    );

  if (!phoenix) {
    return false;
  }

  if (
    phoenix.scores.opportunity ===
    null
  ) {
    return false;
  }

  if (
    phoenix.portfolio.hardMax ===
      null ||
    phoenix.portfolio.hardMax ===
      undefined
  ) {
    return false;
  }

  return true;
}


/**
 * Phoenix kiest telkens waar het
 * volgende investeringsblok de grootste
 * verbetering oplevert.
 *
 * Dit is bewust een greedy optimizer.
 *
 * Waarom?
 *
 * - transparant
 * - snel
 * - goed uitlegbaar
 * - geen duizenden onbegrijpelijke
 *   combinaties
 *
 * Later kunnen we hier bovenop een
 * uitgebreidere combinatorial optimizer
 * bouwen.
 */

export function getOptimizerPracticalSettings(
  amountEur: number,
) {
  return {
    maxPositions:
      amountEur <= 5_000
        ? 3
        : amountEur <= 15_000
          ? 4
          : amountEur <= 50_000
            ? 6
            : 10,

    minimumOrderEur: 500,
  };
}

export function getOptimizerCandidateCompanyIds(): string[] {
  return phoenixCompaniesV2.map(
    (company) => company.companyId,
  );
}

function optimizeStarterPortfolioV2({
  input,
  newMoneyEur,
  scenarioRanking,
  minimumEligibleInvestmentScore,
  minimumOrderEur,
  maxPositions,
}: {
  input: NewMoneyOptimizerInput;
  newMoneyEur: number;
  scenarioRanking: ReturnType<
    typeof buildPhoenixScenarioRanking
  >;
  minimumEligibleInvestmentScore: number;
  minimumOrderEur: number;
  maxPositions: number;
}): NewMoneyOptimizerResult {

  const candidateCompanyIds =
    Array.from(
      new Set(
        input.candidateCompanyIds,
      ),
    ).filter(
      isEligibleCandidate,
    );

  const rankedCandidates =
    candidateCompanyIds
      .map((companyId) => {
        const phoenix =
          getPhoenixCompanyV2(
            companyId,
          );

        if (!phoenix) {
          return null;
        }

        const scenarioData =
          scenarioRanking.find(
            (item) =>
              item.companyId ===
              companyId,
          );

        const investmentScore =
          scenarioData?.investmentScore ??
          phoenix.scores.opportunity ??
          0;

        if (
          investmentScore <
          minimumEligibleInvestmentScore
        ) {
          return null;
        }

        const exitReview =
          input.exitReviews?.get(
            companyId,
          ) ?? null;

        const companyUpsidePercent =
          scenarioData?.rawScenarioPower != null
            ? scenarioData.rawScenarioPower *
              100
            : null;

        if (input.exitReviews) {
          const buyEligibility =
            evaluateBuyEligibility({
              companyId,

              investmentScore,

              exitStatus:
                exitReview?.status ??
                null,

              exitPressureScore:
                exitReview?.exitPressureScore ??
                null,

              thesisHealth:
                exitReview
                  ? (
                      exitReview.components
                        .thesisRisk === null
                        ? "UNKNOWN"
                        : exitReview.components
                              .thesisRisk >= 100
                          ? "BROKEN"
                          : exitReview.components
                                .thesisRisk >= 55
                            ? "WEAKENING"
                            : "INTACT"
                    )
                  : "UNKNOWN",

              estimatedCompanyUpsidePercent:
                companyUpsidePercent,

              marketHeatScore:
                exitReview?.components
                  .marketHeat ??
                null,
            });

          if (!buyEligibility.eligible) {
            return null;
          }
        }

        return {
          companyId,
          phoenix,
          investmentScore,
        };
      })
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > => item !== null,
      )
     .sort(
  (a, b) =>
    b.investmentScore -
    a.investmentScore,
);

/**
 * STARTER PORTFOLIO SELECTION
 *
 * maxPositions is hier het gewenste minimumaantal
 * starter-posities.
 *
 * Als die selectie samen onvoldoende hardMax-
 * capaciteit heeft om het startkapitaal verantwoord
 * te beleggen, voegen we extra sterke kandidaten toe.
 *
 * Nooit meer dan 15 posities.
 */
const minimumStarterPositions =
 newMoneyEur <= 3_000
    ? 4
  : Math.min(
    Math.max(
      maxPositions,
      1,
    ),
    15,
  );

const maximumStarterPositions =
  newMoneyEur <= 3_000
    ? 6
    : newMoneyEur <= 7_500
      ? 8
      : 15;

const selectedCandidates:
  typeof rankedCandidates = [];

const starterPositionCapPercent =
  newMoneyEur <= 3_000
    ? 20
    : newMoneyEur <= 7_500
      ? 15
      : null;

let totalHardMaxCapacity =
  0;

for (
  const candidate of
  rankedCandidates
) {
  if (
    selectedCandidates.length >=
    maximumStarterPositions
  ) {
    break;
  }

  selectedCandidates.push(
    candidate,
  );

 const candidateHardMax =
  candidate.phoenix.portfolio
    .hardMax ?? 0;

const candidateEffectiveMax =
  starterPositionCapPercent !== null
    ? Math.max(
        candidateHardMax,
        starterPositionCapPercent,
      )
    : candidateHardMax;

totalHardMaxCapacity +=
  candidateEffectiveMax;

  const minimumReached =
    selectedCandidates.length >=
    minimumStarterPositions;

  const enoughCapacity =
    totalHardMaxCapacity >= 100;

  if (
    minimumReached &&
    enoughCapacity
  ) {
    break;
  }
}

const allocations =
  new Map<string, number>();

let remainingMoney =
  newMoneyEur;

/**
 * FASE 1
 *
 * Bouw eerst de beste kandidaten
 * richting idealMax.
 */
for (
  const candidate of
  selectedCandidates
) {

  if (
    remainingMoney <
    minimumOrderEur
  ) {
    break;
  }

  const idealMax =
    candidate.phoenix.portfolio
      .idealMax;

  if (
    idealMax === null ||
    idealMax <= 0
  ) {
    continue;
  }

  const targetAmountEur =
    newMoneyEur *
    (idealMax / 100);

  const amountEur =
    Math.min(
      targetAmountEur,
      remainingMoney,
    );

  if (
    amountEur <
    minimumOrderEur
  ) {
    continue;
  }

  allocations.set(
    candidate.companyId,
    amountEur,
  );

  remainingMoney -=
    amountEur;
}

/**
 * FASE 2
 *
 * Alleen als er daarna nog geld over is,
 * mogen reeds geselecteerde posities verder
 * richting hardMax worden gevuld.
 */
if (
  remainingMoney > 0
) {
  for (
    const candidate of
    selectedCandidates
  ) {
    if (
      remainingMoney <= 0
    ) {
      break;
    }

    const currentAmountEur =
      allocations.get(
        candidate.companyId,
      );

    if (
      currentAmountEur ===
      undefined
    ) {
      continue;
    }

    const hardMax =
      candidate.phoenix.portfolio
        .hardMax;

    if (
      hardMax === null ||
      hardMax <= 0
    ) {
      continue;
    }

    const effectiveMaxPercent =
  starterPositionCapPercent !== null
    ? Math.max(
        hardMax,
        starterPositionCapPercent,
      )
    : hardMax;

const hardMaxAmountEur =
  newMoneyEur *
  (effectiveMaxPercent / 100);

    const availableRoomEur =
      Math.max(
        0,
        hardMaxAmountEur -
          currentAmountEur,
      );

    const extraAmountEur =
      Math.min(
        availableRoomEur,
        remainingMoney,
      );

    allocations.set(
      candidate.companyId,
      currentAmountEur +
        extraAmountEur,
    );

    remainingMoney -=
      extraAmountEur;
  }
}

  const workingPositions:
    PortfolioV2PositionInput[] =
    Array.from(
      allocations.entries(),
    ).map(
      ([
        companyId,
        amountEur,
      ]) => ({
        companyId,
        marketValueEur:
          amountEur,
      }),
    );

  const portfolioAfter =
    calculatePortfolioV2(
      workingPositions,
    );

  const scoreAfter =
    getPortfolioScore(
      portfolioAfter,
    );

  const resultAllocations:
    NewMoneyAllocation[] =
    Array.from(
      allocations.entries(),
    )
      .map(
        ([
          companyId,
          amountEur,
        ]) => {
          const phoenix =
            getPhoenixCompanyV2(
              companyId,
            );

          const after =
            getPositionFromPortfolio(
              portfolioAfter,
              companyId,
            );

          if (
            !phoenix ||
            !after ||
            phoenix.scores.opportunity ===
              null
          ) {
            return null;
          }

          const scenarioData =
            scenarioRanking.find(
              (item) =>
                item.companyId ===
                companyId,
            );

          return {
            companyId,

            amountEur,

            allocationBeforePercent:
              0,

            allocationAfterPercent:
  newMoneyEur > 0
    ? (
        amountEur /
        newMoneyEur
      ) * 100
    : 0,

            opportunity:
              phoenix.scores
                .opportunity,

            investmentScore:
              scenarioData
                ?.investmentScore ??
              phoenix.scores
                .opportunity,

            idealMin:
              phoenix.portfolio
                .idealMin,

            idealMax:
              phoenix.portfolio
                .idealMax,

            hardMax:
              phoenix.portfolio
                .hardMax,

            wasExistingHolding:
              false,
          };
        },
      )
      .filter(
        (
          item,
        ): item is NewMoneyAllocation =>
          item !== null,
      )
      .sort(
        (a, b) =>
          b.amountEur -
          a.amountEur,
      );

  const moneyInvestedEur =
    resultAllocations.reduce(
      (total, item) =>
        total + item.amountEur,
      0,
    );

  const moneyUnallocatedEur =
    Math.max(
      0,
      newMoneyEur -
        moneyInvestedEur,
    );

  return {
    newMoneyEur,

    scoreBefore: null,
    scoreAfter,

    scoreImprovement: null,

    allocations:
      resultAllocations,

    portfolioBefore:
      calculatePortfolioV2([]),

    portfolioAfter,

    moneyInvestedEur,
    moneyUnallocatedEur,

    isMeaningfulImprovement:
      resultAllocations.length > 0,

    explanation: [
      resultAllocations.length > 0
        ? `${resultAllocations.length} positie(s) geselecteerd voor een nieuw startportfolio.`
        : "Phoenix vond geen geschikte aandelen voor een nieuw startportfolio.",

      moneyUnallocatedEur > 0
        ? `€${moneyUnallocatedEur.toFixed(
            0,
          )} blijft voorlopig ongealloceerd.`
        : "Het beschikbare startkapitaal is volledig toegewezen.",
    ],
  };
}

export function optimizeNewMoneyV2(
  input: NewMoneyOptimizerInput,
): NewMoneyOptimizerResult {
  const newMoneyEur =
    Math.max(
      0,
      input.newMoneyEur,
    );

  const maxPositions =
    input.maxPositions ??
    DEFAULT_MAX_POSITIONS;

  const minimumOrderEur =
    input.minimumOrderEur ??
    DEFAULT_MINIMUM_ORDER_EUR;

  const portfolioBefore =
    calculatePortfolioV2(
      input.positions,
    );

  const scoreBefore =
    getPortfolioScore(
      portfolioBefore,
    );

      const scenarioRanking =
    input.liveMetalPrices
      ? buildPhoenixScenarioRanking({
          livePrices:
            input.liveMetalPrices,
        })
      : [];
      const bestAvailableInvestmentScore =
  scenarioRanking.reduce(
    (best, item) =>
      Math.max(
        best,
        item.investmentScore ?? -Infinity,
      ),
    -Infinity,
  );

const INVESTMENT_SCORE_RANGE = 8;

const minimumEligibleInvestmentScore =
  Number.isFinite(
    bestAvailableInvestmentScore,
  )
    ? bestAvailableInvestmentScore -
      INVESTMENT_SCORE_RANGE
    : -Infinity;

  const starterMaxPositions =
  newMoneyEur < 5_000
    ? 6
    : newMoneyEur <= 10_000
      ? 8
      : newMoneyEur <= 25_000
        ? 10
        : newMoneyEur <= 50_000
          ? 12
          : 15;

    const isEmptyPortfolio =
  input.positions.length === 0;

const starterMinimumOrderEur =
  Math.max(
    50,
    Math.min(
      minimumOrderEur,
      newMoneyEur * 0.02,
    ),
  );

if (
  isEmptyPortfolio &&
  newMoneyEur > 0
) {
  return optimizeStarterPortfolioV2({
    input,
    newMoneyEur,
    scenarioRanking,
    minimumEligibleInvestmentScore,
    minimumOrderEur:
  starterMinimumOrderEur,
     maxPositions: starterMaxPositions,
  });
}

  if (
    newMoneyEur <= 0 ||
    scoreBefore === null
  ) {
    return {
      newMoneyEur,

      scoreBefore,
      scoreAfter:
        scoreBefore,

      scoreImprovement: 0,

      allocations: [],

      portfolioBefore,
      portfolioAfter:
        portfolioBefore,

      moneyInvestedEur: 0,
      moneyUnallocatedEur:
        newMoneyEur,

      isMeaningfulImprovement:
        false,

      explanation: [
        "Geen bruikbaar nieuw investeringsbedrag beschikbaar.",
      ],
    };
  }

  const candidateCompanyIds =
    Array.from(
      new Set(
        input.candidateCompanyIds,
      ),
    ).filter(
      isEligibleCandidate,
    );

  let workingPositions =
    clonePositions(
      input.positions,
    );

  let remainingMoney =
    newMoneyEur;

  const stepSize =
    determineStepSize(
      newMoneyEur,
    );

  const allocations =
    new Map<string, number>();

  /**
   * ----------------------------------
   * FASE 1
   *
   * Verdeel het geld in praktische
   * investeringsblokken.
   * ----------------------------------
   */
  while (remainingMoney > 0) {
    const amountToAllocate =
      Math.min(
        stepSize,
        remainingMoney,
      );

    const currentPortfolio =
      calculatePortfolioV2(
        workingPositions,
      );

    const currentScore =
      getPortfolioScore(
        currentPortfolio,
      );

    if (currentScore === null) {
      break;
    }

   let bestCompanyId:
  | string
  | null = null;

let bestScore =
  currentScore;

let bestInvestmentScore =
  -Infinity;

  let fallbackCompanyId:
  | string
  | null = null;

let fallbackInvestmentScore =
  -Infinity;

let fallbackSimulatedScore =
  -Infinity;

    for (
      const companyId of
      candidateCompanyIds
    ) {

      const exitReview =
  input.exitReviews?.get(
    companyId,
  ) ?? null;

const scenarioData =
  scenarioRanking.find(
    (item) =>
      item.companyId ===
      companyId,
  );

const companyUpsidePercent =
  scenarioData?.rawScenarioPower != null
    ? scenarioData.rawScenarioPower *
      100
    : null;

if (input.exitReviews) {
  const buyEligibility =
    evaluateBuyEligibility({
      companyId,

      investmentScore:
        scenarioData?.investmentScore ??
        null,

      exitStatus:
        exitReview?.status ??
        null,

      exitPressureScore:
        exitReview?.exitPressureScore ??
        null,

      thesisHealth:
        exitReview
          ? (
              exitReview.components.thesisRisk === null
                ? "UNKNOWN"
                : exitReview.components.thesisRisk >= 100
                  ? "BROKEN"
                  : exitReview.components.thesisRisk >= 55
                    ? "WEAKENING"
                    : "INTACT"
            )
          : "UNKNOWN",

      estimatedCompanyUpsidePercent:
        companyUpsidePercent,

      marketHeatScore:
        exitReview?.components.marketHeat ??
        null,
    });

  if (!buyEligibility.eligible) {
    continue;
  }
}

      const alreadySelected =
        allocations.has(
          companyId,
        );

      /**
       * Maximaal bijvoorbeeld drie
       * verschillende koopposities.
       */
      if (
        !alreadySelected &&
        allocations.size >=
          maxPositions
      ) {
        continue;
      }

    const canAllocateMoney =
  input.allowStrategicNewPositionFallback ===
    true
    ? canAddRotationMoney({
        positions:
          workingPositions,

        companyId,

        amountEur:
          amountToAllocate,

        totalCapitalEur:
          workingPositions.reduce(
            (total, position) =>
              total +
              position.marketValueEur,
            0,
          ) +
          remainingMoney,
      })
    : canAddMoney({
        positions:
          workingPositions,

        companyId,

        amountEur:
          amountToAllocate,
      });

if (!canAllocateMoney) {
  continue;
}

      const simulatedPositions =
        addMoneyToCompany({
          positions:
            workingPositions,

          companyId,

          amountEur:
            amountToAllocate,
        });

      const simulatedPortfolio =
        calculatePortfolioV2(
          simulatedPositions,
        );

      const simulatedScore =
        getPortfolioScore(
          simulatedPortfolio,
        );

      if (
        simulatedScore === null
      ) {
        continue;
      }

 const investmentScore =
  scenarioData?.investmentScore ??
  getPhoenixCompanyV2(companyId)
    ?.scores.opportunity ??
  0;

if (
  investmentScore <
  minimumEligibleInvestmentScore
) {
  continue;
}

const alreadySelectedInPhase2 =
  allocations.has(
    companyId,
  );

if (
  !alreadySelectedInPhase2 &&
  allocations.size >=
    maxPositions
) {
  continue;
}

const isExistingHolding =
  workingPositions.some(
    (position) =>
      position.companyId ===
      companyId,
  );

if (
  input.allowStrategicNewPositionFallback ===
    true &&
  !isExistingHolding &&
  !alreadySelectedInPhase2
) {
  const betterFallback =
    investmentScore >
      fallbackInvestmentScore ||
    (
      investmentScore ===
        fallbackInvestmentScore &&
      simulatedScore >
        fallbackSimulatedScore
    );

  if (betterFallback) {
    fallbackCompanyId =
      companyId;

    fallbackInvestmentScore =
      investmentScore;

    fallbackSimulatedScore =
      simulatedScore;
  }
}

/**
 * Portfolio Score is leidend.
 *
 * Investment Score wordt alleen gebruikt
 * als tie-breaker wanneer twee kandidaten
 * vrijwel dezelfde Portfolio Score opleveren.
 */
const scoreImprovement =
  simulatedScore -
  currentScore;

  if (
  newMoneyEur === 10_000 &&
  remainingMoney === 10_000
) {
}

const bestScoreImprovement =
  bestScore -
  currentScore;

const TIE_THRESHOLD = 0.015;

const isBetterPortfolioResult =
  scoreImprovement >
  bestScoreImprovement +
    TIE_THRESHOLD;

const isNearTie =
  Math.abs(
    scoreImprovement -
    bestScoreImprovement,
  ) <= TIE_THRESHOLD;

const winsTieBreaker =
  isNearTie &&
  scoreImprovement >=
    -TIE_THRESHOLD &&
  investmentScore >
    bestInvestmentScore;

if (
  isBetterPortfolioResult ||
  winsTieBreaker
) {
  bestScore =
    simulatedScore;

  bestInvestmentScore =
  investmentScore;

  bestCompanyId =
    companyId;
}
}

    /**
     * Als geen enkel aandeel de score
     * verbetert, stopt Phoenix.
     *
     * We investeren dus niet verplicht
     * geld alleen omdat het beschikbaar
     * is.
     */

   if (
  !bestCompanyId &&
  fallbackCompanyId
) {
  bestCompanyId =
    fallbackCompanyId;
}

if (!bestCompanyId) {
  break;
}

    workingPositions =
      addMoneyToCompany({
        positions:
          workingPositions,

        companyId:
          bestCompanyId,

        amountEur:
          amountToAllocate,
      });

    allocations.set(
      bestCompanyId,

      (
        allocations.get(
          bestCompanyId,
        ) ?? 0
      ) + amountToAllocate,
    );

    remainingMoney -=
      amountToAllocate;
  }

    /**
   * ----------------------------------
   * FASE 2
   *
   * TARGET FILLING
   *
   * Alleen serieuze kandidaten die in
   * Fase 1 al geselecteerd zijn worden
   * verder richting idealMax gevuld.
   *
   * We simuleren iedere volgende stap.
   * Alleen wanneer de positie NA de
   * aankoop niet boven idealMax komt,
   * mag de aankoop worden uitgevoerd.
   * ----------------------------------
   */

 const rotationSelectedPositionCount =
  allocations.size;

const selectedRotationCompanyIds =
  Array.from(
    allocations.keys(),
  );

const selectedRotationCompanies =
  selectedRotationCompanyIds
    .map((companyId) =>
      getPhoenixCompanyV2(companyId),
    )
    .filter(
      (
        company,
      ): company is NonNullable<
        typeof company
      > => company !== null,
    );

const rotationIdealMaxValues =
  selectedRotationCompanies
    .map(
      (company) =>
        company.portfolio.idealMax,
    )
    .filter(
      (
        value,
      ): value is number =>
        value !== null,
    );

const rotationHardMaxValues =
  selectedRotationCompanies
    .map(
      (company) =>
        company.portfolio.hardMax,
    )
    .filter(
      (
        value,
      ): value is number =>
        value !== null,
    );

const averageOriginalIdealMax =
  rotationIdealMaxValues.length > 0
    ? rotationIdealMaxValues.reduce(
        (total, value) =>
          total + value,
        0,
      ) /
      rotationIdealMaxValues.length
    : 0;

const averageOriginalHardMax =
  rotationHardMaxValues.length > 0
    ? rotationHardMaxValues.reduce(
        (total, value) =>
          total + value,
        0,
      ) /
      rotationHardMaxValues.length
    : 0;

  while (
    remainingMoney >=
    minimumOrderEur
  ) {
    const currentPortfolio =
      calculatePortfolioV2(
        workingPositions,
      );

    let bestCompanyId:
      | string
      | null = null;

    let bestPriority =
      -Infinity;

    for (
      const companyId of
      candidateCompanyIds
    ) {
      if (!allocations.has(companyId)) {
  continue;
}
const exitReview =
  input.exitReviews?.get(
    companyId,
  ) ?? null;

const scenarioData =
  scenarioRanking.find(
    (item) =>
      item.companyId ===
      companyId,
  );

const companyUpsidePercent =
  scenarioData?.rawScenarioPower != null
    ? scenarioData.rawScenarioPower *
      100
    : null;

if (input.exitReviews) {
 const buyEligibility =
  evaluateBuyEligibility({
    companyId,

    investmentScore:
      scenarioData?.investmentScore ??
      null,

    exitStatus:
      exitReview?.status ??
      null,

    exitPressureScore:
      exitReview?.exitPressureScore ??
      null,

    thesisHealth:
      exitReview
        ? (
            exitReview.components.thesisRisk === null
              ? "UNKNOWN"
              : exitReview.components.thesisRisk >= 100
                ? "BROKEN"
                : exitReview.components.thesisRisk >= 55
                  ? "WEAKENING"
                  : "INTACT"
          )
        : null,

    estimatedCompanyUpsidePercent:
      companyUpsidePercent,

    marketHeatScore:
      exitReview?.components.marketHeat ??
      null,
  });

 if (!buyEligibility.eligible) {
  continue;
}
}

      /**
       * Fase 2 mag geen nieuwe namen
       * introduceren.
       */

      const phoenix =
        getPhoenixCompanyV2(
          companyId,
        );

      if (!phoenix) {
        continue;
      }

    const rotationAllocationBands =
  getRotationAllocationBands({
    originalIdealMin:
      phoenix.portfolio.idealMin,

    originalIdealMax:
      phoenix.portfolio.idealMax,

    originalHardMax:
      phoenix.portfolio.hardMax,

    selectedPositionCount:
      rotationSelectedPositionCount,

          averageOriginalIdealMax,

    averageOriginalHardMax,
  });

const idealMin =
  input.allowStrategicNewPositionFallback ===
    true
    ? rotationAllocationBands
        .effectiveIdealMin
    : phoenix.portfolio.idealMin;

const idealMax =
  input.allowStrategicNewPositionFallback ===
    true
    ? rotationAllocationBands
        .effectiveIdealMax
    : phoenix.portfolio.idealMax;

if (
  idealMin === null ||
  idealMax === null
) {
  continue;
}

      const investmentScore =
        scenarioData
          ?.investmentScore ??
        phoenix.scores
          .opportunity ??
        0;

      /**
       * Zelfde relatieve kwaliteitsfilter
       * als Fase 1.
       */
      if (
        investmentScore <
        minimumEligibleInvestmentScore
      ) {
        continue;
      }

      const position =
        getPositionFromPortfolio(
          currentPortfolio,
          companyId,
        );

const currentAllocation =
  position
    ?.allocationPercent ??
  0;

const effectiveCurrentAllocation =
  input.allowStrategicNewPositionFallback ===
    true
    ? (
        (
          position?.marketValueEur ??
          0
        ) /
        (
          workingPositions.reduce(
            (total, item) =>
              total +
              item.marketValueEur,
            0,
          ) +
          remainingMoney
        )
      ) * 100
    : currentAllocation;

if (
  effectiveCurrentAllocation >=
  idealMax
) {
  continue;
}

      const amountToAllocate =
        Math.min(
          stepSize,
          remainingMoney,
        );

      const canAllocateMore =
  input.allowStrategicNewPositionFallback ===
    true
    ? canAddRotationMoney({
    positions:
      workingPositions,

    companyId,

    amountEur:
      amountToAllocate,

    totalCapitalEur:
      workingPositions.reduce(
        (total, position) =>
          total +
          position.marketValueEur,
        0,
      ) +
      remainingMoney,

    effectiveHardMax:
      rotationAllocationBands
        .effectiveHardMax,
  })
    : canAddMoney({
        positions:
          workingPositions,

        companyId,

        amountEur:
          amountToAllocate,
      });

if (!canAllocateMore) {
  continue;
}

      /**
       * SIMULATIE:
       *
       * Voeg de volgende stap tijdelijk
       * toe en controleer de daadwerkelijke
       * allocatie na de aankoop.
       */
      const simulatedPositions =
        addMoneyToCompany({
          positions:
            workingPositions,

          companyId,

          amountEur:
            amountToAllocate,
        });

      const simulatedPortfolio =
        calculatePortfolioV2(
          simulatedPositions,
        );

      const simulatedPosition =
        getPositionFromPortfolio(
          simulatedPortfolio,
          companyId,
        );

      if (!simulatedPosition) {
        continue;
      }

      /**
       * Geen overshoot van idealMax.
       *
       * Kleine floating-point marge om
       * 7.0000000001% niet foutief af
       * te wijzen.
       */
     const simulatedAllocationPercent =
  input.allowStrategicNewPositionFallback ===
    true
    ? (
        simulatedPosition.marketValueEur /
        (
          workingPositions.reduce(
            (total, position) =>
              total +
              position.marketValueEur,
            0,
          ) +
          remainingMoney
        )
      ) * 100
    : simulatedPosition.allocationPercent;

if (
  simulatedAllocationPercent >
  idealMax + 0.0001
) {
  continue;
}

      /**
       * Onder idealMin krijgt voorrang.
       * Daarna Investment Score en afstand
       * tot de ideale band.
       */
      const belowIdealMin =
  effectiveCurrentAllocation <
  idealMin;

      const distanceToIdealMin =
        Math.max(
          0,
          idealMin -
            effectiveCurrentAllocation,
        );

      const distanceToIdealMax =
        Math.max(
          0,
          idealMax -
           effectiveCurrentAllocation,
        );

      const priority =
        (
          belowIdealMin
            ? 1000
            : 0
        ) +
       investmentScore +
        distanceToIdealMin *
          10 +
        distanceToIdealMax;

      if (
        priority >
        bestPriority
      ) {
        bestPriority =
          priority;

        bestCompanyId =
          companyId;
      }
    }

    

    /**
     * Alle geselecteerde sterke posities
     * zitten dan praktisch tegen idealMax.
     */
    if (!bestCompanyId) {
      break;
    }

    const amountToAllocate =
      Math.min(
        stepSize,
        remainingMoney,
      );

    workingPositions =
      addMoneyToCompany({
        positions:
          workingPositions,

        companyId:
          bestCompanyId,

        amountEur:
          amountToAllocate,
      });

    allocations.set(
      bestCompanyId,

      (
        allocations.get(
          bestCompanyId,
        ) ?? 0
      ) +
        amountToAllocate,
    );

    remainingMoney -=
      amountToAllocate;
  }

  /**
   * ----------------------------------
   * FASE 3
   *
   * Anti-pietluttigheid.
   *
   * Verwijder kleine losse orders.
   * ----------------------------------
   */

  const meaningfulAllocations =
  Array.from(
    allocations.entries(),
  ).filter(
    ([, amountEur]) =>
      amountEur >=
        minimumOrderEur,
  );

const discardedMoneyEur =
  Array.from(
    allocations.entries(),
  )
    .filter(
      ([, amountEur]) =>
        amountEur <
        minimumOrderEur,
    )
    .reduce(
      (total, [, amountEur]) =>
        total + amountEur,
      0,
    );

    let moneyToRedistribute =
  discardedMoneyEur;

while (
  moneyToRedistribute >=
  minimumOrderEur
) {
  let bestCompanyId:
    | string
    | null = null;

  let bestScore =
    -Infinity;

  for (
    const [
      companyId,
    ] of meaningfulAllocations
  ) {
    const testPositions =
      clonePositions(
        input.positions,
      );

    let rebuiltPositions =
      testPositions;

      for (
  const [
    existingCompanyId,
    existingAmountEur,
  ] of meaningfulAllocations
) {
  rebuiltPositions =
    addMoneyToCompany({
      positions:
        rebuiltPositions,

      companyId:
        existingCompanyId,

      amountEur:
        existingAmountEur,
    });
}

    if (
      !canAddMoney({
        positions:
          rebuiltPositions,

        companyId,

        amountEur:
          minimumOrderEur,
      })
    ) {
      continue;
    }

    const simulatedPositions =
      addMoneyToCompany({
        positions:
          rebuiltPositions,

        companyId,

        amountEur:
          minimumOrderEur,
      });

    const simulatedPortfolio =
      calculatePortfolioV2(
        simulatedPositions,
      );

    const simulatedScore =
      getPortfolioScore(
        simulatedPortfolio,
      );

    if (
      simulatedScore !== null &&
      simulatedScore >
        bestScore
    ) {
      bestScore =
        simulatedScore;

      bestCompanyId =
        companyId;
    }
  }

  if (!bestCompanyId) {
    break;
  }

  const existingIndex =
    meaningfulAllocations.findIndex(
      ([companyId]) =>
        companyId ===
        bestCompanyId,
    );

  if (existingIndex === -1) {
    break;
  }

  meaningfulAllocations[
    existingIndex
  ][1] +=
    minimumOrderEur;

  moneyToRedistribute -=
    minimumOrderEur;
}

  /**
   * We bouwen de portefeuille opnieuw
   * op zonder eventuele kleine orders.
   */
  workingPositions =
    clonePositions(
      input.positions,
    );

  let moneyInvestedEur = 0;

for (
  const [
    companyId,
    amountEur,
  ] of meaningfulAllocations
) {
  workingPositions =
    addMoneyToCompany({
      positions:
        workingPositions,

      companyId,
      amountEur,
    });

  moneyInvestedEur +=
    amountEur;
}

  const portfolioAfter =
    calculatePortfolioV2(
      workingPositions,
    );

  const scoreAfter =
    getPortfolioScore(
      portfolioAfter,
    );

  const scoreImprovement =
    scoreBefore !== null &&
    scoreAfter !== null
      ? scoreAfter -
        scoreBefore
      : null;

  /**
   * Voorlopige practical threshold.
   *
   * Minder dan +0,10 Portfolio Score
   * noemen we nog geen betekenisvolle
   * verbetering.
   *
   * Deze threshold gaan we later
   * uitgebreid kalibreren.
   */
  const isMeaningfulImprovement =
    scoreImprovement !== null &&
    scoreImprovement >= 0.1;

  const resultAllocations:
    NewMoneyAllocation[] =
    meaningfulAllocations
      .map(
        ([
          companyId,
          amountEur,
        ]) => {
          const before =
            getPositionFromPortfolio(
              portfolioBefore,
              companyId,
            );

          const after =
            getPositionFromPortfolio(
              portfolioAfter,
              companyId,
            );

          const phoenix =
            getPhoenixCompanyV2(
              companyId,
            );

          if (
            !after ||
            !phoenix
          ) {
            return null;
          }

          const opportunity =
            phoenix.scores
              .opportunity;

          if (
            opportunity === null
          ) {
            return null;
          }

          return {
            companyId,

            amountEur,

            allocationBeforePercent:
              before
                ?.allocationPercent ??
              0,

            allocationAfterPercent:
              after.allocationPercent,

            opportunity,
            investmentScore:
  scenarioRanking.find(
    (item) =>
      item.companyId ===
      companyId,
  )?.investmentScore ??
  opportunity,

            idealMin:
              phoenix.portfolio
                .idealMin,

            idealMax:
              phoenix.portfolio
                .idealMax,

            hardMax:
              phoenix.portfolio
                .hardMax,

            wasExistingHolding:
              before !== undefined,

          };
        },
      )
      .filter(
        (
          allocation,
        ): allocation is NewMoneyAllocation =>
          allocation !== null,
      )
      .sort(
        (a, b) =>
          b.amountEur -
          a.amountEur,
      );

  const moneyUnallocatedEur =
    Math.max(
      0,
      newMoneyEur -
        moneyInvestedEur,
    );

  const explanation: string[] =
    [];

  if (
    resultAllocations.length ===
    0
  ) {
    explanation.push(
      "Phoenix vond geen praktische investering die de Portfolio Score voldoende verbetert.",
    );
  } else {
    explanation.push(
      `${resultAllocations.length} positie(s) geselecteerd voor nieuw kapitaal.`,
    );

    if (
      moneyUnallocatedEur > 0
    ) {
      explanation.push(
        `€${moneyUnallocatedEur.toFixed(
          0,
        )} blijft voorlopig ongealloceerd omdat Phoenix geen voldoende aantrekkelijke praktische bestemming vond.`,
      );
    }

    if (
      isMeaningfulImprovement
    ) {
      explanation.push(
        "De voorgestelde allocatie levert een betekenisvolle verbetering van de Portfolio Score op.",
      );
    } else {
      explanation.push(
        "De berekende verbetering is klein; Phoenix zou deze transactie daarom niet als sterke aanbeveling behandelen.",
      );
    }
  }

  return {
    newMoneyEur,

    scoreBefore,
    scoreAfter,
    scoreImprovement,

    allocations:
      resultAllocations,

    portfolioBefore,
    portfolioAfter,

    moneyInvestedEur,
    moneyUnallocatedEur,

    isMeaningfulImprovement,

    explanation,
  };
}
