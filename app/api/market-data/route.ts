import { NextResponse } from 'next/server'
import { fetchMarketData } from '@/lib/market-data'
import { getRecentDealFlags } from '@/lib/cache'

const { UNIQUE_TICKERS } = require('@/lib/companies')

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const prices = await fetchMarketData(UNIQUE_TICKERS as string[])
    const dealFlags = getRecentDealFlags(48)

    return NextResponse.json({ prices, dealFlags })
  } catch (err) {
    console.error('[market-data] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    )
  }
}
