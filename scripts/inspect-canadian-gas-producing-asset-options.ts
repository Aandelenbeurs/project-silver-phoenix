import {
  calculateCanadianGasProducingAssetOptions,
} from "../data/multi-sector/sectors/canadian-natural-gas/producing-asset-options";

function assertEqual(
  actual: number | string | null,
  expected: number | string | null,
  description: string
): void {
  if (actual !== expected) {
    throw new Error(
      `${description}: expected ${expected}, received ${actual}`
    );
  }

  console.log(`PASS: ${description}`);
}

// TEST 1 — Profitable production.

const profitable = calculateCanadianGasProducingAssetOptions({
  continueProductionDcfCad: 100_000_000,
  canShutDown: true,
  shutdownObligationsCad: 10_000_000,
});

assertEqual(profitable.selectedOption, "continue", "Profitable production continues");
assertEqual(profitable.producingAssetValueCad, 100_000_000, "Positive asset value preserved");
assertEqual(profitable.residualLiabilityCad, 0, "No residual liability");

// TEST 2 — Loss-making production with shutdown option.

const shutdown = calculateCanadianGasProducingAssetOptions({
  continueProductionDcfCad: -40_000_000,
  canShutDown: true,
  shutdownObligationsCad: 12_000_000,
});

assertEqual(shutdown.selectedOption, "shutdown", "Shutdown selected when economically preferable");
assertEqual(shutdown.selectedNetValueCad, -12_000_000, "Shutdown obligations preserved");
assertEqual(shutdown.producingAssetValueCad, 0, "Negative asset value not passed as positive asset");
assertEqual(shutdown.residualLiabilityCad, 12_000_000, "Shutdown liability separated");

// TEST 3 — Loss-making production without shutdown option.

const forcedProduction = calculateCanadianGasProducingAssetOptions({
  continueProductionDcfCad: -40_000_000,
  canShutDown: false,
  shutdownObligationsCad: 12_000_000,
});

assertEqual(forcedProduction.selectedOption, "continue", "Forced production remains active");
assertEqual(forcedProduction.selectedNetValueCad, -40_000_000, "Negative economic value preserved");
assertEqual(forcedProduction.residualLiabilityCad, 40_000_000, "Negative value separated");

// TEST 4 — Shutdown is available but not economically preferable.

const expensiveShutdown = calculateCanadianGasProducingAssetOptions({
  continueProductionDcfCad: -5_000_000,
  canShutDown: true,
  shutdownObligationsCad: 20_000_000,
});

assertEqual(expensiveShutdown.selectedOption, "continue", "Less expensive continuation selected");
assertEqual(expensiveShutdown.selectedNetValueCad, -5_000_000, "Continuation value preserved");

// TEST 5 — Invalid assumptions rejected.

let rejected = false;

try {
  calculateCanadianGasProducingAssetOptions({
    continueProductionDcfCad: -40_000_000,
    canShutDown: true,
    shutdownObligationsCad: -1,
  });
} catch {
  rejected = true;
}

if (!rejected) {
  throw new Error("Negative shutdown obligations should be rejected");
}

console.log("PASS: Invalid shutdown obligations rejected");

// TEST 6 — Net value reconciles with components.

for (const result of [
  profitable,
  shutdown,
  forcedProduction,
  expensiveShutdown,
]) {
  assertEqual(
    result.producingAssetValueCad - result.residualLiabilityCad,
    result.selectedNetValueCad,
    `${result.selectedOption} net value reconciles`
  );
}