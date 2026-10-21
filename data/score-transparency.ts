import {getPrimaryLeverageScore,type PhoenixCompanyV2,type PhoenixDataStatus} from './phoenix-v2';
/** Documentation metadata for the existing formula. Not used to recalculate stored scores. */
export const SCORE_METHOD_REVIEW={
 quality:.30,growth:.25,leverage:.15,valuation:.20,catalysts:.10,
 investmentScenarioBonusMax:5,
 notes:[
  'Quality beoordeelt de onderneming; valuation is een aparte, handmatig ingevoerde score.',
  'Leverage kiest silver, anders gold, anders copper. Dit is modelblootstelling, geen actuele koerswaardering.',
  'Risk penalty wordt na de gewogen som afgetrokken; de uitkomst wordt op 0–100 begrensd.',
  'Confidence en data status worden niet rechtstreeks als korting op Opportunity toegepast.',
  'Investment Score voegt maximaal vijf scenario-punten toe op basis van het bestaande metalscenario.',
 ]
} as const;
export const DATA_STATUS_LABELS:Record<PhoenixDataStatus,string>={complete:'Legacy: compleet', 'valuation-stale':'Waardering verouderd','research-needed':'Onderzoek nodig',review:'Herbeoordeling nodig'};
export function explainLegacyScore(company:PhoenixCompanyV2){
 const s=company.scores;
 const leverage=getPrimaryLeverageScore(s.leverage);
 const inputs=[s.quality,s.growth,leverage,s.valuation,s.catalysts];
 const missing=inputs.some(x=>x===null);
 const contributions=missing?null:{quality:s.quality!*SCORE_METHOD_REVIEW.quality,growth:s.growth!*SCORE_METHOD_REVIEW.growth,
  leverage:leverage!*SCORE_METHOD_REVIEW.leverage,valuation:s.valuation!*SCORE_METHOD_REVIEW.valuation,catalysts:s.catalysts!*SCORE_METHOD_REVIEW.catalysts};
 return {companyId:company.companyId,existingOpportunity:s.opportunity,contributions,riskPenalty:s.riskPenalty,
  confidence:s.confidence,dataStatus:s.dataStatus,label:DATA_STATUS_LABELS[s.dataStatus],
  evidenceCaution:s.dataStatus==='complete'?'Legacy compleet is geen actuele bronvalidatie.':'Waarderings- of onderzoeksgegevens vragen aandacht; de score blijft ongewijzigd.',
  decisionUse:'Researchsignaal; geen geverifieerd koersdoel of automatische koopopdracht.'};
}
