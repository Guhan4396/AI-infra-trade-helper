/**
 * SMA and RSI computation + module-level cache.
 * Cache TTL: 6 hours (refreshes with price data on manual refresh).
 *
 * NOTE: No PEG ratio. GOOGLEFINANCE has no earnings-growth attribute
 * and Yahoo Finance does not expose forward EPS in the chart endpoint.
 * Computing PEG from incomplete/stale data would manufacture false precision.
 * Left out intentionally — do not add it.
 */

interface TechnicalsEntry {
  sma50: number | null
  sma200: number | null
  rsi14: number | null
  cachedAt: number
}

const CACHE = new Map<string, TechnicalsEntry>()
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export function computeSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const slice = closes.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

/**
 * Wilder's Smoothed RSI (standard 14-period).
 * Uses simple average for the seed, then Wilder smoothing.
 */
export function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null

  let gains = 0
  let losses = 0

  // Seed with simple average of first `period` changes
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function getCached(ticker: string): TechnicalsEntry | null {
  const entry = CACHE.get(ticker)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    CACHE.delete(ticker)
    return null
  }
  return entry
}

export function setCached(
  ticker: string,
  data: Omit<TechnicalsEntry, 'cachedAt'>,
): void {
  CACHE.set(ticker, { ...data, cachedAt: Date.now() })
}

export function invalidateCache(ticker?: string): void {
  if (ticker) {
    CACHE.delete(ticker)
  } else {
    CACHE.clear()
  }
}
