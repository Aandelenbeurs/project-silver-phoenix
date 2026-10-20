import { compareAavInvestmentPolicies, type InvestmentPolicy, type PolicyResult } from './advantage-energy-investment-policy';
import type { ScenarioName } from './advantage-energy-scenario-engine';

/** Descriptive comparisons of hypothetical policy outputs; no optimization claim. */
export interface PolicyComparisonRow {
 scenario: ScenarioName;
 policy: InvestmentPolicy;
 equityPerShareCad: number;
 enterpriseValueCad: number;
 cumulativePreTaxCashFlowCad: number;
 totalCapexCad: number;
 producedBoe: number;
 endingProductionBoeDay: number;
 discountedCashFlowPerCapex: number | null;
 incrementalEquityPerShareVsFixedCad: number;
 positiveCashFlowYears: number;
}
export interface PolicyScenarioComparison {
 scenario: ScenarioName;
 rows: PolicyComparisonRow[];
 highestModeledEquityPolicy: InvestmentPolicy;
}
export const POLICY_LABELS: Record<InvestmentPolicy,string> = {
 fixed:'Vast investeringsbudget',
 runoff:'Gecontroleerd afbouwen',
 maintenance:'Onderhoud binnen budget',
 'economic-gate':'Economische investeringspoort',
};
function summarize(result:PolicyResult, fixed:PolicyResult):PolicyComparisonRow {
 const totalCapexCad=result.years.reduce((sum,y)=>sum+y.capexCad,0);
 const cumulativePreTaxCashFlowCad=result.years.reduce((sum,y)=>sum+y.preTaxCashFlowCad,0);
 const last=result.years.at(-1);
 return {
  scenario:result.scenario,policy:result.policy,equityPerShareCad:result.valuePerShareCad,
  enterpriseValueCad:result.enterpriseValueCad,cumulativePreTaxCashFlowCad,totalCapexCad,
  producedBoe:result.producedBoe,endingProductionBoeDay:last?.endRateBoeDay??0,
  // Not a return on invested capital: cash flow includes the deduction of capex.
  discountedCashFlowPerCapex:totalCapexCad>0?result.enterpriseValueCad/totalCapexCad:null,
  incrementalEquityPerShareVsFixedCad:result.valuePerShareCad-fixed.valuePerShareCad,
  positiveCashFlowYears:result.years.filter(y=>y.preTaxCashFlowCad>0).length,
 };
}
export function getAavPolicyComparison():PolicyScenarioComparison[]{
 return (['bear','base','bull','moonshot'] as const).map(scenario=>{
  const results=compareAavInvestmentPolicies(scenario);
  const fixed=results.find(x=>x.policy==='fixed');
  if(!fixed)throw new Error('Missing fixed policy baseline');
  const rows=results.map(x=>summarize(x,fixed));
  for(const row of rows){
   if(!Number.isFinite(row.cumulativePreTaxCashFlowCad)||!Number.isFinite(row.totalCapexCad)||!Number.isFinite(row.endingProductionBoeDay))throw new Error('Invalid comparison metrics');
  }
  const highest=[...rows].sort((a,b)=>b.equityPerShareCad-a.equityPerShareCad)[0];
  return {scenario,rows,highestModeledEquityPolicy:highest.policy};
 });
}
