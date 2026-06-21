import { NextResponse } from 'next/server'
import { fetchMarketData } from '@/lib/market-data'
import { getRecentDealFlags } from '@/lib/cache'

const { COMPANIES } = require('@/lib/companies')

export const dynamic = 'force-dynamic'

// Deduplicate companies by ticker for price queries
interface CompanyDef { ticker: string; googleTicker: string }
const seen = new Set<string>()
const UNIQUE_COMPANIES: CompanyDef[] = []
for (const c of COMPANIES as CompanyDef[]) {
  if (!seen.has(c.ticker)) {
    seen.add(c.ticker)
    UNIQUE_COMPANIES.push({ ticker: c.ticker, googleTicker: c.googleTicker })
  }
}

export async function GET() {
  try {
    const prices = await fetchMarketData(UNIQUE_COMPANIES)
    const dealFlags = getRecentDealFlags(48)
    return NextResponse.json({ prices, dealFlags })
  } catch (err) {
    console.error('[market-data] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}
