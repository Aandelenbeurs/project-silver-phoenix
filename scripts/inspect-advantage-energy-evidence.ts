
import assert from "node:assert/strict";

import {
  validateAdvantageEvidence,
} from "../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-evidence";

import type {
  AdvantageSource,
} from "../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-sources";

const testRegistry: AdvantageSource[] = [
  {
    sourceId: "synthetic-q3-report",
    title: "Synthetic Q3 test report",
    url: "https://example.com/test",
    publishedAt: "2026-10-01",
    kind: "financial-report",
    coversActualsThrough: "2026-09-30",
    guidanceAllowed: false,
  },
];

const reported = {
  value: 250_000_000,
  kind: "reported" as const,
  asOf: "2026-09-30",
  sourceId: "synthetic-q3-report",
};

const validate = (
  evidence: typeof reported
) =>
  validateAdvantageEvidence(evidence, {
    actualOnly: true,
    afterDate: "2026-09-11",
    registry: testRegistry,
  });

assert.equal(validate(reported).valid, true);
console.log("PASS: reporting date before publication accepted");

const laterPublication = testRegistry.map((source) => ({
  ...source,
  publishedAt: "2026-09-30",
}));

assert.equal(
  validateAdvantageEvidence(reported, {
    actualOnly: true,
    afterDate: "2026-09-11",
    registry: laterPublication,
  }).valid,
  true
);
console.log("PASS: valid source metadata accepted");

assert.equal(
  validateAdvantageEvidence(
    { ...reported, sourceId: "unknown" },
    { registry: laterPublication }
  ).valid,
  false
);
console.log("PASS: unknown source rejected");

assert.equal(
  validateAdvantageEvidence(
    { ...reported, kind: "guidance" },
    {
      actualOnly: true,
      registry: laterPublication,
    }
  ).valid,
  false
);
console.log("PASS: guidance rejected as actual");

assert.equal(
  validateAdvantageEvidence(
    { ...reported, asOf: "2026-09-10" },
    {
      afterDate: "2026-09-11",
      registry: laterPublication,
    }
  ).valid,
  false
);
console.log("PASS: pre-sale date rejected");

assert.equal(
  validateAdvantageEvidence(
    { ...reported, value: Number.NaN },
    { registry: laterPublication }
  ).valid,
  false
);
console.log("PASS: invalid number rejected");

console.log("\nEvidence validation tests passed.");
