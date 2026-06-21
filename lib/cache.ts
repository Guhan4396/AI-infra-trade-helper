/**
 * Module-level in-memory deal flag cache.
 * Resets on Vercel cold start — acceptable for daily cron workflow.
 * Never persisted to disk; never calls any external API.
 */

interface DealFlag {
  ticker: string
  headline: string
  source: string
  detectedAt: string
  keywords: string[]
}

interface CacheStore {
  dealFlags: DealFlag[]
  lastCronRun: string | null
  lastCronStatus: 'ok' | 'error' | null
}

const store: CacheStore = {
  dealFlags: [],
  lastCronRun: null,
  lastCronStatus: null,
}

export function addDealFlag(flag: DealFlag): void {
  // Deduplicate by ticker + headline
  const exists = store.dealFlags.some(
    f => f.ticker === flag.ticker && f.headline === flag.headline
  )
  if (!exists) {
    store.dealFlags.push(flag)
    // Keep last 200 flags max
    if (store.dealFlags.length > 200) {
      store.dealFlags = store.dealFlags.slice(-200)
    }
  }
}

export function getDealFlags(): DealFlag[] {
  return store.dealFlags
}

export function getRecentDealFlags(hours = 24): DealFlag[] {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  return store.dealFlags.filter(f => f.detectedAt >= cutoff)
}

export function setLastCronRun(status: 'ok' | 'error'): void {
  store.lastCronRun = new Date().toISOString()
  store.lastCronStatus = status
}

export function getLastCronRun(): { at: string | null; status: 'ok' | 'error' | null } {
  return { at: store.lastCronRun, status: store.lastCronStatus }
}
