import type {CompanyId,EventType} from './contracts';
export const COMPANIES={
 'abrasilver':{name:'AbraSilver Resource Corp.',issuer:'AbraSilver Resource Corp.',hosts:['www.abrasilver.com','abrasilver.com']},
 'advantage-energy':{name:'Advantage Energy Ltd.',issuer:'Advantage Energy Ltd.',hosts:['www.advantageog.com','advantageog.com']},
} as const;
export const SOURCE_CHANNELS=[
 {id:'aav-financials',companyId:'advantage-energy',title:'Advantage financiële rapporten',url:'https://www.advantageog.com/investors/financial-reports'},
 {id:'aav-news',companyId:'advantage-energy',title:'Advantage officiële nieuwsberichten',url:'https://www.advantageog.com/investors/newsreleases'},
 {id:'abra-financials',companyId:'abrasilver',title:'AbraSilver financials en MD&A',url:'https://www.abrasilver.com/investors/financials/'},
 {id:'abra-news',companyId:'abrasilver',title:'AbraSilver officiële nieuwsberichten',url:'https://www.abrasilver.com/news-releases/'},
 {id:'abra-studies',companyId:'abrasilver',title:'AbraSilver technische studies',url:'https://www.abrasilver.com/projects/technical-reports/'},
] as const;
/** Validates a reference only. Import NEVER fetches user-supplied URLs. */
export function validateReference(raw:string,companyId:CompanyId){
 if(raw.length>2000||/[\s\\\u0000-\u001f]/.test(raw))throw Error('Ongeldige bron-URL.');
 let u:URL;try{u=new URL(raw);}catch{throw Error('Ongeldige bron-URL.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname)||u.hostname.endsWith('.local')||u.hostname.endsWith('.internal')||u.hostname==='localhost')throw Error('Alleen publieke HTTPS-bronverwijzingen zonder credentials, poort of fragment.');
 const hosts:readonly string[]=COMPANIES[companyId].hosts;
 const own=hosts.includes(u.hostname);
 const other=Object.entries(COMPANIES).some(([id,c])=>id!==companyId&&(c.hosts as readonly string[]).includes(u.hostname));
 if(other)throw Error('Bron hoort bij een ander bedrijf.');
 // Query parameters can carry identifying information; only numeric official article IDs are accepted.
 if(u.search&&!(companyId==='advantage-energy'&&own&&/^\?id=\d{1,10}$/.test(u.search)))throw Error('Gebruik de document-URL zonder tracking- of versiequery.');
 return {url:u.href,sourceClass:own?'primary' as const:'secondary' as const,issuer:own?COMPANIES[companyId].issuer:u.hostname};
}
export const IMPACT:Record<EventType,string[]>={
 'financial-report':['financieel dossier','waarderingsbrug','scenario’s','verificatiecontroles'],guidance:['scenario’s','economische invoer','datakwaliteit'],
 disposition:['productie- en reservebasis','schuldbrug','waarderingsbrug','verificatiecontroles'],acquisition:['activa en verplichtingen','productie','waarderingsbrug'],
 issuance:['aandelennoemer','cashbrug','verwatering'], 'share-count':['aandelennoemer','waarderingsbrug'],reserves:['reservebasis','uitputting','scenario’s'],
 study:['project-NPV','projectcapex','scenario’s','waarderingsbrug'],financing:['schuld en kas','verwatering','waarderingsbrug'],other:['financieel dossier'],
};
