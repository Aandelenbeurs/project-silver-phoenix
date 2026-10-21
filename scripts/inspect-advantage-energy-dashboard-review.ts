import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Page from '../app/valuation/advantage-energy/page';
import { AAV_COMPANY_FACTS, AAV_COMPANY_SOURCES } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-company-review';
import { compareAavInvestmentPolicies } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-policy';
import { diagnoseAavMarginalInvestment } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-marginal-investment';
import { calculateAavInvestmentThresholds } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-threshold';
import { AAV_V2_HYPOTHETICAL } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v2';
import { runAdvantageEnergyScenarios } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';
for (const key of Object.keys(AAV_V2_HYPOTHETICAL)) {
  for (const bad of [NaN, Infinity, -Infinity]) {
    const a = {...AAV_V2_HYPOTHETICAL, [key]:bad};
    assert.throws(()=>compareAavInvestmentPolicies('base',a));
    assert.throws(()=>diagnoseAavMarginalInvestment('base',a));
    assert.throws(()=>calculateAavInvestmentThresholds('base',[1],[50e6],a));
  }
}
assert.throws(()=>diagnoseAavMarginalInvestment('base',{...AAV_V2_HYPOTHETICAL,annualDays:367}));
assert.equal(runAdvantageEnergyScenarios().status,'blocked');
assert.deepEqual(runAdvantageEnergyScenarios().results,[]);
for (const f of AAV_COMPANY_FACTS) assert.ok(AAV_COMPANY_SOURCES[f.source].startsWith('https://www.advantageog.com/'));
assert.equal(AAV_COMPANY_FACTS.find(f=>f.label==='Verwachte schuld begin Q4')?.kind,'guidance');
const html=renderToStaticMarkup(React.createElement(Page));
for (const target of ['Beleggersoverzicht','Managementverwachting','Convertibles','investment-threshold','project-investments','/engine','Wacht op geverifieerde invoer']) assert.ok(html.includes(target),target);
assert.ok(html.indexOf('Beleggersoverzicht') < html.indexOf('Research Valuation'));
console.log('PASS: nonfinite rejection, provenance, guidance separation, dashboard navigation and strict gate');
