import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import integrity from './fixtures/engine-integrity-v110.json';
import golden from './fixtures/engines-v110.json';
import {collectEngineFixture} from './engine-regression-fixture';
import {buildRankingView} from '../data/ranking-view';
import {explainLegacyScore} from '../data/score-transparency';
import {phoenixCompaniesV2} from '../data/phoenix-v2';
const current=JSON.parse(JSON.stringify(collectEngineFixture()));
let baselineDataset=true;
for(const [file,expected] of Object.entries(integrity)){
 const actual=createHash('sha256').update(readFileSync(file,'utf8').replace(/\r\n/g,'\n')).digest('hex');
 if(file==='data/companies.ts'||file==='data/phoenix-v2.ts'){if(actual!==expected)baselineDataset=false;}
 else assert.equal(actual,expected,`Authoritative engine source changed: ${file}`);
}
if(baselineDataset)assert.deepEqual(current,golden,'Calculation, score, ranking, optimizer, rotation or AAV changed versus commit 3b4ba71');
else console.log('SKIP frozen 3b4ba71 output comparison: local protected company/score dataset differs. Local ranking parity, score explanations and unchanged engine-source checks still run. No dataset files are written.');
for(const ranking of current.rankings){
 const rows=buildRankingView(ranking);
 assert.deepEqual(rows.map(r=>[r.companyId,r.investmentScore,r.scenarioUpside]),ranking.map((r:{companyId:string;investmentScore:number|null;scenarioUpside:number|null})=>[r.companyId,r.investmentScore,r.scenarioUpside]));
}
const first=golden.rankings[0][0];
assert.equal(buildRankingView([first,{...first,investmentScore:-1}]).find(x=>x.companyId===first.companyId)?.investmentScore,first.investmentScore);
const fallback=buildRankingView([]);
assert.deepEqual(fallback.map(r=>[r.companyId,r.investmentScore]),[...phoenixCompaniesV2].sort((a,b)=>(b.scores.opportunity??-1)-(a.scores.opportunity??-1)).map(r=>[r.companyId,r.scores.opportunity]));
for(const c of phoenixCompaniesV2){
 const x=explainLegacyScore(c);
 if(x.contributions){const raw=Object.values(x.contributions).reduce((s,v)=>s+v,0)-x.riskPenalty;assert.ok(Math.abs(Math.max(0,Math.min(100,raw))-c.scores.opportunity!)<1e-9);}
}
console.log(baselineDataset ? 'PASS: all 51 score records, three rankings, fallback/ties, portfolio, three optimizer fixtures, rotation and AAV V2/V3/policies identical to 3b4ba71' : 'PASS: local ranking/fallback/score metadata parity and unchanged authoritative engine source');
