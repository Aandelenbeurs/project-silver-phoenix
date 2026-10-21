import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildFinancialDossiers,FINANCIAL_DATA,inspectDossierDatum,DIABLILLOS_SCENARIOS} from '../data/multi-sector/research/financial-dossiers';
import FinancialResearch from '../app/research/FinancialResearch';
const d=buildFinancialDossiers();assert.deepEqual(d,buildFinancialDossiers());
assert.equal(d.abraBridge.perShare,null);assert.equal(d.aav.passed,6);assert.equal(d.aav.total,17);assert.equal(d.aav.open.length,11);assert.deepEqual(d.aav.unmapped,[]);
assert.equal(d.decision.safetyMargin,null);assert.equal(d.decision.observedPrice,null);assert.equal(d.decision.automaticAdvice,false);
for(const x of FINANCIAL_DATA){assert.ok(x.locator&&x.documentId&&x.company);if(['abra-q2','abra-mda'].includes(x.documentId!)||x.verification==='conflicting')assert.equal(inspectDossierDatum(x).status,'blocked');else assert.equal(inspectDossierDatum(x).status,'review-ready',x.id);}
assert.deepEqual(DIABLILLOS_SCENARIOS.map(s=>s.npv5),[1884,3003,4116]);
assert.ok(DIABLILLOS_SCENARIOS.every(s=>s.npv8<s.npv5));
const html=renderToStaticMarkup(React.createElement(FinancialResearch));
for(const phrase of ['Veiligheidsmarge','Onbekend','Aandelenwaardering geblokkeerd','6/17','hypothetische','Geen nettocash','Publicatie:'])assert.ok(html.toLowerCase().includes(phrase.toLowerCase()),phrase);
console.log('PASS: official dossier metadata, unknown publication remains blocked, study scenarios, unchanged AAV gate and no price/margin/advice');
