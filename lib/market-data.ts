/**
 * Market data fetcher — NO LLM/AI calls.
 * Primary:  Google Sheets (GOOGLEFINANCE formulas via service account)
 * Fallback: Yahoo Finance unofficial chart endpoint (per-ticker graceful failure)
 *
 * Google Sheets expected columns A–P:
 *   A:ticker  B:googleTicker  C:price  D:change  E:changepct
 *   F:open    G:high          H:low    I:volume  J:volumeavg
 *   K:marketcap  L:pe  M:eps  N:high52  O:low52  P:beta
 *
 * SMA50, SMA200, RSI14 are NOT available from GOOGLEFINANCE — they are
 * always computed from Yahoo Finance historical series and cached in
 * lib/technicals.ts. See that file for the no-PEG-ratio note.
 */

import { computeSMA, computeRSI, getCached, setCached } from './technicals'

export interface PriceData {
  ticker: string
  // Current quote
  price: number | null
  change: number | null       // absolute day change
  changePct: number | null    // day change %
  change5d: number | null     // 5-day % (computed from historical series)
  // Day range
  open: number | null
  high: number | null
  low: number | null
  // Volume — show these side-by-side; the ratio is the signal
  volume: number | null
  volumeAvg: number | null    // 3-month average daily volume
  // Fundamentals
  marketCap: number | null
  pe: number | null
  eps: number | null
  // 52-week range
  high52: number | null
  low52: number | null
  // Risk
  beta: number | null
  // Technicals (computed from historical series, cached 6h)
  sma50: number | null
  sma200: number | null
  rsi14: number | null
  // Meta
  source: 'google-sheets' | 'yahoo-finance' | 'unavailable'
  error?: string
}

// ─── Yahoo ticker conversion ───────────────────────────────────────────────
//
// Our googleTicker format (e.g. "TYO:9984") differs from Yahoo Finance format
// ("9984.T"). Map exchange prefix → Yahoo suffix.
//
// Coverage notes for the Yahoo Finance chart endpoint meta fields:
//   US (NASDAQ/NYSE):   Full — price, OHLCV, volumeAvg, 52w, PE, EPS, marketCap, beta, SMA50, SMA200
//   Hong Kong (HKEX):   Good — price/OHLCV/52w reliable; PE/EPS/beta patchy
//   Taiwan (TPE):       Price/OHLCV reliable; PE/EPS/volumeAvg/beta often null
//   Japan (TYO):        Price/OHLCV reliable; PE/EPS often null; SMA pre-computed usually present
//   Korea (KRX):        Price/OHLCV reliable; PE/EPS/beta often null
//   EU Amsterdam (AMS): Price reliable; volumeAvg/beta often null
//   EU Frankfurt (ETR): Price reliable; volumeAvg/beta often null
//   EU Paris (EPA):     Price reliable; volumeAvg/beta patchy
//   EU London (LON):    Price reliable; volumeAvg/beta patchy
//   EU Stockholm (STO): Price reliable; most fundamentals null
//   OTC:                Price usually available; fundamentals very patchy

const EXCHANGE_MAP: Record<string, (symbol: string) => string> = {
  'NASDAQ': s => s,
  'NYSE':   s => s,
  'HKEX':  s => `${s}.HK`,
  'TYO':   s => `${s}.T`,
  'KRX':   s => `${s}.KS`,
  'TPE':   s => `${s}.TW`,
  'AMS':   s => `${s}.AS`,
  'ETR':   s => `${s}.DE`,
  'EPA':   s => `${s}.PA`,
  'LON':   s => `${s}.L`,
  'STO':   s => `${s}.ST`,
  'OTC':   s => s,
}

export function toYahooTicker(googleTicker: string): string {
  const [exchange, symbol] = googleTicker.split(':')
  const converter = EXCHANGE_MAP[exchange]
  return converter ? converter(symbol) : symbol ?? googleTicker
}

// ─── Yahoo Finance fetch ───────────────────────────────────────────────────

const EMPTY: Omit<PriceData, 'ticker' | 'source'> = {
  price: null, change: null, changePct: null, change5d: null,
  open: null, high: null, low: null,
  volume: null, volumeAvg: null,
  marketCap: null, pe: null, eps: null,
  high52: null, low52: null, beta: null,
  sma50: null, sma200: null, rsi14: null,
}

interface YahooMeta {
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketOpen?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketVolume?: number
  averageDailyVolume3Month?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  fiftyDayAverage?: number
  twoHundredDayAverage?: number
  trailingPE?: number
  epsTrailingTwelveMonths?: number
  marketCap?: number
  beta?: number
  previousClose?: number
}

async function fetchYahooExtended(
  ticker: string,
  yahooTicker: string,
): Promise<PriceData> {
  // 60 days: enough for 5d change, RSI14, and SMA50 validation.
  // SMA50 and SMA200 are also pre-computed in Yahoo's meta.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=60d&includePrePost=false`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return { ticker, ...EMPTY, source: 'unavailable', error: `HTTP ${res.status}` }
    }

    const data = await res.json() as {
      chart?: {
        result?: Array<{
          meta?: YahooMeta
          indicators?: { quote?: Array<{ close?: (number | null)[] }> }
        }>
      }
    }

    const result = data?.chart?.result?.[0]
    if (!result) {
      return { ticker, ...EMPTY, source: 'unavailable', error: 'No data' }
    }

    const m = (result.meta ?? {}) as YahooMeta
    const rawCloses = result.indicators?.quote?.[0]?.close ?? []
    const closes = rawCloses.filter((c): c is number => c != null)

    const price = m.regularMarketPrice ?? null
    const prevClose = m.previousClose ?? (closes.length >= 2 ? closes[closes.length - 2] : null)

    const change = m.regularMarketChange
      ?? (price != null && prevClose != null ? price - prevClose : null)

    const changePct = m.regularMarketChangePercent
      ?? (price != null && prevClose != null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null)

    const change5d = (() => {
      if (closes.length < 2) return null
      const last = closes[closes.length - 1]
      const ref = closes[Math.max(0, closes.length - 6)]
      return ref !== 0 ? ((last - ref) / ref) * 100 : null
    })()

    // SMA from Yahoo pre-computed values (reliable for most markets)
    const smaFromMeta50 = m.fiftyDayAverage ?? null
    const smaFromMeta200 = m.twoHundredDayAverage ?? null

    // Compute RSI14 from historical series; cache it
    let rsi14: number | null = null
    const cached = getCached(ticker)
    if (cached) {
      rsi14 = cached.rsi14
    } else {
      rsi14 = computeRSI(closes, 14)
      setCached(ticker, {
        sma50: smaFromMeta50 ?? computeSMA(closes, 50),
        sma200: smaFromMeta200 ?? computeSMA(closes, 200),
        rsi14,
      })
    }

    return {
      ticker,
      price,
      change,
      changePct,
      change5d,
      open:      m.regularMarketOpen ?? null,
      high:      m.regularMarketDayHigh ?? null,
      low:       m.regularMarketDayLow ?? null,
      volume:    m.regularMarketVolume ?? null,
      volumeAvg: m.averageDailyVolume3Month ?? null,
      marketCap: m.marketCap ?? null,
      pe:        m.trailingPE ?? null,
      eps:       m.epsTrailingTwelveMonths ?? null,
      high52:    m.fiftyTwoWeekHigh ?? null,
      low52:     m.fiftyTwoWeekLow ?? null,
      beta:      m.beta ?? null,
      sma50:     smaFromMeta50 ?? computeSMA(closes, 50),
      sma200:    smaFromMeta200 ?? null,  // need 200 days; meta value used
      rsi14:     cached?.rsi14 ?? rsi14,
      source:    'yahoo-finance',
    }
  } catch (err) {
    return {
      ticker,
      ...EMPTY,
      source: 'unavailable',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Google Sheets primary ────────────────────────────────────────────────

function parseSheetNumber(val: unknown): number | null {
  if (val == null || val === '' || val === 'N/A' || val === '#N/A') return null
  const n = Number(String(val).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

async function fetchSheetsData(
  companies: Array<{ ticker: string; googleTicker: string }>,
): Promise<Map<string, PriceData>> {
  const results = new Map<string, PriceData>()

  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const tabName = process.env.GOOGLE_SHEETS_TAB_NAME ?? 'Prices'

  if (!keyB64 || !spreadsheetId) return results

  try {
    const { google } = await import('googleapis')
    const keyJson = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'))
    const auth = new google.auth.GoogleAuth({
      credentials: keyJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A:P`,   // Expanded: A-P covers all new columns
    })

    const tickers = new Set(companies.map(c => c.ticker))
    const rows = response.data.values ?? []
    // Columns: ticker|googleTicker|price|change|changepct|open|high|low|
    //          volume|volumeavg|marketcap|pe|eps|high52|low52|beta
    for (const row of rows.slice(1)) {
      const ticker = String(row[0] ?? '').trim()
      if (!ticker || !tickers.has(ticker)) continue

      const cached = getCached(ticker)
      results.set(ticker, {
        ticker,
        price:     parseSheetNumber(row[2]),
        change:    parseSheetNumber(row[3]),
        changePct: parseSheetNumber(row[4]),
        change5d:  null,  // Not a GOOGLEFINANCE attribute; always from Yahoo series
        open:      parseSheetNumber(row[5]),
        high:      parseSheetNumber(row[6]),
        low:       parseSheetNumber(row[7]),
        volume:    parseSheetNumber(row[8]),
        volumeAvg: parseSheetNumber(row[9]),
        marketCap: parseSheetNumber(row[10]),
        pe:        parseSheetNumber(row[11]),
        eps:       parseSheetNumber(row[12]),
        high52:    parseSheetNumber(row[13]),
        low52:     parseSheetNumber(row[14]),
        beta:      parseSheetNumber(row[15]),
        // Technicals always from Yahoo/cache — GOOGLEFINANCE has no SMA/RSI
        sma50:     cached?.sma50 ?? null,
        sma200:    cached?.sma200 ?? null,
        rsi14:     cached?.rsi14 ?? null,
        source:    'google-sheets',
      })
    }
  } catch (err) {
    console.error('[market-data] Google Sheets error:', err)
  }

  return results
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Fetch price data for a list of companies.
 * Uses Google Sheets if configured, falls back to Yahoo Finance per ticker.
 * All fields default to null on failure — never throws.
 */
export async function fetchMarketData(
  companies: Array<{ ticker: string; googleTicker: string }>,
): Promise<PriceData[]> {
  const sheetsData = await fetchSheetsData(companies)

  const missing = companies.filter(c => !sheetsData.has(c.ticker))

  // Fetch missing via Yahoo in parallel (graceful per-ticker failure)
  const yahooResults = await Promise.all(
    missing.map(c => fetchYahooExtended(c.ticker, toYahooTicker(c.googleTicker)))
  )

  return companies.map(c => {
    return sheetsData.get(c.ticker)
      ?? yahooResults.find(r => r.ticker === c.ticker)
      ?? { ticker: c.ticker, ...EMPTY, source: 'unavailable' }
  })
}

/**
 * Fetch full data for a single ticker (used by company detail page).
 * Always fetches fresh from Yahoo to ensure RSI/SMA are current.
 * Invalidates and rewrites the technicals cache for this ticker.
 */
export async function fetchSingleTicker(
  ticker: string,
  googleTicker: string,
  forceRefresh = false,
): Promise<PriceData> {
  if (forceRefresh) {
    const { invalidateCache } = await import('./technicals')
    invalidateCache(ticker)
  }
  return fetchYahooExtended(ticker, toYahooTicker(googleTicker))
}
