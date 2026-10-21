import { assertAavInvestmentAssumptions } from './advantage-energy-assumption-validation';
import { AAV_RESEARCH_INPUTS } from './advantage-energy-research-valuation';
import { AAV_V2_HYPOTHETICAL, type V2Assumptions } from './advantage-energy-v2';
import { AAV_ILLUSTRATIVE_SCENARIOS, type ScenarioAssumptions, type ScenarioName } from './advantage-energy-scenario-engine';

/** One-time first-year investment followed by no further investment, compared with pure runoff.
 * All outcomes are hypothetical, pre-tax, with the same production and reserve conventions as the policy engine.
 * The full-horizon case stops at the forecast horizon; it does NOT assert an infinite economic well life.
 */
export interface MarginalYear {
 year:number; baselineProductionBoe:number; investmentProductionBoe:number;
 incrementalProductionBoe:number; incrementalRevenueAfterOperatingCostsCad:number;
 incrementalCapexCad:number; incrementalCashFlowCad:number; discountedIncrementalCashFlowCad:number;
}
export interface MarginalInvestmentRow {
 firstYearCapexCad:number; actualFirstYearCapexCad:number;
 incrementalProductionBoe:number; fiveYearNpvCad:number; fullHorizonNpvCad:number;
 horizonDifferenceCad:number; years:MarginalYear[];
}
export interface MarginalInvestmentDiagnostic {
 scenario:ScenarioName; horizonYears:number; fiveYearWindow:number;
 rows:MarginalInvestmentRow[]; warning:string;
}
const EPS=1e-8;
function marginPerBoe(s:ScenarioAssumptions):number {
 const gas=AAV_RESEARCH_INPUTS.gasEnergyShare;
 const revenue=gas*6*s.gasPriceCadPerMcf+(1-gas)*s.liquidsPriceCadPerBbl;
 return revenue*(1-AAV_RESEARCH_INPUTS.royaltyRate)
  -6*(s.operatingCostCadPerMcfe+s.transportationCostCadPerMcfe)
  -AAV_RESEARCH_INPUTS.gaCadPerBoe;
}
function yearStep(rate:number,remaining:number,capexAnnual:number,a:V2Assumptions){
 if(remaining<=EPS)return {produced:0,endRate:rate,capex:0,remaining:0};
 const delta=-rate*a.naturalDeclineRate+capexAnnual/a.developmentCadPerFlowingBoeDay;
 const volume=(f:number)=>a.annualDays*(rate*f+delta*f*f/2);
 if(volume(1)<=0)throw new Error('Nonpositive modeled production');
 let fraction=1;
 if(volume(1)>remaining){let lo=0,hi=1;for(let i=0;i<65;i++){const mid=(lo+hi)/2;if(volume(mid)<remaining)lo=mid;else hi=mid;}fraction=(lo+hi)/2;}
 const produced=Math.min(remaining,volume(fraction));
 return {produced,endRate:rate+delta*fraction,capex:capexAnnual*fraction,remaining:Math.max(0,remaining-produced)};
}
function simulate(s:ScenarioAssumptions,a:V2Assumptions,initialCapexCad:number){
 let rate: number=AAV_RESEARCH_INPUTS.productionBoePerDay,remaining=a.recoverableBudgetBoe;
 const years:{production:number;capex:number}[]=[];
 for(let i=0;i<a.forecastYears;i++){
  if(remaining<=EPS){years.push({production:0,capex:0});continue;}
  const step=yearStep(rate,remaining,i===0?initialCapexCad:0,a);
  years.push({production:step.produced,capex:step.capex});
  rate=step.endRate;remaining=step.remaining;
 }
 return years;
}
export function diagnoseAavMarginalInvestment(
 scenario:ScenarioName='base',
 a:V2Assumptions=AAV_V2_HYPOTHETICAL,
 capexOptionsCad:readonly number[]=[0,50e6,100e6,200e6,350e6],
):MarginalInvestmentDiagnostic {
 const s=AAV_ILLUSTRATIVE_SCENARIOS.find(x=>x.name===scenario);
 if(!s)throw new Error('Unknown scenario');
 assertAavInvestmentAssumptions(a);
 if(capexOptionsCad.some(x=>!Number.isFinite(x)||x<0))throw new Error('Invalid capex');
 const baseline=simulate(s,a,0),margin=marginPerBoe(s),fiveYearWindow=Math.min(5,a.forecastYears);
 const rows=capexOptionsCad.map(capex=>{
  const invested=simulate(s,a,capex);
  let fiveYearNpvCad=0,fullHorizonNpvCad=0,incrementalProductionBoe=0;
  const years=baseline.map((b,i)=>{
   const inv=invested[i];const incrementalProductionBoe=inv.production-b.production;
   const incrementalCapexCad=inv.capex-b.capex;
   const incrementalRevenueAfterOperatingCostsCad=incrementalProductionBoe*margin;
   const incrementalCashFlowCad=incrementalRevenueAfterOperatingCostsCad-incrementalCapexCad;
   const discountedIncrementalCashFlowCad=incrementalCashFlowCad/Math.pow(1+s.discountRate,i+1);
   fullHorizonNpvCad+=discountedIncrementalCashFlowCad;
   if(i<fiveYearWindow)fiveYearNpvCad+=discountedIncrementalCashFlowCad;
   return {year:i+1,baselineProductionBoe:b.production,investmentProductionBoe:inv.production,
    incrementalProductionBoe,incrementalRevenueAfterOperatingCostsCad,incrementalCapexCad,
    incrementalCashFlowCad,discountedIncrementalCashFlowCad};
  });
  incrementalProductionBoe=years.reduce((sum,y)=>sum+y.incrementalProductionBoe,0);
  return {firstYearCapexCad:capex,actualFirstYearCapexCad:invested[0].capex,
   incrementalProductionBoe,fiveYearNpvCad,fullHorizonNpvCad,
   horizonDifferenceCad:fullHorizonNpvCad-fiveYearNpvCad,years};
 });
 return {scenario,horizonYears:a.forecastYears,fiveYearWindow,rows,
  warning:'Eenmalige capex in jaar 1, daarna nul capex in beide paden. Vijfjaarstoets kapt latere opbrengsten af; volledige toets eindigt bij de modelhorizon. Geen belastingen, hedges, terminal value of afzonderlijke puttenplanning.'};
}
