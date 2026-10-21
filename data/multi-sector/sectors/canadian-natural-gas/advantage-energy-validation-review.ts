import { evaluateClaimBackedAdvantageReadiness } from './advantage-energy-claim-readiness';
export const AAV_VALIDATION_REVIEW_DATE='2026-10-21';
export const REVIEW_SOURCES={
  q2:{url:'https://www.advantageog.com/wp-content/uploads/Q2-2026-Report.pdf',title:'Q2-verslag en MD&A',period:'30 juni 2026',published:'2026-07-30'},
  aif:{url:'https://www.advantageog.com/wp-content/uploads/2025-Annual-Information-Form.pdf',title:'Annual Information Form 2025',period:'31 december 2025',published:'2026-03-05'},
  annual:{url:'https://www.advantageog.com/wp-content/uploads/Annual-Report-2025-FINAL.pdf',title:'Jaarverslag 2025',period:'2025',published:'2026-03-05'},
  guidance:{url:'https://www.advantageog.com/investors/newsreleases/article?id=122773',title:'Wembley en herziene guidance',period:'H1 / verwachtingen 2026',published:'2026-08-26'},
  closing:{url:'https://www.advantageog.com/investors/newsreleases/article?id=122774',title:'Wembley afgerond',period:'11 september 2026',published:'2026-09-11'},
  presentation:{url:'https://www.advantageog.com/wp-content/uploads/September-2026-Investor-Presentation.pdf',title:'Septemberpresentatie',period:'gemengde historische / forecastperioden',published:'2026-09'},
} as const;
export type ReviewRow={key:string;label:string;needed:string;available:string;source:keyof typeof REVIEW_SOURCES;locator:string;kind:'gerapporteerd'|'managementverwachting'|'berekening'|'aanname';decision:string};
/** One decision for each currently failed machine check. Does not manufacture claims. */
export const AAV_OPEN_CHECK_REVIEW:readonly ReviewRow[]=[
 {key:'reserveAdjustment',label:'Reservebasis na verkoop',needed:'1P en 2P gasreserves in Bcf, zelfde datum, verkochte gascomponent en aansluiting.',available:'Wembley: 27,9 mln boe 1P en 46,1 mln boe 2P; geen voldoende gasuitsplitsing.',source:'guidance',locator:'Wembley Assets; reserves per 31-12-2025',kind:'gerapporteerd',decision:'Niet vrijgeven: boe niet integraal als gas behandelen; ook productie en herzieningen ontbreken.'},
 {key:'currentDebt',label:'Actuele nettoschuld',needed:'Balans na 11 september met cash, werkkapitaal, bankschuld en convertibles; Entropy apart.',available:'Verkoop afgerond; bruto-opbrengst CAD 316 mln. Geen nieuwe balans.',source:'closing',locator:'Closing announcement',kind:'gerapporteerd',decision:'Niet vrijgeven: kasopbrengst is geen gereconcilieerde schuldstand.'},
 {key:'currentDilutedShares',label:'Actuele aandelen',needed:'Uitstaande aandelen en PSU/conversiebrug per post-sale datum, consequent met schuld.',available:'167.435.718 basic op 30 juni; gewogen EPS-verwatering is een ander begrip.',source:'q2',locator:'PDF p.26 en p.64 (gedrukt 25, 63)',kind:'gerapporteerd',decision:'Niet vrijgeven: kwartaalgemiddelde en buybackvoornemen zijn geen actuele cap table.'},
 {key:'currentProduction',label:'Actuele productmix',needed:'Gemeten post-sale gas in MMcf/d en liquids in bbl/d over dezelfde periode.',available:'Q4 83–84k boe/d; jaarmix is geen gemeten Q4-splitsing.',source:'guidance',locator:'Guidance Update',kind:'managementverwachting',decision:'Niet vrijgeven: toekomstverwachting is geen post-sale actual.'},
 {key:'forwardEconomicAssumptions',label:'Samenhangende economische invoer',needed:'Gedateerde decline, capex, opex, transport en gerealiseerde gas/liquids-prijspaden met scope.',available:'Kosten- en budgetguidance beschikbaar; generieke putten zijn half-cyclevoorbeelden.',source:'presentation',locator:'PDF p.6, 12–14, 30; voetnoten',kind:'managementverwachting',decision:'Niet vrijgeven: totaalprogramma is geen bewezen capaciteitsrespons; hubs/hedges/tax ontbreken in research.'},
 {key:'claim:postSaleGasProduction',label:'Bewijs gasproductie',needed:'Gecontroleerde claim met waarde, MMcf/d, periode, scope en bronlocatie.',available:'Historische gasproductie beschikbaar; geen gemeten gasbasis na verkoop gevonden.',source:'q2',locator:'Operating highlights; vóór verkoop',kind:'gerapporteerd',decision:'Niet vrijgeven: historische claim hoort niet bij deze post-sale metriek.'},
 {key:'claim:postSaleLiquidsProduction',label:'Bewijs liquidsproductie',needed:'Gecontroleerde claim bbl/d na verkoop, met productdefinitie.',available:'Historische kwartaalmeting; verkochte volumes zijn H1-gemiddelden.',source:'guidance',locator:'Wembley Assets, H1-volumes',kind:'gerapporteerd',decision:'Niet vrijgeven: aftrek van gemiddelden uit verschillende perioden bewijst actuele productie niet.'},
 {key:'claim:postSaleNetDebt',label:'Bewijs schuld na verkoop',needed:'Gecontroleerde post-sale schuldclaim, definitie en aansluiting.',available:'Circa CAD 245 mln bij ingaan Q4 is een verwachting.',source:'guidance',locator:'Transaction Rationale',kind:'managementverwachting',decision:'Niet vrijgeven: closing bevestigt geen exacte nettoschuld.'},
 {key:'claim:currentFullyDilutedShares',label:'Bewijs aandelenbrug',needed:'Gecontroleerde actuele noemer met schuld/conversiekeuze.',available:'Presentatie noemt 167,3 mln; kapitaalstructuur sluit verkoopopbrengst uit.',source:'presentation',locator:'PDF p.4; voetnoot kapitaalstructuur',kind:'gerapporteerd',decision:'Niet vrijgeven: publicatiemaand bewijst geen meetdatum na verkoop.'},
 {key:'claim:postSaleProvedGasReserves',label:'Bewijs 1P gas',needed:'Claim gas-only 1P in Bcf met onafhankelijke evaluatiedatum en verkoopbrug.',available:'AIF bevat onafhankelijke jaarultimo-evaluatie vóór verkoop.',source:'aif',locator:'Statement of Reserves Data; evaluatie 31-12-2025',kind:'gerapporteerd',decision:'Niet vrijgeven: geen gevalideerde post-sale gasclaim.'},
 {key:'claim:postSaleTwoPReserves',label:'Bewijs 2P gas',needed:'Claim gas-only 2P in Bcf op dezelfde basis als 1P.',available:'Jaarreserves zijn beschikbaar, maar niet gereconcilieerd naar peildatum na verkoop.',source:'annual',locator:'Reserves Summary; evaluatie 31-12-2025',kind:'gerapporteerd',decision:'Niet vrijgeven: categorievergelijking alleen is onvoldoende.'},
];
export function getAavValidationReview(){
 const readiness=evaluateClaimBackedAdvantageReadiness();
 const failed=Object.entries(readiness.checks).filter(([,passed])=>!passed).map(([key])=>key);
 return {readiness,passed:Object.values(readiness.checks).filter(Boolean).length,total:Object.keys(readiness.checks).length,
   open:AAV_OPEN_CHECK_REVIEW.filter(r=>failed.includes(r.key)),unmapped:failed.filter(k=>!AAV_OPEN_CHECK_REVIEW.some(r=>r.key===k))};
}
/** Reconciliation of historical observations only; not current valuation inputs. */
export const AAV_CAPITAL_REVIEW={asOf:'2026-06-30',bankDebtCad:397_896_000,convertiblePrincipalCad:143_750_000,
 workingCapitalDeficitCad:18_602_000,netDebtCad:560_248_000,convertibleCarryingValueCad:128_703_000,
 basicShares:167_435_718,epsConvertibleShares:9_859_396,conversionPriceCad:14.58,
 rule:'Debt-case: hoofdsom als schuld behouden, conversieaandelen uitsluiten. If-converted: hoofdsom verwijderen en conversieaandelen toevoegen. PSU’s afzonderlijk. Geen automatische keuze zonder actuele aandelenbrug.',
 sources:['q2','aif'] as const};
