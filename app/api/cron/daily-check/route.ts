/**
 * Daily cron job — runs at 08:00 IST (02:30 UTC).
 * NO LLM/AI calls. Fetches news, detects deal signals, pushes to ntfy.sh.
 * Protected by CRON_SECRET bearer token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchCompanyNews, detectCrossCompanyDeals, type NewsItem } from '@/lib/news-fetcher'
import { addDealFlag, setLastCronRun } from '@/lib/cache'
import { sendBundledNtfy } from '@/lib/ntfy'

const { COMPANIES } = require('@/lib/companies')

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function bearerOk(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

interface CompanyDef {
  ticker: string
  name: string
  tier: string
}

export async function GET(req: NextRequest) {
  if (!bearerOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date().toISOString()
  const notifications: string[] = []
  const allItems: Array<{ ticker: string; item: NewsItem }> = []

  // Deduplicate companies by ticker for news queries
  const seen = new Set<string>()
  const deduped: CompanyDef[] = []
  for (const c of COMPANIES as CompanyDef[]) {
    if (!seen.has(c.ticker)) {
      seen.add(c.ticker)
      deduped.push(c)
    }
  }

  // Fetch news in parallel batches of 5 to avoid rate limiting
  const BATCH = 5
  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH)
    await Promise.all(batch.map(async company => {
      try {
        const items = await fetchCompanyNews(company.name, company.ticker)
        for (const item of items) {
          allItems.push({ ticker: company.ticker, item })
          if (item.isDeal) {
            addDealFlag({
              ticker: company.ticker,
              headline: item.title,
              source: item.source,
              detectedAt: new Date().toISOString(),
              keywords: item.matchedKeywords,
            })
            notifications.push(
              `[${company.ticker}] ${item.title}\n${item.link}`
            )
          }
        }
      } catch (err) {
        console.error(`[cron] Error fetching news for ${company.ticker}:`, err)
      }
    }))
  }

  // Detect cross-company deals
  const crossDeals = detectCrossCompanyDeals(allItems)
  for (const deal of crossDeals) {
    const msg = `CROSS-COMPANY: [${deal.tickers.join(', ')}] ${deal.item.title}\n${deal.item.link}`
    if (!notifications.includes(msg)) {
      notifications.push(msg)
    }
  }

  // Send ntfy notifications (capped at 8, overflow bundled)
  if (notifications.length > 0) {
    await sendBundledNtfy(notifications, 'AI Infra Signal')
  }

  setLastCronRun('ok')

  return NextResponse.json({
    ok: true,
    startedAt,
    completedAt: new Date().toISOString(),
    companiesChecked: deduped.length,
    dealSignals: notifications.length,
    crossCompanyDeals: crossDeals.length,
  })
}
