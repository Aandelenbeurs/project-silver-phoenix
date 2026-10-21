import { calculateAavInvestmentThresholds } from './advantage-energy-investment-threshold';
import type { ScenarioName } from './advantage-energy-scenario-engine';

/** Illustrative independent year-1 project tranches, NOT identified Advantage Energy wells. */
export const AAV_HYPOTHETICAL_PROJECTS = [
  { id: 'tier-a', label: 'A — beste locaties', capexCad: 50e6, efficiency: 2.0 },
  { id: 'tier-b', label: 'B — sterke locaties', capexCad: 50e6, efficiency: 1.5 },
  { id: 'tier-c', label: 'C — gemiddelde locaties', capexCad: 100e6, efficiency: 1.25 },
  { id: 'tier-d', label: 'D — marginale locaties', capexCad: 100e6, efficiency: 1.0 },
  { id: 'tier-e', label: 'E — zwakke locaties', capexCad: 50e6, efficiency: 0.75 },
] as const;

export interface ProjectDecision {
  id: string;
  label: string;
  capexCad: number;
  efficiency: number;
  breakEvenGasPriceCadPerMcf: number | null;
  incrementalNpvCad: number;
  accepted: boolean;
  cumulativeSelectedCapexCad: number;
  cumulativeSelectedNpvCad: number;
}
export interface ProjectInvestmentReport {
  scenario: ScenarioName;
  gasPriceCadPerMcf: number;
  projects: ProjectDecision[];
  selectedCapexCad: number;
  selectedNpvCad: number;
  rejectedCapexCad: number;
  caveat: string;
}

/**
 * Selects positive standalone-NPV tranches. Tranches are modeled independently
 * against the zero-capex baseline, so their NPVs are additive only as an
 * approximation. This is NOT a reserve-constrained joint portfolio optimizer.
 */
export function evaluateAavProjectInvestments(
  scenario: ScenarioName = 'base',
  projects: readonly { id: string; label: string; capexCad: number; efficiency: number }[] = AAV_HYPOTHETICAL_PROJECTS,
): ProjectInvestmentReport {
  if (new Set(projects.map(p => p.id)).size !== projects.length || projects.some(p => !p.id || !p.label || !Number.isFinite(p.capexCad) || p.capexCad <= 0 || !Number.isFinite(p.efficiency) || p.efficiency <= 0)) {
    throw new Error('Invalid or duplicate project inputs');
  }
  const efficiencies = [...new Set(projects.map(p => p.efficiency))];
  const capexLevels = [...new Set(projects.map(p => p.capexCad))];
  const threshold = calculateAavInvestmentThresholds(scenario, efficiencies, capexLevels);
  const candidates = projects.map(p => {
    const cell = threshold.cells.find(c => c.efficiencyMultiplier === p.efficiency && c.capexCad === p.capexCad);
    if (!cell) throw new Error(`Missing project calculation: ${p.id}`);
    return { ...p, incrementalNpvCad: cell.npvAtBaseGasCad, breakEvenGasPriceCadPerMcf: cell.breakEvenGasPriceCadPerMcf };
  });
  // Ranking by NPV per invested CAD (capital efficiency), stable tie-break by id.
  candidates.sort((a, b) => (b.incrementalNpvCad / b.capexCad) - (a.incrementalNpvCad / a.capexCad) || a.id.localeCompare(b.id));
  let selectedCapexCad = 0;
  let selectedNpvCad = 0;
  let rejectedCapexCad = 0;
  const decisions: ProjectDecision[] = candidates.map(p => {
    const accepted = p.incrementalNpvCad > 0;
    if (accepted) { selectedCapexCad += p.capexCad; selectedNpvCad += p.incrementalNpvCad; }
    else rejectedCapexCad += p.capexCad;
    return { ...p, accepted, cumulativeSelectedCapexCad: selectedCapexCad, cumulativeSelectedNpvCad: selectedNpvCad };
  });
  return {
    scenario, gasPriceCadPerMcf: threshold.referenceGasPriceCadPerMcf,
    projects: decisions, selectedCapexCad, selectedNpvCad, rejectedCapexCad,
    caveat: 'Alle projecten zijn fictieve onafhankelijke tranches met eenmalige capex in jaar 1. De opgetelde NPV is een indicatieve som van standalone-projecten, NIET een gezamenlijke simulatie: gedeelde reserves, capaciteitslimieten, financiering, timing, belastingen en put-specifieke risico’s zijn niet gezamenlijk doorgerekend. Geen koersdoel of beleggingsadvies.',
  };
}
