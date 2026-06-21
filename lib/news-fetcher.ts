/**
 * Tiered news fetcher — NO LLM/AI calls.
 * Priority:
 *   1. PR wires via Google News RSS (restricted to wire domains)
 *   2. SEC EDGAR full-text search (free, no key required)
 *   3. Google News RSS unrestricted catch-all
 */

const DEAL_KEYWORDS = [
  'deal', 'partnership', 'contract', 'agreement', 'supply', 'capacity',
  'expansion', 'expand', 'order', 'collaborat', 'invest', 'stake',
  'acquisition', 'acquire', 'wins', 'signs', 'announces', 'deploy',
]

// PR wire domains for tier-1 filtering
const WIRE_DOMAINS = [
  'businesswire.com',
  'prnewswire.com',
  'globenewswire.com',
  'accessnewswire.com',
  'einpresswire.com',
]

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: 'pr-wire' | 'sec-edgar' | 'google-news'
  isDeal: boolean
  matchedKeywords: string[]
}

function containsDealKeyword(text: string): { matched: boolean; keywords: string[] } {
  const lower = text.toLowerCase()
  const keywords = DEAL_KEYWORDS.filter(k => lower.includes(k))
  return { matched: keywords.length > 0, keywords }
}

function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; pubDate: string }> = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      ?? block.match(/<title>(.*?)<\/title>/)?.[1]
      ?? ''
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]
      ?? block.match(/<guid>(.*?)<\/guid>/)?.[1]
      ?? ''
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
    if (title) items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim() })
  }
  return items
}

async function fetchGoogleNewsRss(
  query: string,
  wireOnly = false,
): Promise<NewsItem[]> {
  let q = query
  if (wireOnly) {
    const siteFilter = WIRE_DOMAINS.map(d => `site:${d}`).join(' OR ')
    q = `${query} (${siteFilter})`
  }

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ai-infra-tracker/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const rawItems = parseRssItems(xml)

    return rawItems.slice(0, 10).map(item => {
      const { matched, keywords } = containsDealKeyword(item.title)
      const isWire = WIRE_DOMAINS.some(d => item.link.includes(d))
      return {
        ...item,
        source: (wireOnly || isWire ? 'pr-wire' : 'google-news') as NewsItem['source'],
        isDeal: matched,
        matchedKeywords: keywords,
      }
    })
  } catch {
    return []
  }
}

async function fetchSecEdgar(companyName: string): Promise<NewsItem[]> {
  const query = encodeURIComponent(`"${companyName}" AI infrastructure`)
  const url = `https://efts.sec.gov/LATEST/search-index?q=${query}&dateRange=custom&startdt=${
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  }&enddt=${new Date().toISOString().split('T')[0]}&forms=8-K,6-K`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ai-infra-tracker contact@example.com',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json() as {
      hits?: { hits?: Array<{ _source?: { period_of_report?: string; display_names?: string[]; file_date?: string; form_type?: string } }> }
    }
    const hits = data?.hits?.hits ?? []

    return hits.slice(0, 5).map(hit => {
      const src = hit._source ?? {}
      const title = `SEC filing: ${src.display_names?.[0] ?? companyName} — ${src.form_type ?? '8-K'} (${src.file_date ?? ''})`
      const link = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(companyName)}&type=8-K&dateb=&owner=include&count=10`
      const { matched, keywords } = containsDealKeyword(title)
      return {
        title,
        link,
        pubDate: src.file_date ?? '',
        source: 'sec-edgar' as const,
        isDeal: matched,
        matchedKeywords: keywords,
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetch news for a single company using tiered sources.
 * Returns up to 15 items total.
 */
export async function fetchCompanyNews(
  companyName: string,
  ticker: string,
): Promise<NewsItem[]> {
  const searchTerm = `${companyName} AI infrastructure`

  // Tier 1: PR wires
  const wireNews = await fetchGoogleNewsRss(searchTerm, true)

  // Tier 2: SEC EDGAR
  const secNews = await fetchSecEdgar(companyName)

  // Tier 3: General Google News (catch-all)
  const generalNews = await fetchGoogleNewsRss(searchTerm, false)

  // Merge, deduplicate by title
  const seen = new Set<string>()
  const all: NewsItem[] = []
  for (const item of [...wireNews, ...secNews, ...generalNews]) {
    if (!seen.has(item.title)) {
      seen.add(item.title)
      all.push(item)
    }
  }

  return all.slice(0, 15)
}

/**
 * Detect cross-company deals: items mentioning more than one company ticker.
 */
export function detectCrossCompanyDeals(
  allItems: Array<{ ticker: string; item: NewsItem }>,
): Array<{ tickers: string[]; item: NewsItem }> {
  const deals: Array<{ tickers: string[]; item: NewsItem }> = []
  const grouped = new Map<string, string[]>()

  for (const { ticker, item } of allItems) {
    if (item.isDeal) {
      const key = item.title
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(ticker)
    }
  }

  for (const [title, tickers] of grouped) {
    if (tickers.length > 1) {
      const item = allItems.find(a => a.item.title === title)!.item
      deals.push({ tickers: [...new Set(tickers)], item })
    }
  }

  return deals
}
