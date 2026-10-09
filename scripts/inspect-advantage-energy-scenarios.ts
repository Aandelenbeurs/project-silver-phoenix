import assert from "node:assert/strict";
import {AAV_ILLUSTRATIVE_SCENARIOS,calculateIllustrativeAavScenario,runAdvantageEnergyScenarios} from "../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine";

const blocked=runAdvantageEnergyScenarios();
assert.equal(blocked.status,"blocked");
assert.deepEqual(blocked.results,[]);
assert.ok(blocked.errors.length>0);
console.log("PASS: default valuation blocked; no misleading prices");

const actual={gasMmcfPerDay:100,liquidsBblPerDay:1000,netDebtCad:10_000_000,fullyDilutedShares:100_000_000};
const one=calculateIllustrativeAavScenario({...AAV_ILLUSTRATIVE_SCENARIOS[1],forecastYears:1,annualDeclineRate:0,discountRate:0.1,annualCapexCad:0,operatingCostCadPerMcfe:0,transportationCostCadPerMcfe:0},actual);
const expectedRevenue=100*1000*365*3+1000*365*80;
assert.equal(one.projections[0].revenueCad,expectedRevenue);
assert.ok(Math.abs(one.illustrativeEnterpriseValueCad-expectedRevenue/1.1)<0.00001);
assert.ok(Math.abs(one.illustrativePerShareCad-(expectedRevenue/1.1-actual.netDebtCad)/actual.fullyDilutedShares)<1e-10);
console.log("PASS: gas/liquids units, discounting, debt and shares");

const five=calculateIllustrativeAavScenario(AAV_ILLUSTRATIVE_SCENARIOS[1],actual);
assert.equal(five.projections.length,5);
assert.ok(five.projections[1].gasMmcfPerDay<five.projections[0].gasMmcfPerDay);
assert.ok(five.caveat.includes("not fair value"));
console.log("PASS: multi-year decline and caveat");

assert.throws(()=>calculateIllustrativeAavScenario({...AAV_ILLUSTRATIVE_SCENARIOS[0],annualDeclineRate:1.1},actual));
assert.throws(()=>calculateIllustrativeAavScenario({...AAV_ILLUSTRATIVE_SCENARIOS[0],forecastYears:0},actual));
assert.throws(()=>calculateIllustrativeAavScenario(AAV_ILLUSTRATIVE_SCENARIOS[0],{...actual,fullyDilutedShares:0}));
console.log("PASS: invalid economic inputs rejected");

const broken=runAdvantageEnergyScenarios(undefined,[AAV_ILLUSTRATIVE_SCENARIOS[0]]);
assert.equal(broken.status,"blocked");
console.log("PASS: blocked remains blocked with invalid scenario collection");
console.log("Scenario engine tests passed.");
