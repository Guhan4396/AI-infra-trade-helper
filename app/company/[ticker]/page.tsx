'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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

interface CompanyInfo {
  ticker: string
  googleTicker: string
  name: string
  region: string
  tiers: string[]
  tags: string[]
}

function fmt(v: number | null, decimals = 2): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtLarge(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toLocaleString()}`
}

function fmtVol(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(v)
}

function pctStr(v: number | null): string {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function changeClass(v: number | null): string {
  if (v == null) return 'price-flat'
  return v > 0 ? 'price-up' : v < 0 ? 'price-down' : 'price-flat'
}

function pctAbove(price: number | null, ref: number | null): string {
  if (price == null || ref == null || ref === 0) return '—'
  const diff = ((price - ref) / ref) * 100
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs`
}

function rangePosition(price: number | null, low: number | null, high: number | null): number {
  if (price == null || low == null || high == null || high === low) return 50
  return Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100))
}

function volumeRatio(vol: number | null, avg: number | null): string {
  if (vol == null || avg == null || avg === 0) return '—'
  return `${(vol / avg).toFixed(2)}×`
}

export default function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const [ticker, setTicker] = useState<string>('')
  const [data, setData] = useState<{ company: CompanyInfo; price: PriceData } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setTicker(p.ticker))
  }, [params])

  const fetchData = useCallback(async (refresh = false) => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    try {
      const url = `/api/company/${encodeURIComponent(ticker)}${refresh ? '?refresh=1' : ''}`
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      setData(await res.json() as { company: CompanyInfo; price: PriceData })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => { if (ticker) fetchData() }, [ticker, fetchData])

  if (loading) return <div className="loading">Loading {ticker}…</div>
  if (error) return <div className="error-box">{error} <Link href="/signal-dashboard">← back</Link></div>
  if (!data) return null

  const { company, price } = data
  const weight = getWeight(company.tiers[0])
  const label = getLabel(company.tiers[0])
  const volRatio = price.volume != null && price.volumeAvg != null && price.volumeAvg > 0
    ? price.volume / price.volumeAvg : null

  return (
    <>
      {/* Back link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/signal-dashboard" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          ← Signal Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="co-header">
        <div>
          <div className="co-name">{company.name}</div>
          <div className="co-meta">
            <code>{company.ticker}</code>
            <span>{company.googleTicker}</span>
            <span>{company.region}</span>
            {company.tiers.map(t => (
              <span key={t} className={`weight-badge weight-${weight}`}>{t}</span>
            ))}
            <span className="co-source">data: {price.source}</span>
          </div>
        </div>
        <button
          className="btn btn-outline"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
          onClick={() => fetchData(true)}
        >
          Refresh
        </button>
      </div>

      <div className="disclaimer" style={{ marginBottom: '1rem' }}>
        Raw market data only. Nothing on this page is investment advice or a buy/sell/hold recommendation.
      </div>

      {/* Price block */}
      <div className="co-price-block">
        <div className="co-price-main">
          <span className="co-price">${fmt(price.price)}</span>
          <span className={`co-change ${changeClass(price.changePct)}`}>
            {price.change != null ? `${price.change >= 0 ? '+' : ''}${fmt(price.change)}` : '—'}
            {' '}({pctStr(price.changePct)}) today
          </span>
          {price.change5d != null && (
            <span className={`co-change-5d ${changeClass(price.change5d)}`}>
              {pctStr(price.change5d)} 5D
            </span>
          )}
        </div>

        {/* Day range */}
        <div className="co-day-range">
          <div className="co-range-row">
            <span className="co-label">Open</span>
            <span className="co-val">${fmt(price.open)}</span>
            <span className="co-label" style={{ marginLeft: '1.5rem' }}>High</span>
            <span className="co-val price-up">${fmt(price.high)}</span>
            <span className="co-label" style={{ marginLeft: '1.5rem' }}>Low</span>
            <span className="co-val price-down">${fmt(price.low)}</span>
          </div>
        </div>
      </div>

      {/* Volume block — surfaced prominently */}
      <div className="co-section co-vol-block">
        <div className="co-section-title">Volume</div>
        <div className="co-vol-row">
          <div className="co-vol-item">
            <div className="co-vol-label">Today</div>
            <div className="co-vol-value">{fmtVol(price.volume)}</div>
          </div>
          <div className="co-vol-divider">vs</div>
          <div className="co-vol-item">
            <div className="co-vol-label">3-Month Avg</div>
            <div className="co-vol-value">{fmtVol(price.volumeAvg)}</div>
          </div>
          <div className="co-vol-ratio-block">
            <div className="co-vol-label">Ratio</div>
            <div
              className="co-vol-ratio"
              style={{
                color: volRatio == null ? 'var(--text-muted)'
                  : volRatio >= 2 ? 'var(--yellow)'
                  : volRatio >= 1.5 ? 'var(--text)'
                  : 'var(--text-muted)',
              }}
            >
              {volumeRatio(price.volume, price.volumeAvg)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              today ÷ avg
            </div>
          </div>
        </div>
      </div>

      {/* Technicals & 52-week */}
      <div className="co-section">
        <div className="co-section-title">Moving Averages &amp; RSI</div>
        <div className="co-stat-grid">
          <div className="co-stat">
            <div className="co-stat-label">50-Day SMA</div>
            <div className="co-stat-val">${fmt(price.sma50)}</div>
            <div className={`co-stat-sub ${changeClass(price.price != null && price.sma50 != null ? price.price - price.sma50 : null)}`}>
              {pctAbove(price.price, price.sma50)} SMA50
            </div>
          </div>
          <div className="co-stat">
            <div className="co-stat-label">200-Day SMA</div>
            <div className="co-stat-val">${fmt(price.sma200)}</div>
            <div className={`co-stat-sub ${changeClass(price.price != null && price.sma200 != null ? price.price - price.sma200 : null)}`}>
              {pctAbove(price.price, price.sma200)} SMA200
            </div>
          </div>
          <div className="co-stat">
            <div className="co-stat-label">RSI (14)</div>
            <div className="co-stat-val">{price.rsi14 != null ? price.rsi14.toFixed(1) : '—'}</div>
            <div className="co-stat-sub" style={{ color: 'var(--text-muted)' }}>
              {/* No overbought/oversold label — just the raw number */}
              14-day Wilder RSI
            </div>
          </div>
        </div>

        {/* 52-week range visual */}
        <div style={{ marginTop: '1rem' }}>
          <div className="co-stat-label" style={{ marginBottom: '0.4rem' }}>52-Week Range</div>
          <div className="co-52w-row">
            <span className="co-52w-bound price-down">${fmt(price.low52)}</span>
            <div className="co-52w-bar-wrap">
              <div className="co-52w-bar">
                <div
                  className="co-52w-marker"
                  style={{ left: `${rangePosition(price.price, price.low52, price.high52)}%` }}
                  title={`Current: $${fmt(price.price)}`}
                />
              </div>
            </div>
            <span className="co-52w-bound price-up">${fmt(price.high52)}</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
            ▲ current price position within 52-week range
          </div>
        </div>
      </div>

      {/* Fundamentals */}
      <div className="co-section">
        <div className="co-section-title">Fundamentals</div>
        <div className="co-stat-grid co-stat-grid-wide">
          <div className="co-stat">
            <div className="co-stat-label">Market Cap</div>
            <div className="co-stat-val">{fmtLarge(price.marketCap)}</div>
          </div>
          <div className="co-stat">
            <div className="co-stat-label">P/E (TTM)</div>
            <div className="co-stat-val">{fmt(price.pe)}</div>
          </div>
          <div className="co-stat">
            <div className="co-stat-label">EPS (TTM)</div>
            <div className="co-stat-val">{price.eps != null ? `$${fmt(price.eps)}` : '—'}</div>
          </div>
          <div className="co-stat">
            <div className="co-stat-label">Beta</div>
            <div className="co-stat-val">{fmt(price.beta)}</div>
          </div>
          <div className="co-stat">
            <div className="co-stat-label">Chokepoint</div>
            <div className="co-stat-val">
              <span className={`weight-badge weight-${weight}`}>{label} ({weight}/5)</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          Tags: {company.tags.join(', ') || '—'}
        </div>
        {/* PEG ratio intentionally omitted: GOOGLEFINANCE has no earnings-growth
            attribute and Yahoo Finance chart endpoint does not expose forward EPS.
            Computing PEG from these sources would produce an ungrounded number. */}
      </div>
    </>
  )
}
