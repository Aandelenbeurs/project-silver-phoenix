import {phoenixCompaniesV2} from './phoenix-v2';
import {getCompanyById} from './companies';
import type {buildPhoenixScenarioRanking} from './scenario-upside';
/** Extracted from /ranking. Identical fallback, sort and tie behavior; linear lookup. */
export function buildRankingView(scenarios:ReturnType<typeof buildPhoenixScenarioRanking>){
 const byId=new Map<string,ReturnType<typeof buildPhoenixScenarioRanking>[number]>();
 for(const scenario of scenarios)if(!byId.has(scenario.companyId))byId.set(scenario.companyId,scenario);
 return phoenixCompaniesV2.map(phoenix=>{
  const scenario=byId.get(phoenix.companyId);
  return {...phoenix,company:getCompanyById(phoenix.companyId),scenarioUpside:scenario?.scenarioUpside??null,
   investmentScore:scenario?.investmentScore??phoenix.scores.opportunity};
 }).sort((a,b)=>(b.investmentScore??-1)-(a.investmentScore??-1));
}
