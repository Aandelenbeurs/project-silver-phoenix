/** Adapter only: existing engine gates remain the sole authority. No engine input writes. */
import {buildFinancialDossiers} from '../financial-dossiers';
import {BRIDGE_FIELDS} from '../equity-bridge';
import {getAavValidationReview} from '../../sectors/canadian-natural-gas/advantage-energy-validation-review';
import type {IntelligenceState} from './contracts';
import type {WorkflowStatus} from './workflow-status';
const relations:Record<string,string[]>={identity:[],production:['gasProduction','liquidsProduction','totalProduction'],historicalDebt:['netDebt'],historicalShares:['basicWeightedShares','dilutedWeightedShares'],wembleySale:[],reserveCategories:[],reserveAdjustment:[],currentDebt:['netDebt','bankDebt','cash'],currentDilutedShares:['shares'],currentProduction:['gasProduction','liquidsProduction'],forwardEconomicAssumptions:['netCapex','opex'],
 'claim:postSaleGasProduction':['gasProduction'],'claim:postSaleLiquidsProduction':['liquidsProduction'],'claim:postSaleNetDebt':['netDebt'],'claim:currentFullyDilutedShares':['shares'],'claim:postSaleProvedGasReserves':['provedGasReserves'],'claim:postSaleTwoPReserves':['twoPGasReserves']};
const bridgeLabels:Record<string,string>={operatingValue:'Operationele assetwaarde na belasting',ownership:'Economisch eigendomsbelang',nonOperatingAssets:'Niet-operationele activa',cash:'Kaspositie',debt:'Schuldpositie',corporateCostPV:'Contante waarde bedrijfskosten',otherObligations:'Overige verplichtingen',thirdPartyInterests:'Belangen van derden',dilutedShares:'Verwaterde aandelennoemer',convertiblePrincipal:'Conversiehoofdsom',convertibleShares:'Conversieaandelen'};
const labels:Record<string,string>={identity:'Bedrijfsidentiteit en CAD-basis',production:'Historische productmix',historicalDebt:'Historische schuld',historicalShares:'Historische EPS-aandelen',wembleySale:'Wembley-transactiegegevens',reserveCategories:'Historische reservecategorieën'};
export function modelReadinessView(state:IntelligenceState,statuses:WorkflowStatus[]){
 const aav=getAavValidationReview(),dossiers=buildFinancialDossiers(),by=new Map(statuses.map(s=>[s.candidateId,s]));
 const research=(company:string,metrics:string[],current:boolean)=>{
  const related=state.candidates.filter(c=>c.companyId===company&&metrics.includes(c.metric));
  const considered=related.filter(c=>!current||c.datum.period.end>='2026-09-11');
  return {candidateIds:considered.map(c=>c.id),sourceVerified:considered.filter(c=>by.get(c.id)?.source==='green').length,humanApproved:considered.filter(c=>state.decisions.some(d=>d.candidateId===c.id&&d.action==='approve')).length,historicalExcluded:related.length-considered.length,
   modelValidated:false as const,note:'Gerelateerde onderzoekskandidaten; geen bewijs van geschikte modeleendheid, scope, peildatum of enginevalidatie.'};
 };
 return [
  {companyId:'advantage-energy',label:'Advantage Energy',status:aav.readiness.status,passed:aav.passed,total:aav.total,valuationReleased:false as const,
   reasons:aav.readiness.errors,fields:Object.entries(aav.readiness.checks).map(([id,passed])=>{
    const open=aav.open.find(r=>r.key===id),current=!['identity','production','historicalDebt','historicalShares','wembleySale','reserveCategories'].includes(id);
    return {id,label:open?.label??labels[id]??id,engineCheckPassed:passed,needed:open?.needed??'Bestaande enginecheck; dit is geen nieuwe Intelligence-modelvalidatie.',basis:current?'Actuele / post-Wembley aansluiting vereist':'Bestaande historische of structurele enginecheck',research:research('advantage-energy',relations[id]??[],current)};
   })},
  {companyId:'abrasilver',label:'AbraSilver',status:dossiers.abraBridge.status,passed:null,total:BRIDGE_FIELDS.length,valuationReleased:false as const,reasons:dossiers.abraBridge.reasons,
   fields:BRIDGE_FIELDS.map(id=>({id,label:bridgeLabels[id]??id,engineCheckPassed:false,needed:'Gezamenlijk gereconcilieerde equity-invoer met valuta, eigendom, financiering en exacte peildatum volgens de bestaande equitybridge.',basis:'Afzonderlijke AbraSilver-equitybasis; project-NPV is geen aandelenwaarde.',research:research('abrasilver',[id],false)}))},
 ];
}
export type ModelReadinessView=ReturnType<typeof modelReadinessView>;
