import React from 'react';
import Link from 'next/link';
export default function ResearchDecisionNotice(){return <aside className="panel" style={{borderColor:'var(--gold-dark)',marginBottom:18}} aria-label="Onderzoeksstatus van voorstellen">
 <strong>Scores en voorstellen zijn onderzoek, geen automatische koopopdracht.</strong>
 <p>Een hoge score bewijst geen actuele waardering. Confidence en data status zijn interne beoordelingen;
  controleer bronperiode, waarderingsmodel en concentratie vóór een beslissing. De bestaande score- en optimizerregels blijven ongewijzigd.</p>
 <Link href="/research" style={{color:'var(--gold-bright)',textDecoration:'underline'}}>Bekijk methodologie en sectorvergelijking →</Link>
 </aside>;}
