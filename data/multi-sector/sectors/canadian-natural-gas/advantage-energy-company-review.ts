/** Independent evidence review. NOT connected to the strict valuation input adapter.
 * Verified means checked against the cited publication, not audited by Phoenix.
 */
export const AAV_REVIEW_DATE = '2026-10-21';
export const AAV_COMPANY_SOURCES = {
  q2: 'https://www.advantageog.com/investors/newsreleases/article?id=122772',
  guidance: 'https://www.advantageog.com/investors/newsreleases/article?id=122773',
  sale: 'https://www.advantageog.com/investors/newsreleases/article?id=122774',
  reserves: 'https://www.advantageog.com/investors/newsreleases/article?id=122766',
} as const;
export type CompanyFact = { label:string; display:string; kind:'reported'|'guidance'; period:string;
  source:keyof typeof AAV_COMPANY_SOURCES; limitation:string };
export const AAV_COMPANY_FACTS: readonly CompanyFact[] = [
  {label:'Productie Q2',display:'70.611 boe/d',kind:'reported',period:'Q2 2026',source:'q2',limitation:'Vóór Wembley-verkoop; geplande stop beïnvloedt kwartaal.'},
  {label:'Gas / vloeistoffen Q2',display:'347,770 MMcf/d / 12.650 bbl/d',kind:'reported',period:'Q2 2026',source:'q2',limitation:'Geen gemeten productmix na verkoop.'},
  {label:'Nettoschuld Q2',display:'CAD 560,248 mln',kind:'reported',period:'30-06-2026',source:'q2',limitation:'Advantage-segment; exclusief Entropy.'},
  {label:'Verwaterd gemiddelde aandelen',display:'179,640 mln',kind:'reported',period:'Q2 2026',source:'q2',limitation:'Kwartaalgemiddelde; geen actuele fully diluted share count.'},
  {label:'AFF / netto-investeringen',display:'CAD 88,797 / 88,063 mln',kind:'reported',period:'Q2 2026',source:'q2',limitation:'Niet-IFRS-maatstaven; Advantage exclusief Entropy.'},
  {label:'Gas hedges',display:'48% H2 2026 / 34% 2027',kind:'guidance',period:'30-07-2026',source:'q2',limitation:'Forecastvolumes; niet gelijk aan actuele hedgeboekwaarde.'},
  {label:'Wembley-verkoop afgerond',display:'CAD 316 mln bruto',kind:'reported',period:'11-09-2026',source:'sale',limitation:'Vóór closing adjustments; geen netto-opbrengst of actuele schuld.'},
  {label:'Productieverwachting Q4',display:'83.000–84.000 boe/d',kind:'guidance',period:'26-08-2026',source:'guidance',limitation:'Managementverwachting; geen gerapporteerde productie.'},
  {label:'Verwachte schuld begin Q4',display:'circa CAD 245 mln',kind:'guidance',period:'26-08-2026',source:'guidance',limitation:'Inclusief CAD 144 mln convertibles; geen closing-balans.'},
  {label:'Investeringsbudget 2026',display:'CAD 280–310 mln',kind:'guidance',period:'26-08-2026',source:'guidance',limitation:'Heel jaar, inclusief periode vóór verkoop; geen putkosten.'},
  {label:'Operationele kosten Q4',display:'circa CAD 4,70/boe',kind:'guidance',period:'26-08-2026',source:'guidance',limitation:'Exclusief transport, royalties, G&A en financiering.'},
  {label:'PDP / 1P / 2P reserves',display:'173,4 / 476,7 / 689,2 mln boe',kind:'reported',period:'31-12-2025',source:'reserves',limitation:'Onafhankelijke schattingen vóór verkoop, bruto vóór royalties; categorieën niet optellen.'},
  {label:'PDP F&D inclusief FDC',display:'CAD 9,36/boe',kind:'reported',period:'2025',source:'reserves',limitation:'Reserve-toevoegingskosten; geen CAD per flowing boe/d en geen put-capex.'},
];
export const AAV_METHODOLOGY_FINDINGS = [
  'Convertibles: schuld aftrekken én conversieaandelen meetellen kan dubbel tellen. Kies een consistente debt-case of if-converted-case; huidige researchproxy is hiervoor niet gereconcilieerd.',
  'Reserves van december 2025 bevatten Wembley. Gebruik geen simpele aftrek van productie of verkoopprijs als vervanging voor een actuele reserve-evaluatie.',
  'AECO is slechts een deel van de afzet. Modelleer hubs, transport, valuta en hedges apart; CAD/GJ, CAD/MMBtu en CAD/Mcf zijn niet uitwisselbaar zonder warmte-inhoud.',
  'CAD/boe F&D meet reserve-toevoegingen; CAD per flowing boe/d meet capaciteit. IP30 raw gas is geen jaarlijks gemiddelde salesproductie.',
  'Vijfjaars-DCF koppelt capex niet aan extra productie. V2/V3 en beleid doen dit wel, maar met fictieve capaciteit, daling en reservebudget.',
  'Drempels en projecttranches zijn vóór belasting, met jaarultimo-discontering van zowel opbrengst als capex. Vroeg betaalde capex vraagt een aparte timingtoets.',
  'Project-NPVs delen in werkelijkheid reserves en capaciteit. Optellen is geen gezamenlijke optimalisatie; beleid gebruikt een vijfjaarsheuristiek.',
  'Een volledige waardering vraagt belastingen, ontmanteling, cashflow- en schuldreconciliatie, Entropy-belang en een expliciete restwaardemethode. Financieringsrente niet dubbel in unlevered DCF verwerken.',
] as const;
