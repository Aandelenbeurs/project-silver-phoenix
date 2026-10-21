import {phoenixCompaniesV2} from '../data/phoenix-v2';
import {buildPhoenixScenarioRanking} from '../data/scenario-upside';
import {calculatePortfolioV2} from '../data/portfolio-v2';
import {optimizeNewMoneyV2} from '../data/optimizer-v2';
import {simulateRotation} from '../data/rotation-engine';
import {calculateAavV2} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v2';
import {calculateAavV3} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-v3';
import {compareAavInvestmentPolicies} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-policy';
export function collectEngineFixture(){
 const cases=[{silverPriceUsd:30,goldPriceUsd:2500},{silverPriceUsd:60,goldPriceUsd:4000},{silverPriceUsd:300,goldPriceUsd:7000}];
 const ids=['abrasilver','vista-gold','discovery-silver','contango','first-majestic'];
 const positions=ids.map((companyId,i)=>({companyId,marketValueEur:(i+1)*1000}));
 const rankings=cases.map(livePrices=>buildPhoenixScenarioRanking({livePrices}));
 return {notice:'Synthetic fixtures; metal prices are test constants, not market quotes.',scores:phoenixCompaniesV2,rankings,
  portfolio:calculatePortfolioV2(positions),optimizers:[0,1000,5000].map(newMoneyEur=>optimizeNewMoneyV2({positions,
   candidateCompanyIds:phoenixCompaniesV2.map(x=>x.companyId),newMoneyEur,liveMetalPrices:cases[0]})),
  rotation:simulateRotation({positions,investmentScores:new Map(rankings[0].map(x=>[x.companyId,x.investmentScore??0])),liveMetalPrices:cases[0]}),
  aav:{v2:calculateAavV2(),v3:calculateAavV3(),policies:compareAavInvestmentPolicies()}};
}
