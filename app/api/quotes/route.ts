import { NextRequest, NextResponse } from 'next/server';

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; currency?: string };
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

async function getQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } });
  if (!response.ok) return { price: null, currency: null };
  const payload = (await response.json()) as YahooChart;
  const result = payload.chart?.result?.[0];
  const latest = result?.meta?.regularMarketPrice;
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const fallback = [...closes].reverse().find((value): value is number => typeof value === 'number');
  return { price: latest ?? fallback ?? null, currency: result?.meta?.currency ?? null };
}

export async function GET(request: NextRequest) {
  const symbols = (request.nextUrl.searchParams.get('symbols') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!symbols.length) return NextResponse.json({});
  const unique = [...new Set(symbols)].slice(0, 75);
  const entries = await Promise.all(unique.map(async (symbol) => [symbol, await getQuote(symbol)] as const));
  return NextResponse.json(Object.fromEntries(entries));
}
