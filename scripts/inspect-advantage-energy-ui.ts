import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AdvantageEnergyValuationPage from "../app/valuation/advantage-energy/page";
import { runAdvantageEnergyScenarios } from "../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine";

const result = runAdvantageEnergyScenarios();
assert.equal(result.status, "blocked");
assert.equal(result.results.length, 0);
const html = renderToStaticMarkup(React.createElement(AdvantageEnergyValuationPage));
for (const text of ["Advantage Energy", "Geblokkeerd", "Bear", "Base", "Bull", "Moonshot", "Openstaande vereisten"]) {
  assert.ok(html.includes(text), `Missing UI text: ${text}`);
}
assert.ok(html.includes("Wacht op geverifieerde invoer"));
assert.ok(!html.includes("Illustratieve waarde per aandeel"));
console.log("PASS: AAV route renders four blocked scenarios without fabricated share prices");
