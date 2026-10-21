import { strict as assert } from 'node:assert';
import { evaluateAavProjectInvestments, AAV_HYPOTHETICAL_PROJECTS } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-project-investments';
import { calculateAavInvestmentThresholds } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-threshold';
import { runAdvantageEnergyScenarios } from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine';

for (const scenario of ['bear', 'base', 'bull', 'moonshot'] as const) {
  const report = evaluateAavProjectInvestments(scenario);
  assert.equal(report.projects.length, 5);
  assert.equal(report.projects.reduce((s, p) => s + p.capexCad, 0), 350e6);
  assert.ok(report.projects.every(p => Number.isFinite(p.incrementalNpvCad)));
  assert.ok(report.projects.every(p => p.accepted === (p.incrementalNpvCad > 0)));
  assert.ok(report.projects.every((p, i, arr) => i === 0 || arr[i-1].incrementalNpvCad / arr[i-1].capexCad >= p.incrementalNpvCad / p.capexCad - 1e-12));
  assert.ok(Math.abs(report.selectedNpvCad - report.projects.filter(p => p.accepted).reduce((s, p) => s + p.incrementalNpvCad, 0)) < 0.01);
  const reference = calculateAavInvestmentThresholds(scenario, [2], [50e6]);
  const a = report.projects.find(p => p.id === 'tier-a')!;
  assert.ok(Math.abs(a.incrementalNpvCad - reference.cells[0].npvAtBaseGasCad) < 0.01);
}
assert.equal(AAV_HYPOTHETICAL_PROJECTS.length, 5);
assert.throws(() => evaluateAavProjectInvestments('base', [{ id: 'x', label: 'X', capexCad: 1, efficiency: 1 }, { id: 'x', label: 'Y', capexCad: 2, efficiency: 1 }]));
assert.equal(runAdvantageEnergyScenarios().status, 'blocked');
console.log('PASS: four scenarios, five hypothetical projects, ranking, NPV parity, selection and strict valuation gate');
