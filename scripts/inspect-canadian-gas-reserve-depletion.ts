import {
  calculateCanadianGasReserveDepletion,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-depletion";

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

// TEST 1 — Reserves raken geleidelijk op

const depletion = calculateCanadianGasReserveDepletion({
  beginningReservesBcf: 100,
  annualProductionBcf: [30, 30, 30, 30, 30],
});

assertClose(
  depletion[0].endingReservesBcf,
  70,
  "Year 1 ending reserves = 70 Bcf"
);

assertClose(
  depletion[2].endingReservesBcf,
  10,
  "Year 3 ending reserves = 10 Bcf"
);

assertClose(
  depletion[3].actualProductionBcf,
  10,
  "Year 4 production capped at 10 Bcf"
);

assertClose(
  depletion[4].actualProductionBcf,
  0,
  "Year 5 production stops"
);

// TEST 2 — Totale productie mag reserves niet overschrijden

const totalProduction = depletion.reduce(
  (sum, year) => sum + year.actualProductionBcf,
  0
);

assertClose(
  totalProduction,
  100,
  "Total production cannot exceed reserves"
);

// TEST 3 — Geen reserves betekent geen productie

const emptyReserves = calculateCanadianGasReserveDepletion({
  beginningReservesBcf: 0,
  annualProductionBcf: [10, 20],
});

assertClose(
  emptyReserves[0].actualProductionBcf,
  0,
  "Zero reserves prevent production"
);

// TEST 4 — Ongeldige reserves afwijzen

let invalidReservesRejected = false;

try {
  calculateCanadianGasReserveDepletion({
    beginningReservesBcf: -10,
    annualProductionBcf: [5],
  });
} catch {
  invalidReservesRejected = true;
}

if (!invalidReservesRejected) {
  throw new Error("Negative reserves were accepted");
}

console.log("PASS: Negative reserves rejected");

// TEST 5 — Ongeldige productie afwijzen

let invalidProductionRejected = false;

try {
  calculateCanadianGasReserveDepletion({
    beginningReservesBcf: 100,
    annualProductionBcf: [20, -5],
  });
} catch {
  invalidProductionRejected = true;
}

if (!invalidProductionRejected) {
  throw new Error("Negative production was accepted");
}

console.log("PASS: Negative production rejected");