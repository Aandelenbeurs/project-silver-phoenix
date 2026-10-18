import { AAV_EVIDENCE_LEDGER, type EvidenceItem } from './advantage-energy-evidence-ledger';

export type EvidenceRequirement = {
  id: string;
  title: string;
  description: string;
  known: string;
  needed: string;
  consequence: string;
  relatedIds: readonly string[];
  blocking: boolean;
};

/** Human-readable requirements; never converts forecasts or Q2 values to verified post-sale actuals. */
export const AAV_REQUIREMENTS: readonly EvidenceRequirement[] = [
  {id:'production',title:'Productie na Wembley',description:'Gas en liquids moeten afzonderlijk aansluiten op de resterende activiteiten.',known:'Q2 vóór verkoop: 347,770 MMcf/d gas en 12.650 bbl/d liquids. Q4-productieguidance: circa 83.500 boe/d totaal.',needed:'Afzonderlijk gerapporteerde gas- en liquidsproductie voor de resterende activiteiten, met bron en peildatum.',consequence:'Productie-inputs zijn niet vrijgegeven.',relatedIds:['q2-gas','q2-liquids','q4-production'],blocking:true},
  {id:'reserves',title:'Reserves na Wembley',description:'Bewezen en 2P-gasreserves moeten herleidbaar zijn naar de resterende portefeuille.',known:'Wembley verkocht 46,1 MMboe 2P. De verkochte boe-volumes zijn niet automatisch gas-Bcf.',needed:'Gecontroleerde proved- en 2P-gasreserves van het overgebleven bedrijf, inclusief juiste aanpassing voor de verkoop.',consequence:'Reservebegrensde officiële waardering is geblokkeerd.',relatedIds:['wembley-2p','post-sale-reserves'],blocking:true},
  {id:'debt',title:'Actuele nettoschuld',description:'Een schuldverwachting is geen vastgestelde balanspositie.',known:'Q2 vóór Wembley: circa CAD 560,2 mln. Managementverwachting begin Q4: circa CAD 245 mln.',needed:'Gerapporteerde nettoschuld na 11 september 2026, op vergelijkbare consolidatiebasis.',consequence:'Equity bridge kan niet officieel worden vastgesteld.',relatedIds:['q2-debt','wembley-proceeds','debt-forecast','post-sale-debt'],blocking:true},
  {id:'shares',title:'Actuele volledig verwaterde aandelen',description:'Een kwartaalgemiddelde kan afwijken van het actuele aantal aandelen.',known:'Q2 gewogen gemiddeld verwaterd: circa 179,64 miljoen aandelen.',needed:'Actuele fully diluted aandelenstand met peildatum en onderbouwing.',consequence:'Waarde per aandeel is uitsluitend een proxy.',relatedIds:['q2-shares','post-sale-shares'],blocking:true},
  {id:'economics',title:'Toekomstige economische aannames',description:'Kosten, decline en investeringen moeten een consistent toekomstscenario vormen.',known:'Historische Q2-operationele kosten, transportkosten en capex zijn geregistreerd; V3 gebruikt expliciet hypothetische parameters.',needed:'Gedocumenteerde forward decline-, kosten-, capex- en overige economische aannames met herkomst en validatie.',consequence:'Scenario-uitkomsten blijven onderzoeksproeven.',relatedIds:['q2-operating','q2-transport','q2-capex'],blocking:true},
];

export function evidenceForRequirement(requirement: EvidenceRequirement): readonly EvidenceItem[] {
  return requirement.relatedIds.map(id=>AAV_EVIDENCE_LEDGER.find(item=>item.id===id)).filter((item): item is EvidenceItem=>Boolean(item));
}

export function explainAavBlocker(error: string): string {
  const key = error.toLowerCase();
  if (key.includes('reserveadjustment') || key.includes('reserves')) return 'Reserves na Wembley: ontbrekend of onvoldoende gevalideerd reservebewijs.';
  if (key.includes('currentdebt') || key.includes('postsalenetdebt')) return 'Nettoschuld: managementverwachting is nog geen gerapporteerde post-sale balans.';
  if (key.includes('dilutedshares')) return 'Aandelen: actuele volledig verwaterde aandelenstand ontbreekt.';
  if (key.includes('currentproduction') || key.includes('postsalegasproduction') || key.includes('postsaleliquidsproduction')) return 'Productie: afzonderlijke post-sale gas- en liquidsgegevens ontbreken.';
  if (key.includes('forwardeconomic')) return 'Economische aannames: forward inputs nog niet voldoende onderbouwd.';
  return `Overige technische controle: ${error}`;
}

export function validateAavRequirements(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const r of AAV_REQUIREMENTS) {
    if(ids.has(r.id)) errors.push(`Dubbele vereiste: ${r.id}`);
    ids.add(r.id);
    for(const id of r.relatedIds) if(!AAV_EVIDENCE_LEDGER.some(item=>item.id===id)) errors.push(`Ontbrekende ledger-verwijzing: ${r.id}/${id}`);
  }
  return errors;
}
