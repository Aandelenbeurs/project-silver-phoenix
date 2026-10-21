import {reviewEvidence, type FinancialDatum, type EvidenceDocument, type EvidencePolicy} from './evidence';

/** Reconciliation only: consumes a sector model's after-tax, unlevered asset value.
 * Does not produce a second DCF, infer missing zeroes, fetch FX or choose funding terms.
 * The caller supplies the separately reviewed snapshot; a changed claim/document needs re-review.
 */
export const BRIDGE_FIELDS = ['operatingValue','ownership','nonOperatingAssets','cash','debt','corporateCostPV','otherObligations','thirdPartyInterests','dilutedShares','convertiblePrincipal','convertibleShares'] as const;
export type BridgeField = typeof BRIDGE_FIELDS[number];
export interface BridgeBasis {
 asOf:string; scope:string; currency:'CAD'|'USD';
 assetBasis:'after-tax-unlevered-net-of-project-capex';
 conversion:'debt'|'if-converted';
 // Explicitly reconciled funding/corporate-event basis, not a free-text override of evidence errors.
 fundingComplete:boolean;
}
export interface ReviewedSnapshot {data:readonly FinancialDatum[];documents:readonly EvidenceDocument[]}
export function reconcileEquity(data:readonly FinancialDatum[],documents:readonly EvidenceDocument[],basis:BridgeBasis,reviewed:ReviewedSnapshot){
 const rules:EvidencePolicy['rules']=BRIDGE_FIELDS.map(id=>({id,unit:id==='ownership'?'fraction':(id==='dilutedShares'||id==='convertibleShares')?'shares':basis.currency,
  scope:basis.scope,kinds:id==='operatingValue'?['reported','guidance','derived']:['reported','derived'],periodGroup:'equity-basis',maxAgeDays:0}));
 const review=reviewEvidence(data,documents,{asOf:basis.asOf,rules});
 const reasons=review.issues.map(x=>`${x.id}: ${x.message}`);
 for(const d of data){if(BRIDGE_FIELDS.includes(d.id as BridgeField)&&(d.period.start!==basis.asOf||d.period.end!==basis.asOf))reasons.push(`${d.id}: expliciete aansluiting naar exact de peildatum vereist`);if(JSON.stringify(d)!==JSON.stringify(reviewed.data.find(x=>x.id===d.id)))reasons.push(`${d.id}: gewijzigd sinds bronbeoordeling`);}
 for(const d of documents){if(JSON.stringify(d)!==JSON.stringify(reviewed.documents.find(x=>x.id===d.id)))reasons.push(`${d.id}: bron gewijzigd sinds beoordeling`);}
 if(basis.assetBasis!=='after-tax-unlevered-net-of-project-capex')reasons.push('Assetwaarde moet na projectcapex en belasting, vóór financiering zijn.');
 if(!basis.fundingComplete)reasons.push('Financiering, verwatering en aansluiting naar de analysepeildatum ontbreken.');
 const values=Object.fromEntries(BRIDGE_FIELDS.map(id=>[id,data.find(d=>d.id===id)?.value])) as Record<BridgeField,number|null|undefined>;
 if(values.ownership==null||values.ownership<0||values.ownership>1)reasons.push('Eigendomsbelang moet tussen 0 en 1 liggen.');
 if(values.dilutedShares==null||values.dilutedShares<=0)reasons.push('Positieve actuele aandelennoemer vereist.');
 for(const id of BRIDGE_FIELDS.filter(id=>id!=='operatingValue'))if(values[id]!=null&&values[id]!<0)reasons.push(`${id}: negatieve invoer niet toegestaan`);
 if(!['debt','if-converted'].includes(basis.conversion)||![values.convertiblePrincipal,values.convertibleShares].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0))reasons.push('Ongeldige conversiekeuze.');
 // Debt/shares are BEFORE conversion. Only this function applies the paired adjustment.
 if(values.debt!=null&&values.convertiblePrincipal!=null&&values.convertiblePrincipal>values.debt)reasons.push('Conversiehoofdsom overstijgt schuld.');
 if(reasons.length)return {status:'blocked' as const,reasons,equityValue:null,perShare:null,currency:basis.currency};
 const v=values as Record<BridgeField,number>;
 const debt=v.debt-(basis.conversion==='if-converted'?v.convertiblePrincipal:0);
 const shares=v.dilutedShares+(basis.conversion==='if-converted'?v.convertibleShares:0);
 const equityValue=v.operatingValue*v.ownership+v.nonOperatingAssets+v.cash-debt-v.corporateCostPV-v.otherObligations-v.thirdPartyInterests;
 const perShare=equityValue/shares;
 if(!Number.isFinite(equityValue)||!Number.isFinite(perShare))return {status:'blocked' as const,reasons:['Berekening niet eindig.'],equityValue:null,perShare:null,currency:basis.currency};
 return {status:'research-estimate' as const,reasons:[],equityValue,perShare,currency:basis.currency};
}

/** Mechanical dilution sensitivity, deliberately independent of any company fair value.
 * Fixed equity pool, no proceeds/fees/debt effects: not a financing valuation.
 */
export function dilutionSensitivity(additionalSharesFraction:number){
 if(!Number.isFinite(additionalSharesFraction)||additionalSharesFraction<0)throw Error('Verwatering moet eindig en niet-negatief zijn.');
 return {kind:'hypothetical' as const,additionalSharesFraction,remainingValuePerShareFraction:1/(1+additionalSharesFraction)};
}
