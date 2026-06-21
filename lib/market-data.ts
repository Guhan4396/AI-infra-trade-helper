/**
 * Market data fetcher — NO LLM/AI calls.
 * Primary:  Google Sheets (GOOGLEFINANCE formulas via service account)
 * Fallback: Yahoo Finance unofficial chart endpoint (per-ticker graceful failure)
 */

export interface PriceData {
  ticker: string
  price: number | null
  change1d: number | null   // percentage
  change5d: number | null   // percentage
  volume: number | null
  source: 'google-sheets' | 'yahoo-finance' | 'unavailable'
  error?: string
}

// ─── Yahoo Finance fallback ────────────────────────────────────────────────

async function fetchYahooPrice(ticker: string): Promise<PriceData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=10d`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      return { ticker, price: null, change1d: null, change5d: null, volume: null, source: 'unavailable', error: `HTTP ${res.status}` }
    }

    const data = await res.json() as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; previousClose?: number; regularMarketVolume?: number }
          timestamp?: number[]
          indicators?: { quote?: Array<{ close?: (number | null)[]; volume?: (number | null)[] }> }
        }>
        error?: { message?: string }
      }
    }

    const result = data?.chart?.result?.[0]
    if (!result) {
      return { ticker, price: null, change1d: null, change5d: null, volume: null, source: 'unavailable', error: 'No data' }
    }

    const meta = result.meta ?? {}
    const closes = result.indicators?.quote?.[0]?.close ?? []
    const volumes = result.indicators?.quote?.[0]?.volume ?? []

    const price = meta.regularMarketPrice ?? closes[closes.length - 1] ?? null
    const prevClose = meta.previousClose ?? closes[closes.length - 2] ?? null
    const volume = meta.regularMarketVolume ?? volumes[volumes.length - 1] ?? null

    const change1d = price != null && prevClose != null && prevClose !== 0
      ? ((price - prevClose) / prevClose) * 100
      : null

    // 5-day: compare last close vs close 5 bars ago
    const validCloses = closes.filter((c): c is number => c != null)
    const change5d = validCloses.length >= 2
      ? ((validCloses[validCloses.length - 1] - validCloses[Math.max(0, validCloses.length - 6)]) /
          validCloses[Math.max(0, validCloses.length - 6)]) * 100
      : null

    return { ticker, price, change1d, change5d, volume, source: 'yahoo-finance' }
  } catch (err) {
    return {
      ticker,
      price: null,
      change1d: null,
      change5d: null,
      volume: null,
      source: 'unavailable',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Google Sheets primary ────────────────────────────────────────────────

function parseSheetNumber(val: unknown): number | null {
  if (val == null || val === '' || val === 'N/A') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

async function fetchSheetsData(tickers: string[]): Promise<Map<string, PriceData>> {
  const results = new Map<string, PriceData>()

  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const tabName = process.env.GOOGLE_SHEETS_TAB_NAME ?? 'Prices'

  if (!keyB64 || !spreadsheetId) return results

  try {
    // Dynamic import to avoid bundling googleapis in client
    const { google } = await import('googleapis')

    const keyJson = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'))
    const auth = new google.auth.GoogleAuth({
      credentials: keyJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A:F`,
    })

    const rows = response.data.values ?? []
    // Expected columns: ticker | googleTicker | price | change1d% | change5d% | volume
    for (const row of rows.slice(1)) {
      const ticker = String(row[0] ?? '').trim()
      if (!ticker || !tickers.includes(ticker)) continue

      results.set(ticker, {
        ticker,
        price: parseSheetNumber(row[2]),
        change1d: parseSheetNumber(row[3]),
        change5d: parseSheetNumber(row[4]),
        volume: parseSheetNumber(row[5]),
        source: 'google-sheets',
      })
    }
  } catch (err) {
    console.error('[market-data] Google Sheets error:', err)
  }

  return results
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Fetch price data for a list of tickers.
 * Uses Google Sheets if configured, falls back to Yahoo Finance per ticker.
 */
export async function fetchMarketData(tickers: string[]): Promise<PriceData[]> {
  // Try Sheets first
  const sheetsData = await fetchSheetsData(tickers)

  // Find tickers not covered by Sheets
  const missing = tickers.filter(t => !sheetsData.has(t))

  // Fetch missing via Yahoo Finance in parallel (graceful per-ticker failure)
  const yahooResults = await Promise.all(missing.map(t => fetchYahooPrice(t)))

  const combined: PriceData[] = []
  for (const ticker of tickers) {
    const fromSheets = sheetsData.get(ticker)
    if (fromSheets) {
      combined.push(fromSheets)
    } else {
      const fromYahoo = yahooResults.find(r => r.ticker === ticker)
      combined.push(fromYahoo ?? { ticker, price: null, change1d: null, change5d: null, volume: null, source: 'unavailable' })
    }
  }

  return combined
}
