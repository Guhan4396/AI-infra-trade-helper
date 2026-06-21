'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { COMPANIES, TIERS } from '@/lib/companies'
import { getWeight, getLabel } from '@/lib/chokepoint-weights'

interface PriceData {
  ticker: string
  price: number | null
  change: number | null
  changePct: number | null
  change5d: number | null
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
  volumeAvg: number | null
  marketCap: number | null
  pe: number | null
  eps: number | null
  high52: number | null
  low52: number | null
  beta: number | null
  sma50: number | null
  sma200: number | null
  rsi14: number | null
  source: string
}

interface DealFlag {
  ticker: string
  headline: string
  source: string
  detectedAt: string
  keywords: string[]
}

function fmt(v: number | null, d = 2): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

function pct(v: number | null): string {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function pctClass(v: number | null): string {
  if (v == null) return 'price-flat'
  return v > 0 ? 'price-up' : v < 0 ? 'price-down' : 'price-flat'
}

function fmtCap(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `${(v / 1e6).toFixed(1)}M`
  return String(v)
}

function fmtVol(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(v)
}

function volRatioDisplay(vol: number | null, avg: number | null): { text: string; highlight: boolean } {
  if (vol == null || avg == null || avg === 0) return { text: '—', highlight: false }
  const r = vol / avg
  return { text: `${r.toFixed(2)}×`, highlight: r >= 2 }
}

type SortKey = 'weight' | 'name' | 'changePct' | 'change5d' | 'volumeRatio'

export default function SignalDashboardPage() {
  const [prices, setPrices] = useState<PriceData[]>([])
  const [dealFlags, setDealFlags] = useState<DealFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortKey>('weight')

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

  // Deduplicate companies by ticker
  const seen = new Set<string>()
  const rows: Array<{ ticker: string; name: string; region: string; tier: string; weight: number }> = []
  for (const c of COMPANIES) {
    if (seen.has(c.ticker)) continue
    seen.add(c.ticker)
    rows.push({ ticker: c.ticker, name: c.name, region: c.region, tier: c.tier, weight: getWeight(c.tier) })
  }

  const filtered = tierFilter === 'all' ? rows : rows.filter(r => r.tier === tierFilter)

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'weight') return b.weight - a.weight
    if (sortBy === 'name')   return a.name.localeCompare(b.name)
    const pa = priceMap.get(a.ticker)
    const pb = priceMap.get(b.ticker)
    if (sortBy === 'changePct') {
      const va = pa?.changePct ?? null
      const vb = pb?.changePct ?? null
      if (va == null && vb == null) return 0
      return (vb ?? -Infinity) - (va ?? -Infinity)
    }
    if (sortBy === 'change5d') {
      const va = pa?.change5d ?? null
      const vb = pb?.change5d ?? null
      return (vb ?? -Infinity) - (va ?? -Infinity)
    }
    if (sortBy === 'volumeRatio') {
      const ra = pa?.volume != null && pa?.volumeAvg ? pa.volume / pa.volumeAvg : 0
      const rb = pb?.volume != null && pb?.volumeAvg ? pb.volume / pb.volumeAvg : 0
      return rb - ra
    }
    return 0
  })

  return (
    <>
      <div className="page-header">
        <h1>Signal Dashboard</h1>
        <p>Price and market data from Google Sheets (primary) or Yahoo Finance (fallback). Click any row to open the full company view.</p>
      </div>

      <div className="disclaimer">
        <strong>For information only.</strong> All figures are raw data points.
        This dashboard <strong>never synthesizes</strong> these into buy/sell/hold recommendations.
        Nothing here constitutes investment advice.
      </div>

      <div className="filter-row">
        <select className="filter-select" value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
          <option value="all">All Tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}>
          <option value="weight">Sort: Chokepoint Weight</option>
          <option value="changePct">Sort: Day Change %</option>
          <option value="change5d">Sort: 5-Day Change</option>
          <option value="volumeRatio">Sort: Volume Ratio</option>
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
                <th>Chokepoint</th>
                <th>Price</th>
                <th>Change</th>
                <th>1D %</th>
                <th>5D %</th>
                <th style={{ whiteSpace: 'nowrap' }}>Day Range</th>
                <th>Volume</th>
                <th style={{ whiteSpace: 'nowrap', color: 'var(--yellow)' }}>Vol/Avg ↑</th>
                <th>Mkt Cap</th>
                <th>P/E</th>
                <th>Beta</th>
                <th>SMA50</th>
                <th>SMA200</th>
                <th style={{ whiteSpace: 'nowrap' }}>52W L–H</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const p = priceMap.get(row.ticker)
                const flags = flagMap.get(row.ticker) ?? []
                const { text: volRatio, highlight: volHi } = volRatioDisplay(p?.volume ?? null, p?.volumeAvg ?? null)
                return (
                  <tr
                    key={row.ticker}
                    style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = `/company/${row.ticker}`}
                  >
                    <td>
                      <Link
                        href={`/company/${row.ticker}`}
                        style={{ fontWeight: 500, color: 'var(--text)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {row.name}
                      </Link>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{row.region}</div>
                    </td>
                    <td><code style={{ fontSize: '0.72rem' }}>{row.ticker}</code></td>
                    <td>
                      <span className={`weight-badge weight-${row.weight}`}>
                        {getLabel(row.tier)} ({row.weight})
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                      {p?.price != null ? `$${fmt(p.price)}` : '—'}
                    </td>
                    <td className={pctClass(p?.changePct ?? null)} style={{ fontFamily: 'monospace' }}>
                      {p?.change != null ? `${p.change >= 0 ? '+' : ''}${fmt(p.change)}` : '—'}
                    </td>
                    <td className={pctClass(p?.changePct ?? null)}>{pct(p?.changePct ?? null)}</td>
                    <td className={pctClass(p?.change5d ?? null)}>{pct(p?.change5d ?? null)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {p?.low != null && p?.high != null
                        ? <span><span className="price-down">{fmt(p.low)}</span>–<span className="price-up">{fmt(p.high)}</span></span>
                        : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {fmtVol(p?.volume ?? null)}
                    </td>
                    <td
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        fontWeight: volHi ? 700 : 400,
                        color: volHi ? 'var(--yellow)' : 'var(--text-muted)',
                      }}
                    >
                      {volRatio}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {fmtCap(p?.marketCap ?? null)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {fmt(p?.pe ?? null, 1)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {fmt(p?.beta ?? null, 2)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {p?.sma50 != null ? `$${fmt(p.sma50, 0)}` : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {p?.sma200 != null ? `$${fmt(p.sma200, 0)}` : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {p?.low52 != null && p?.high52 != null
                        ? `${fmt(p.low52, 0)}–${fmt(p.high52, 0)}`
                        : '—'}
                    </td>
                    <td>
                      {flags.length > 0 ? (
                        <span className="badge badge-deal" title={flags.map(f => f.headline).join('\n')}>
                          {flags.length}
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
                  <Link href={`/company/${f.ticker}`}>
                    <code style={{ fontSize: '0.75rem', color: 'var(--accent-hover)' }}>{f.ticker}</code>
                  </Link>
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
