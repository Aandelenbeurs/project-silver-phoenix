
import {
  calculateCanadianGasProducingAssetValuationBridge,
} from "../data/multi-sector/sectors/canadian-natural-gas/producing-asset-valuation-bridge";

function assertClose(
  actual: number,
  expected: number,
  description: string
): void {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(
      `${description}: expected ${expected}, received ${actual}`
    );
  }

  console.log(`PASS: ${description}`);
}

// Case 1: shutdown is preferable.
const shutdown = calculateCanadianGasProducingAssetValuationBridge({
  continueProductionDcfCad: -40_000_000,
  canShutDown: true,
  shutdownObligationsCad: 12_000_000,

  // Other assets CAD 100m minus net debt CAD 60m.
  // Producing asset component is zero.
    undevelopedInventoryValueCad: 0,
  unbookedOptionalityValueCad: 0,
  otherAssetValueCad: 100_000_000,
  netDebtCad: 60_000_000,

  dilutedShares: 100_000_000,
  cumulativeDividendsPerShareCad: 0.05,
});

if (shutdown.options.selectedOption !== "shutdown") {
  throw new Error("Expected shutdown option");
}

console.log("PASS: Shutdown option selected");

assertClose(
  shutdown.adjustment.adjustedEquityValueCad,
  28_000_000,
  "Shutdown liability deducted from equity"
);

assertClose(
  shutdown.adjustment.adjustedTotalShareholderValuePerShareCad,
  0.33,
  "Shutdown shareholder value includes dividends"
);

// Case 2: production is profitable.
const profitable = calculateCanadianGasProducingAssetValuationBridge({
  continueProductionDcfCad: 100_000_000,
  canShutDown: true,
  shutdownObligationsCad: 12_000_000,

  // Other assets CAD 100m - net debt CAD 60m
  // + producing asset CAD 100m.
    undevelopedInventoryValueCad: 0,
  unbookedOptionalityValueCad: 0,
  otherAssetValueCad: 100_000_000,
  netDebtCad: 60_000_000,

  dilutedShares: 100_000_000,
  cumulativeDividendsPerShareCad: 0,
});

assertClose(
  profitable.adjustment.adjustedEquityValueCad,
  140_000_000,
  "Profitable production requires no adjustment"
);

// Case 3: negative value without shutdown option.
const forced = calculateCanadianGasProducingAssetValuationBridge({
  continueProductionDcfCad: -40_000_000,
  canShutDown: false,
  shutdownObligationsCad: 12_000_000,

    undevelopedInventoryValueCad: 0,
  unbookedOptionalityValueCad: 0,
  otherAssetValueCad: 10_000_000,
  netDebtCad: 0,
  dilutedShares: 100_000_000,
  cumulativeDividendsPerShareCad: 0,
});

assertClose(
  forced.adjustment.adjustedEquityValueCad,
  -30_000_000,
  "Forced production retains negative economic equity"
);

// Case 4: independently reconcile positive asset valuation.
const positiveReconciliation =
  calculateCanadianGasProducingAssetValuationBridge({
    continueProductionDcfCad: 80_000_000,
    canShutDown: true,
    shutdownObligationsCad: 10_000_000,

    undevelopedInventoryValueCad: 20_000_000,
    unbookedOptionalityValueCad: 5_000_000,
    otherAssetValueCad: 15_000_000,

    netDebtCad: 30_000_000,
    dilutedShares: 100_000_000,
    cumulativeDividendsPerShareCad: 0.02,
  });

// 80m + 20m + 5m + 15m - 30m = 90m.
assertClose(
  positiveReconciliation.adjustment.adjustedEquityValueCad,
  90_000_000,
  "Positive asset valuation independently reconciles"
);

assertClose(
  positiveReconciliation.adjustment.adjustedTotalShareholderValuePerShareCad,
  0.92,
  "Positive shareholder value independently reconciles"
);

// Case 5: independently reconcile negative asset valuation.
const negativeReconciliation =
  calculateCanadianGasProducingAssetValuationBridge({
    continueProductionDcfCad: -50_000_000,
    canShutDown: true,
    shutdownObligationsCad: 15_000_000,

    undevelopedInventoryValueCad: 20_000_000,
    unbookedOptionalityValueCad: 5_000_000,
    otherAssetValueCad: 15_000_000,

    netDebtCad: 30_000_000,
    dilutedShares: 100_000_000,
    cumulativeDividendsPerShareCad: 0.02,
  });

// Producing asset = 0.
// Other assets = 40m.
// Net debt = 30m.
// Shutdown adjustment = -15m.
// Adjusted equity = -5m.
assertClose(
  negativeReconciliation.adjustment.adjustedEquityValueCad,
  -5_000_000,
  "Negative asset valuation independently reconciles"
);

assertClose(
  negativeReconciliation.adjustment.adjustedTotalShareholderValuePerShareCad,
  -0.03,
  "Negative shareholder value independently reconciles"
);