import {
  calculateCanadianGasRemainingReserves,
} from "../data/multi-sector/sectors/canadian-natural-gas/remaining-reserves";

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

// TEST 1 — Vijf jaar productie aftrekken

const remaining = calculateCanadianGasRemainingReserves({
  beginningReservesBcf: 500,
  projectedAnnualProductionBcf: [30, 30, 30, 30, 30],
});

assertClose(
  remaining,
  350,
  "Five-year production leaves 350 Bcf"
);

// TEST 2 — Productie mag reserves niet overschrijden

const depleted = calculateCanadianGasRemainingReserves({
  beginningReservesBcf: 100,
  projectedAnnualProductionBcf: [30, 30, 30, 30, 30],
});

assertClose(
  depleted,
  0,
  "Reserves cannot become negative"
);

// TEST 3 — Geen projectiejaren

const unchanged = calculateCanadianGasRemainingReserves({
  beginningReservesBcf: 500,
  projectedAnnualProductionBcf: [],
});

assertClose(
  unchanged,
  500,
  "No production leaves reserves unchanged"
);

// TEST 4 — Ongeldige beginreserves

let invalidReservesRejected = false;

try {
  calculateCanadianGasRemainingReserves({
    beginningReservesBcf: -10,
    projectedAnnualProductionBcf: [5],
  });
} catch {
  invalidReservesRejected = true;
}

if (!invalidReservesRejected) {
  throw new Error("Negative reserves were accepted");
}

console.log("PASS: Negative reserves rejected");

// TEST 5 — Ongeldige productie

let invalidProductionRejected = false;

try {
  calculateCanadianGasRemainingReserves({
    beginningReservesBcf: 100,
    projectedAnnualProductionBcf: [20, -5],
  });
} catch {
  invalidProductionRejected = true;
}

if (!invalidProductionRejected) {
  throw new Error("Negative production was accepted");
}

console.log("PASS: Negative production rejected");

// TEST 6 — Fractionele productie

const fractional = calculateCanadianGasRemainingReserves({
  beginningReservesBcf: 100,
  projectedAnnualProductionBcf: [12.5, 17.25],
});

assertClose(
  fractional,
  70.25,
  "Fractional production handled correctly"
);