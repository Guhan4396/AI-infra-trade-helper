'use client'

import { useState, useEffect } from 'react'

interface ResearchEntry {
  id: string
  query: string
  result: string
  model: string
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCostUsd: number
  timestamp: string
  sources?: string[]
}

const INPUT_PRICE_PER_MTOK = 5.0
const OUTPUT_PRICE_PER_MTOK = 25.0
const AVG_CHARS_PER_TOKEN = 4

function estimateCost(query: string): {
  inputTok: number
  outputTok: number
  costUsd: number
} {
  // System prompt (~300 tok) + query + web search context estimate (~2000 tok)
  const inputTok = Math.ceil((300 + query.length / AVG_CHARS_PER_TOKEN + 2000))
  const outputTok = 1000 // conservative output estimate
  const costUsd = (inputTok / 1_000_000) * INPUT_PRICE_PER_MTOK
    + (outputTok / 1_000_000) * OUTPUT_PRICE_PER_MTOK
  return { inputTok, outputTok, costUsd }
}

export default function ResearchToolPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResearchEntry | null>(null)
  const [history, setHistory] = useState<ResearchEntry[]>([])

  const estimate = query.trim() ? estimateCost(query) : null

  useEffect(() => {
    fetch('/api/research?history=1')
      .then(r => r.ok ? r.json() : null)
      .then((data: { history?: ResearchEntry[] } | null) => {
        if (data?.history) setHistory(data.history)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })

      const data = await res.json() as ResearchEntry & { error?: string }
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`)
        return
      }

      setResult(data)
      setHistory(prev => [data, ...prev].slice(0, 20))
      setQuery('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>AI Research Tool</h1>
        <p>
          On-demand research using Claude with live web search. Results are saved to research-suggestions.json.
        </p>
      </div>

      <div className="disclaimer">
        <strong>ON-DEMAND ONLY</strong> — this tool calls the Anthropic API and incurs cost with each use.
        It is never triggered automatically. Results are <strong>raw research output</strong> and must not be
        interpreted as investment advice. The AI does not have access to your portfolio.
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">New Research Query</div>
        <form className="research-form" onSubmit={handleSubmit}>
          <textarea
            className="research-textarea"
            placeholder="e.g. What new AI chip partnerships has TSMC announced in the last 30 days? Focus on CoWoS capacity deals."
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={loading}
            rows={4}
          />

          {estimate && (
            <div className="cost-estimate">
              ⚠ Estimated cost: ~${estimate.costUsd.toFixed(4)} USD
              ({estimate.inputTok.toLocaleString()} input tokens + {estimate.outputTok.toLocaleString()} output tokens · claude-opus-4-8)
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!query.trim() || loading}
            >
              {loading ? 'Researching…' : 'Run Research'}
            </button>
            {loading && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>
                This may take 20–60 seconds…
              </span>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">Result</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Query: {result.query} ·&nbsp;
            Cost: ${result.estimatedCostUsd?.toFixed(4)} ·&nbsp;
            {new Date(result.timestamp).toLocaleString()}
          </div>
          <div className="research-result">{result.result}</div>
          {result.sources && result.sources.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Sources used:</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {result.sources.map((src, i) => (
                  <li key={i} style={{ fontSize: '0.72rem' }}>
                    <a href={src} target="_blank" rel="noopener noreferrer">{src}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Research History</div>
          <div className="research-history">
            {history.map(entry => (
              <div key={entry.id} className="history-item">
                <div className="history-query">
                  <strong>{entry.query}</strong>
                  <span style={{ float: 'right', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    {new Date(entry.timestamp).toLocaleString()} · ${entry.estimatedCostUsd?.toFixed(4)}
                  </span>
                </div>
                <div className="history-result">{entry.result}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
