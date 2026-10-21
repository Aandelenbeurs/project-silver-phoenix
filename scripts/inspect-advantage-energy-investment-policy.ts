
import { strict as assert } from 'node:assert';

import {
  compareAavInvestmentPolicies,
} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-policy';

import {
  calculateAavV3,
} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v3';

import {
  runAdvantageEnergyScenarios,
} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';

const policies = [
  'fixed',
  'runoff',
  'maintenance',
  'economic-gate',
  'adaptive-grid',
] as const;

for (const scenario of ['bear', 'base', 'bull', 'moonshot'] as const) {
  const results = compareAavInvestmentPolicies(scenario);

  assert.deepEqual(
    results.map((result) => result.policy),
    policies,
  );

  const old = calculateAavV3().find(
    (result) => result.name === scenario,
  )!;

  // De vaste investeringsstrategie blijft gelijk aan V3.
  assert.ok(
    Math.abs(results[0].enterpriseValueCad - old.enterpriseValueCad) < 0.05,
  );

  for (const result of results) {
    assert.ok(Number.isFinite(result.valuePerShareCad));
    assert.ok(result.remainingBoe >= -0.01);
    assert.ok(result.producedBoe <= 250_000_000 + 0.01);

    assert.ok(
      result.years.every(
        (year) =>
          year.capexCad >= 0 &&
          year.fraction > 0 &&
          year.fraction <= 1 &&
          year.producedBoe >= 0,
      ),
    );

    if (result.policy === 'runoff') {
      assert.ok(
        result.years.every((year) => year.capexCad === 0),
      );
    }

    if (result.policy === 'adaptive-grid') {
      assert.ok(
        result.years.every(
          (year) => Number.isFinite(year.capexCad),
        ),
      );
    }
  }
}

// Een niet-geverifieerde waardering mag niet worden vrijgegeven.
assert.equal(
  runAdvantageEnergyScenarios().status,
  'blocked',
);

console.log(
  'PASS: four scenarios, five policies, V3 parity, reserve cap, policy invariants, strict valuation gate',
);
