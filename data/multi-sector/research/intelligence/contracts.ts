import type {FinancialDatum} from '../evidence';
export type CompanyId='abrasilver'|'advantage-energy';
export type DocumentType='annual'|'quarterly'|'mda'|'press-release'|'technical-study'|'reserves'|'financial-notes'|'material-event';
export type EventType='financial-report'|'guidance'|'disposition'|'acquisition'|'issuance'|'share-count'|'reserves'|'study'|'financing'|'other';
export type CandidateStatus='to-review'|'insufficient-evidence'|'conflicting'|'extraction-error';
export interface SourceDocument {
 id:string;companyId:CompanyId;title:string;type:DocumentType;event:EventType;
 issuer:string;url:string;sourceClass:'primary'|'secondary';publishedAt:string|null;
 period:{start:string;end:string};discoveredAt:string;version:string;supersedes:string|null;
 text:string;locator:string;contentHash:string;currency:'CAD'|'USD'|null;
 monitoring?:{channelId:string;bodyHash:string|null;hashBasis:'pdf-bytes'|'html-text'|'index-metadata';processing:'discovered'|'fetched'|'processed'|'manual-required'|'unreachable';warnings:string[];previousVersion:string|null};
 method:'manual-excerpt'|'automatic-discovery';status:'discovered'|'extracted'|'extraction-error';
}
export interface Candidate {
 id:string;documentId:string;companyId:CompanyId;metric:string;label:string;
 datum:FinancialDatum;currency:'CAD'|'USD'|null;raw:string;quote:string;locator:string;
 method:'rule-v1'|'manual-v1';formula:string|null;status:CandidateStatus;issues:string[];
 relation:'new-period'|'correction'|'guidance'|'event'|'same-period';relevance:string;fingerprint:string;
}
export interface Decision {id:string;candidateId:string;fingerprint:string;documentHash:string;action:'approve'|'reject';reason:string;at:string;actor:'local-user'}
export interface MonitorObservation {url:string;title:string;documentId:string|null;registration:'new'|'known'|'changed'|'possible-duplicate'|'unavailable';processing:string;message:string}
export interface MonitorResult {httpStatus:number|null;indexHash:string|null;observations:MonitorObservation[];counts:{found:number;new:number;known:number;changed:number;duplicates:number;unavailable:number};limited:boolean}
export interface SourceCheck {monitoring?:MonitorResult;id:string;channelId:string;at:string;lastSuccessAt:string|null;status:'success'|'unavailable';coverage:'index-only';message:string;found:{url:string;title:string}[]}
export interface AuditEntry {sequence:number;at:string;action:'import'|'candidate'|'approve'|'reject'|'source-check';subject:string;fingerprint:string;previousHash:string;hash:string}
export interface IntelligenceState {schema:1;revision:number;documents:SourceDocument[];candidates:Candidate[];decisions:Decision[];checks:SourceCheck[];audit:AuditEntry[]}
export const emptyIntelligenceState=():IntelligenceState=>({schema:1,revision:0,documents:[],candidates:[],decisions:[],checks:[],audit:[]});

export type FreshnessStatus='current'|'revision-needed'|'outdated'|'unknown';
