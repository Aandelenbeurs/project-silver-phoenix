
import assert from "node:assert/strict";

import { advantageEnergyReportedData } from
  "../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-reported-data";

import { evaluateAdvantageEnergyReadiness } from
  "../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-readiness";

const report = evaluateAdvantageEnergyReadiness();

assert.equal(report.companyId, "advantage-energy");
console.log("PASS: company identity");

assert.equal(report.checks.production, true);
console.log("PASS: historical production");

assert.equal(report.checks.historicalDebt, true);
console.log("PASS: historical net debt");

assert.equal(report.checks.historicalShares, true);
console.log("PASS: historical share counts");

assert.equal(report.checks.wembleySale, true);
console.log("PASS: Wembley transaction");

assert.equal(report.checks.reserveCategories, true);
console.log("PASS: historical reserve categories");

assert.equal(report.checks.reserveAdjustment, false);
console.log("PASS: missing reserve adjustment blocked");

assert.equal(report.checks.currentDebt, false);
assert.equal(report.checks.currentDilutedShares, false);
assert.equal(report.checks.currentProduction, false);
console.log("PASS: unverified post-sale data blocked");

assert.equal(report.status, "blocked");
console.log("PASS: valuation remains blocked");

assert.equal(
  advantageEnergyReportedData.corporateEvents[0]
    .divestedReserves.provedMboe,
  27_900
);
console.log("PASS: Wembley 1P reserves retained in Mboe");

assert.ok(report.warnings.length >= 3);
console.log("PASS: valuation warnings generated");

console.log(
  `\n12 checks passed. ` +
  `${report.errors.length} outstanding valuation requirements.`
);
