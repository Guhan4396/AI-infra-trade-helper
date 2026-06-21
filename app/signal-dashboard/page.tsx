'use client'

import { useState, useEffect, useCallback } from 'react'
import { COMPANIES, TIERS } from '@/lib/companies'
import { getWeight, getLabel } from '@/lib/chokepoint-weights'

interface PriceData {
  ticker: string
  price: number | null
  change1d: number | null
  change5d: number | null
  volume: number | null
  source: string
  error?: string
}

interface DealFlag {
  ticker: string
  headline: string
  source: string
  detectedAt: string
  keywords: string[]
}

const UNIQUE_TICKERS = [...new Set(COMPANIES.map(c => c.ticker))]

function pct(v: number | null): string {
  if (v == null) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

function pctClass(v: number | null): string {
  if (v == null) return 'price-flat'
  if (v > 0) return 'price-up'
  if (v < 0) return 'price-down'
  return 'price-flat'
}

function fmtPrice(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtVol(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

export default function SignalDashboardPage() {
  const [prices, setPrices] = useState<PriceData[]>([])
  const [dealFlags, setDealFlags] = useState<DealFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'change1d' | 'change5d' | 'weight'>('weight')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/market-data')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { prices: PriceData[]; dealFlags: DealFlag[] }
      setPrices(data.prices ?? [])
      setDealFlags(data.dealFlags ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load market data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const priceMap = new Map(prices.map(p => [p.ticker, p]))
  const flagMap = new Map<string, DealFlag[]>()
  for (const f of dealFlags) {
    if (!flagMap.has(f.ticker)) flagMap.set(f.ticker, [])
    flagMap.get(f.ticker)!.push(f)
  }

  // Build rows: deduplicated by ticker, attach tier info from first match
  const seen = new Set<string>()
  const rows: Array<{
    ticker: string; name: string; region: string; tier: string; weight: number
  }> = []
  for (const c of COMPANIES) {
    if (seen.has(c.ticker)) continue
    seen.add(c.ticker)
    rows.push({
      ticker: c.ticker,
      name: c.name,
      region: c.region,
      tier: c.tier,
      weight: getWeight(c.tier),
    })
  }

  const filtered = tierFilter === 'all' ? rows : rows.filter(r => r.tier === tierFilter)

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'weight') return b.weight - a.weight
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    const pa = priceMap.get(a.ticker)
    const pb = priceMap.get(b.ticker)
    const va = sortBy === 'change1d' ? (pa?.change1d ?? null) : (pa?.change5d ?? null)
    const vb = sortBy === 'change1d' ? (pb?.change1d ?? null) : (pb?.change5d ?? null)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return vb - va
  })

  return (
    <>
      <div className="page-header">
        <h1>Signal Dashboard</h1>
        <p>
          Price and volume from Google Sheets (primary) or Yahoo Finance (fallback). Deal flags from daily cron.
        </p>
      </div>

      <div className="disclaimer">
        <strong>For information only.</strong> Price, volume, and deal signals are raw data points.
        This dashboard <strong>never synthesizes</strong> these into buy/sell/hold recommendations.
        Nothing here constitutes investment advice.
      </div>

      <div className="filter-row">
        <select
          className="filter-select"
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
        >
          <option value="all">All Tiers</option>
          {TIERS.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="weight">Sort: Chokepoint Weight</option>
          <option value="change1d">Sort: 1-Day Change</option>
          <option value="change5d">Sort: 5-Day Change</option>
          <option value="name">Sort: Name</option>
        </select>

        <button className="btn btn-outline" onClick={fetchData} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="loading">Loading market data…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="signal-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Ticker</th>
                <th>Tier</th>
                <th>Chokepoint</th>
                <th>Price</th>
                <th>1D %</th>
                <th>5D %</th>
                <th>Volume</th>
                <th>Source</th>
                <th>Deal Flags</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const price = priceMap.get(row.ticker)
                const flags = flagMap.get(row.ticker) ?? []
                return (
                  <tr key={row.ticker}>
                    <td style={{ fontWeight: 500 }}>{row.name}</td>
                    <td><code style={{ fontSize: '0.75rem' }}>{row.ticker}</code></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{row.tier}</td>
                    <td>
                      <span className={`weight-badge weight-${row.weight}`}>
                        {getLabel(row.tier)} ({row.weight})
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{fmtPrice(price?.price ?? null)}</td>
                    <td className={pctClass(price?.change1d ?? null)}>{pct(price?.change1d ?? null)}</td>
                    <td className={pctClass(price?.change5d ?? null)}>{pct(price?.change5d ?? null)}</td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{fmtVol(price?.volume ?? null)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{price?.source ?? '—'}</td>
                    <td>
                      {flags.length > 0 ? (
                        <span className="badge badge-deal" title={flags.map(f => f.headline).join('\n')}>
                          {flags.length} flag{flags.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {dealFlags.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Recent Deal Flags</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {dealFlags.slice(0, 20).map((f, i) => (
              <div key={i} className="card" style={{ padding: '0.6rem 0.9rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <code style={{ fontSize: '0.75rem', color: 'var(--accent-hover)', flexShrink: 0 }}>{f.ticker}</code>
                  <span style={{ fontSize: '0.8rem', flex: 1 }}>{f.headline}</span>
                  <span className={`badge badge-${f.source === 'sec-edgar' ? 'sec' : f.source === 'pr-wire' ? 'wire' : 'deal'}`}>
                    {f.source}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {new Date(f.detectedAt).toLocaleString()} · keywords: {f.keywords.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
