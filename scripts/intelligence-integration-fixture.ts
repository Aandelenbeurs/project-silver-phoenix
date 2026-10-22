/** Entirely fictitious values: 26 source registrations + 3 analyses, 94 candidates. */
import {createHash} from 'node:crypto';
import {emptyIntelligenceState,registerDiscovered,registerPdfAnalysis,assertState} from '../data/multi-sector/research/intelligence/workflow';
import type {PdfValue} from '../data/multi-sector/research/intelligence/pdf-tables';
import {PDF_PARSER} from '../data/multi-sector/research/intelligence/pdf-parser';
export const fixtureAt='2026-10-22T10:00:00Z';
export function integrationFixture(){
 let state=emptyIntelligenceState();const originals:string[]=[];
 for(let i=0;i<26;i++){
  const result=registerDiscovered(state,{companyId:'advantage-energy',title:i===0?'Synthetic Q2 report':i===1?'Synthetic Q1 report':i===2?'Synthetic annual statements':`Synthetic source ${i}`,type:i===2?'annual':'quarterly',event:'financial-report',issuer:'Advantage Energy Ltd.',url:`https://www.advantageog.com/wp-content/uploads/synthetic-${i}.pdf`,sourceClass:'primary',publishedAt:'2026-08-01',period:{start:'',end:''},currency:null,text:'',locator:'Synthetic fixture only',supersedes:null,method:'automatic-discovery',monitoring:{channelId:'aav-financials',bodyHash:createHash('sha256').update(`synthetic-${i}`).digest('hex'),hashBasis:'pdf-bytes',processing:'manual-required',warnings:[],previousVersion:null}},fixtureAt);
  state=result.state;originals.push(result.documentId);
 }
 const analyses:string[]=[];
 for(const [index,count] of [54,32,8].entries()){
  const values:PdfValue[]=Array.from({length:count},(_,i)=>({metric:'revenue',label:`Synthetic revenue ${i+1}`,value:1000,unit:'CAD',currency:'CAD',period:{start:index===2?'2025-01-01':index===1?'2026-01-01':'2026-04-01',end:index===2?'2025-12-31':index===1?'2026-03-31':'2026-06-30'},scope:'advantage-consolidated',page:i+1,header:'Canadian dollars; synthetic period',rawNumber:'1000',scale:1,periodType:index===2?'annual':'quarter',definition:'Synthetic revenue definition',warnings:['Fictieve testwaarde, geen bedrijfsgegeven.'],supportingPages:[],quote:`Synthetic revenue ${i+1}: 1000 Canadian dollars.`}));
  state=registerPdfAnalysis(state,originals[index],{fileHash:state.documents[index].monitoring!.bodyHash,parser:PDF_PARSER,pages:count,values,warnings:['Synthetic extraction warning'],reportDate:null,errorCode:null,publishedAt:'2026-08-01'},fixtureAt);
  analyses.push(state.documents.at(-1)!.id);
 }
 assertState(state);return {state,originals,analyses};
}
