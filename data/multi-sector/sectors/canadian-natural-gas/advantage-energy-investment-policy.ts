import { assertAavInvestmentAssumptions } from './advantage-energy-assumption-validation';
import { AAV_RESEARCH_INPUTS } from './advantage-energy-research-valuation';
import { AAV_V2_HYPOTHETICAL, type V2Assumptions } from './advantage-energy-v2';
import { AAV_ILLUSTRATIVE_SCENARIOS, type ScenarioAssumptions, type ScenarioName } from './advantage-energy-scenario-engine';
import { calculateAavV3 } from './advantage-energy-v3';

/** Research-only capital-allocation policy experiment. No claim of optimal AAV corporate behavior. */
export type InvestmentPolicy = 'fixed' | 'runoff' | 'maintenance' | 'economic-gate' | 'adaptive-grid';
export interface PolicyYear { year:number; fraction:number; startRateBoeDay:number; endRateBoeDay:number; producedBoe:number; capexCad:number; preTaxCashFlowCad:number; discountedCashFlowCad:number; remainingBoe:number; decision:string; }
export interface PolicyResult { scenario:ScenarioName; policy:InvestmentPolicy; enterpriseValueCad:number; equityValueCad:number; valuePerShareCad:number; producedBoe:number; remainingBoe:number; years:PolicyYear[]; }
const EPS=1e-7;
function unitMargin(s:ScenarioAssumptions):number {
 const gas=AAV_RESEARCH_INPUTS.gasEnergyShare;
 const revenue=gas*6*s.gasPriceCadPerMcf+(1-gas)*s.liquidsPriceCadPerBbl;
 return revenue*(1-AAV_RESEARCH_INPUTS.royaltyRate)-6*(s.operatingCostCadPerMcfe+s.transportationCostCadPerMcfe)-AAV_RESEARCH_INPUTS.gaCadPerBoe;
}
function simulateYear(rate:number, remaining:number, capexAnnual:number, a:V2Assumptions) {
 const delta=-rate*a.naturalDeclineRate+capexAnnual/a.developmentCadPerFlowingBoeDay;
 const volume=(f:number)=>a.annualDays*(rate*f+delta*f*f/2);
 if (!(volume(1)>0)) throw new Error('Invalid policy production');
 let fraction=1;
 if(volume(1)>remaining){let lo=0,hi=1;for(let i=0;i<65;i++){const mid=(lo+hi)/2;if(volume(mid)<remaining)lo=mid;else hi=mid;}fraction=(lo+hi)/2;}
 return {fraction,produced:Math.min(remaining,volume(fraction)),endRate:rate+delta*fraction,capex:capexAnnual*fraction};
}
function evaluate(s:ScenarioAssumptions,policy:InvestmentPolicy,a:V2Assumptions):PolicyResult {
 let rate:number=AAV_RESEARCH_INPUTS.productionBoePerDay,remaining=a.recoverableBudgetBoe,ev=0;
 const margin=unitMargin(s),years:PolicyYear[]=[];
 for(let year=1;year<=a.forecastYears && remaining>EPS;year++){
  const maintain=rate*a.naturalDeclineRate*a.developmentCadPerFlowingBoeDay;
  const options=[0,Math.min(maintain,s.annualCapexCad),s.annualCapexCad];
  let capex=s.annualCapexCad,decision='Vaste jaarlijkse capex';
  if(policy==='runoff'){capex=0;decision='Geen nieuwe ontwikkeling';}
  if(policy==='maintenance'){capex=options[1];decision='Onderhoud tot capexplafond';}
  if(policy==='economic-gate'){
   // Compare each incremental capital option against no-investment runoff over a
   // five-year illustrative horizon, including decline and reserve depletion.
   // This is a transparent *heuristic*, not a global dynamic optimum.
   const horizon=Math.min(5,a.forecastYears-year+1);
   const rollout=(firstCapex:number)=>{
    let r=rate,res=remaining,pv=0;
    for(let k=0;k<horizon && res>EPS;k++){
     const step=simulateYear(r,res,k===0?firstCapex:0,a);
     pv+=(step.produced*margin-step.capex)/Math.pow(1+s.discountRate,k+1);
     res=Math.max(0,res-step.produced);r=step.endRate;
    }
    return pv;
   };
   const choices=[...new Set(options)];
   const ranked=choices.map(c=>({c,v:rollout(c)})).sort((x,y)=>y.v-x.v);
   capex=ranked[0].c;
   decision=capex===0?'Geen nieuwe investering (5-jaars toets)':capex===options[1]?'Beperkt onderhoud (5-jaars toets)':'Capexplafond (5-jaars toets)';
  }
  if(policy==='adaptive-grid'){
   // Five-year receding-horizon *constant-budget* candidate comparison.
   // Every candidate is maintained throughout the lookahead; unlike the
   // economic gate, this does not assume all later capex is zero.
   // It is still a heuristic, NOT a globally optimal investment policy.
   const horizon=Math.min(5,a.forecastYears-year+1);
   const choices=[...new Set([0,.25,.5,.75,1].map(f=>s.annualCapexCad*f).concat(Math.min(maintain,s.annualCapexCad)))];
   const forecast=(annualCapex:number)=>{
    let r=rate,res=remaining,pv=0;
    for(let k=0;k<horizon && res>EPS;k++){
     const step=simulateYear(r,res,annualCapex,a);
     pv+=(step.produced*margin-step.capex)/Math.pow(1+s.discountRate,k+1);
     r=step.endRate;res=Math.max(0,res-step.produced);
    }
    return pv;
   };
   const ranked=choices.map(c=>({c,pv:forecast(c)})).sort((x,y)=>y.pv-x.pv||x.c-y.c);
   capex=ranked[0].c;
   decision=`Adaptieve capex ${Math.round(100*capex/s.annualCapexCad)}% plafond (5-jaars constante-budgettoets)`;
  }
  const step=simulateYear(rate,remaining,capex,a);
  const cash=step.produced*margin-step.capex;
  const discounted=cash/Math.pow(1+s.discountRate,year);
  ev+=discounted;remaining=Math.max(0,remaining-step.produced);
  years.push({year,fraction:step.fraction,startRateBoeDay:rate,endRateBoeDay:step.endRate,producedBoe:step.produced,capexCad:step.capex,preTaxCashFlowCad:cash,discountedCashFlowCad:discounted,remainingBoe:remaining,decision});
  rate=step.endRate;
 }
 const equity=ev-AAV_RESEARCH_INPUTS.netDebtCad;
 return {scenario:s.name,policy,enterpriseValueCad:ev,equityValueCad:equity,valuePerShareCad:equity/AAV_RESEARCH_INPUTS.shareCountProxy,producedBoe:a.recoverableBudgetBoe-remaining,remainingBoe:remaining,years};
}
export function compareAavInvestmentPolicies(name:ScenarioName='base',a:V2Assumptions=AAV_V2_HYPOTHETICAL):PolicyResult[]{
 const s=AAV_ILLUSTRATIVE_SCENARIOS.find(x=>x.name===name);
 if(!s)throw new Error('Unknown scenario');
 assertAavInvestmentAssumptions(a);
 const results=(['fixed','runoff','maintenance','economic-gate','adaptive-grid'] as const).map(p=>evaluate(s,p,a));
 // Same assumptions and cash flow conventions as V3 for the fixed strategy.
 const original=calculateAavV3(a).find(x=>x.name===name)!;
 if(Math.abs(original.enterpriseValueCad-results[0].enterpriseValueCad)>0.05)throw new Error('Fixed policy deviates from V3');
 return results;
}
