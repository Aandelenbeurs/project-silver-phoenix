import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
async function quote(symbol:string){
 const u=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
 const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'},cache:'no-store'}); if(!r.ok) return null;
 const j=await r.json(); const x=j?.chart?.result?.[0];
 return x?{price:x.meta?.regularMarketPrice??null,currency:x.meta?.currency??null}:null;
}
export async function GET(req:NextRequest){
 const symbols=(req.nextUrl.searchParams.get('symbols')||'').split(',').filter(Boolean).slice(0,60);
 const entries=await Promise.all(symbols.map(async s=>[s,await quote(s)] as const));
 return NextResponse.json(Object.fromEntries(entries));
}
