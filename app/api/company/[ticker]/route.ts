import { NextRequest, NextResponse } from 'next/server'
import { fetchSingleTicker } from '@/lib/market-data'

const { COMPANIES } = require('@/lib/companies')

export const dynamic = 'force-dynamic'

interface CompanyDef {
  ticker: string
  googleTicker: string
  name: string
  region: string
  tier: string
  tags?: string[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1'

  // Find company record(s) — a ticker may appear in multiple tiers
  const matches = (COMPANIES as CompanyDef[]).filter(
    c => c.ticker.toUpperCase() === ticker.toUpperCase()
  )

  if (!matches.length) {
    return NextResponse.json({ error: `Ticker ${ticker} not found` }, { status: 404 })
  }

  const primary = matches[0]
  const allTiers = [...new Set(matches.map(c => c.tier))]

  try {
    const priceData = await fetchSingleTicker(primary.ticker, primary.googleTicker, forceRefresh)
    return NextResponse.json({
      company: {
        ticker: primary.ticker,
        googleTicker: primary.googleTicker,
        name: primary.name,
        region: primary.region,
        tiers: allTiers,
        tags: primary.tags ?? [],
      },
      price: priceData,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
