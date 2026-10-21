import {getCompanyById} from '../../companies';
import {getPhoenixCompanyV2} from '../../phoenix-v2';
import {explainLegacyScore} from '../../score-transparency';
import {adaptPreciousMetalsLegacy} from '../adapters/precious-metals-legacy';
import {createAnalysisProvenance} from '../provenance';
import {advantageClaims} from '../sectors/canadian-natural-gas/advantage-energy-claims';
import {runAdvantageEnergyScenarios} from '../sectors/canadian-natural-gas/advantage-energy-scenario-engine';
import {getAavValidationReview} from '../sectors/canadian-natural-gas/advantage-energy-validation-review';
import type {FinancialDatum,EvidenceDocument} from './evidence';
import {assessResearchPacket,type ResearchPacket} from './contracts';
export const DEMO_SNAPSHOT='git:3b4ba71';
/** Reproducible repository snapshot, not a fresh market-data cutoff. */
export const DEMO_AS_OF='2026-10-21';
export const DEMO_CREATED_AT='2026-10-21T17:16:22Z';
const documents:EvidenceDocument[]=[{id:'aav-q2-2026',title:'Advantage Q2 2026 results',
 uri:'https://www.advantageog.com/investors/newsreleases/article?id=122772',publishedAt:'2026-07-30',origin:'issuer'}];
const historical:FinancialDatum[]=advantageClaims.map(c=>({id:c.metric,value:c.value,unit:c.unit,kind:c.kind==='reported'?'reported':'guidance',verification:c.status==='reviewed'?'reviewed':'unreviewed',period:{start:c.metric==='historicalNetDebt'?c.asOf:'2026-04-01',end:c.asOf},scope:'advantage-pre-wembley',documentId:c.sourceId,locator:c.locator,uncertainties:[c.scope,'Historisch; geen basis na verkoop.']}));
const gasRequirements=[['postSaleGasProduction','MMcf/d'],['postSaleLiquidsProduction','bbl/d'],['postSaleNetDebt','CAD'],['currentFullyDilutedShares','shares'],['postSaleProvedGasReserves','Bcf'],['postSaleTwoPReserves','Bcf']] as const;
export function buildResearchDemonstration(){
 const company=getCompanyById('abrasilver'),phoenix=getPhoenixCompanyV2('abrasilver');
 if(!company||!phoenix)throw new Error('Bestaande Abrasilver-record ontbreekt.');
 const legacy=adaptPreciousMetalsLegacy({company,phoenix,currency:'CAD',dataAsOf:DEMO_AS_OF,sourceSnapshot:DEMO_SNAPSHOT});
 // Recorded creation time of this repository demonstration; no new clock reading per request.
 legacy.provenance=createAnalysisProvenance({modelVersion:legacy.identity.modelVersion,dataAsOf:DEMO_AS_OF,
  sourceSnapshot:DEMO_SNAPSHOT,analysisId:'abrasilver:legacy:3b4ba71',createdAt:DEMO_CREATED_AT});
 const metals:ResearchPacket={model:legacy,methodId:'precious-metals-legacy',documents:[],data:[],
  policy:{asOf:DEMO_AS_OF,rules:[{id:'projectCashFlowModel',unit:'CAD',scope:'abrasilver-project-nav',kinds:['reported','derived']}]},
  sectorBlockers:['Legacy bevat geen geverifieerde projectkasstromen, capex, belasting-/royaltyplanning of actuele aandelen- en schuldbrug.'],
  limitations:['CAD is de expliciete legacy-adaptervaluta, niet een opgehaalde marktkoers.','Geen actuele bedrijfsgetallen toegevoegd. Legacy confidence blijft een interne beoordeling.'],scenarioNames:[]};
 const strict=runAdvantageEnergyScenarios();
 const aav:ResearchPacket={model:{identity:{companyId:'advantage-energy',name:'Advantage Energy Ltd.',ticker:'AAV',currency:'CAD',sector:'natural-gas',businessModel:'producer',modelVersion:'AAV-v1.10-guarded',dataAsOf:DEMO_AS_OF},
  sectorAssessment:{strengths:[],weaknesses:['Financiële invoer na Wembley niet gezamenlijk geverifieerd.']},
  provenance:createAnalysisProvenance({modelVersion:'AAV-v1.10-guarded',dataAsOf:DEMO_AS_OF,sourceSnapshot:DEMO_SNAPSHOT,analysisId:'advantage-energy:guarded:3b4ba71',createdAt:DEMO_CREATED_AT})},
  methodId:'canadian-gas',documents,data:historical,
  policy:{asOf:DEMO_AS_OF,rules:gasRequirements.map(([id,unit])=>({id,unit,scope:'advantage-post-wembley',kinds:['reported'] as const,notBefore:'2026-09-11'}))},
  sectorBlockers:strict.status==='blocked'?strict.errors:['De bestaande motor blijft illustrative-only; geen economische vrijgave.'],
  limitations:['Historische claimwaarden zijn overgenomen uit de bestaande reviewed registry.','Zes gedeelde ontbrekende datapunten zijn geen vervanging voor de 17 AAV-checks.','Geen mapping van Moonshot naar failure of verzonnen scenariokansen.'],scenarioNames:['Bear','Base','Bull','Moonshot']};
 return {asOf:DEMO_AS_OF,snapshot:DEMO_SNAPSHOT,
  companies:[{packet:metals,review:assessResearchPacket(metals),legacyScore:explainLegacyScore(phoenix)},
   {packet:aav,review:assessResearchPacket(aav),legacyScore:null}],aavChecks:getAavValidationReview()};
}
