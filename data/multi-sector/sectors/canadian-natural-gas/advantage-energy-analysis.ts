import { AAV_ILLUSTRATIVE_SCENARIOS, type ScenarioName } from './advantage-energy-scenario-engine';
import { calculateAavV3 } from './advantage-energy-v3';
import { AAV_REQUIREMENTS, explainAavBlocker } from './advantage-energy-evidence-explainer';

/** Hypothetical one-variable-at-a-time sensitivity; not a validated valuation or forecast. */
export function getAavAnalysis() {
  const scenarios = calculateAavV3();
  const base = scenarios.find(s => s.name === 'base');
  if (!base) throw new Error('Missing base scenario');
  const reference = AAV_ILLUSTRATIVE_SCENARIOS.find(s => s.name === 'base');
  if (!reference) throw new Error('Missing base assumptions');
  const changes = [
    {id:'gas', label:'Gasprijs', unit:'CAD/Mcf', low:reference.gasPriceCadPerMcf - 0.5, high:reference.gasPriceCadPerMcf + 0.5,
      modify:(s:typeof reference, value:number)=>({...s,gasPriceCadPerMcf:value})},
    {id:'capex', label:'Jaarlijkse capex', unit:'mln CAD', low:reference.annualCapexCad/1e6 - 50, high:reference.annualCapexCad/1e6 + 50,
      modify:(s:typeof reference, value:number)=>({...s,annualCapexCad:value*1e6})},
  ];
  const sensitivity = changes.map(change => {
    const evaluate = (value:number) => {
      const adjusted = AAV_ILLUSTRATIVE_SCENARIOS.map(s => s.name === 'base' ? change.modify(s,value) : s);
      const result = calculateAavV3(undefined, adjusted).find(s => s.name === 'base');
      if (!result) throw new Error('Sensitivity result missing');
      return result.modelValuePerShareCad;
    };
    return {id:change.id,label:change.label,unit:change.unit,lowInput:change.low,highInput:change.high,
      lowValueCad:evaluate(change.low),highValueCad:evaluate(change.high),baseValueCad:base.modelValuePerShareCad};
  });
  const groupedBlockers = AAV_REQUIREMENTS.map(r => ({...r, technicalCount:0}));
  return {scenarios, sensitivity, groupedBlockers};
}

export function summarizeTechnicalBlockers(errors:readonly string[]) {
  const counts = new Map<string,number>();
  for(const error of errors) {const text=explainAavBlocker(error);counts.set(text,(counts.get(text)??0)+1);}
  return [...counts].map(([message,count])=>({message,count}));
}

export const SCENARIO_LABELS: Record<ScenarioName,string> = {bear:'Bear',base:'Base',bull:'Bull',moonshot:'Moonshot'};
