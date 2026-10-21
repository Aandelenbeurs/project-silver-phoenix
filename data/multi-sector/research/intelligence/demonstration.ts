import type {ImportDocument} from './workflow';
/** Small literal excerpts of official releases, prepared for import, never pre-approved.
 * Not a full document download, not a live statement or post-sale balance sheet.
 */
export const INTELLIGENCE_DEMOS:readonly {name:string;explanation:string;document:ImportDocument}[]=[
 {name:'Advantage — historische nettoschuld',explanation:'Officieel Q2-bericht; historisch vóór Wembley. Deze kandidaat kan geen post-sale nettoschuldcontrole vrijgeven.',document:{
  companyId:'advantage-energy',title:'Advantage Q2 2026 results — excerpt',type:'quarterly',event:'financial-report',
  url:'https://www.advantageog.com/investors/newsreleases/article?id=122772',publishedAt:'2026-07-30',period:{start:'2026-06-30',end:'2026-06-30'},currency:'CAD',
  text:'Net debt(a) of $560.2 million',locator:'2026 Second Quarter Financial Highlights; afgerond gerapporteerd bedrag',supersedes:null}},
 {name:'AbraSilver — projectstudie',explanation:'Officiële filingbevestiging. Project-NPV is een studie-inschatting; geen equitywaarde of koersdoel.',document:{
  companyId:'abrasilver',title:'Diablillos DFS filing — excerpt',type:'technical-study',event:'study',
  url:'https://www.abrasilver.com/news-releases/abrasilver-files-definitive-feasibility-study-technical-report--provides-heap-leach-pea-update',publishedAt:'2026-07-21',period:{start:'2026-06-19',end:'2026-06-19'},currency:'USD',
  text:'after-tax NPV5% of US$3.0 billion',locator:'Opening DFS summary; study effective 19 June 2026; rounded value',supersedes:null}},
];
