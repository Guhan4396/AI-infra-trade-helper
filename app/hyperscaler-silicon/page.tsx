import { HYPERSCALER_SILICON } from '@/lib/hyperscaler-silicon'

const COMPANY_ORDER = ['GOOGL', 'AMZN', 'META', 'MSFT']
const COMPANY_NAMES: Record<string, string> = {
  GOOGL: 'Google',
  AMZN: 'Amazon AWS',
  META: 'Meta',
  MSFT: 'Microsoft',
}

export default function HyperscalerSiliconPage() {
  return (
    <>
      <div className="page-header">
        <h1>Hyperscaler Custom Silicon</h1>
        <p>
          Custom AI chips from hyperscalers mapped to their design, foundry, and packaging partners.
        </p>
      </div>

      <div className="disclaimer">
        <strong>Signal only.</strong> Partner relationships are based on public disclosures and industry reporting.
        Nothing here constitutes investment advice or a recommendation to buy, sell, or hold any security.
      </div>

      {COMPANY_ORDER.map(companyTicker => {
        const programs = HYPERSCALER_SILICON.filter(p => p.companyTicker === companyTicker)
        if (!programs.length) return null
        return (
          <div key={companyTicker} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--accent-hover)' }}>
              {COMPANY_NAMES[companyTicker]}
            </h2>
            <div className="silicon-grid">
              {programs.map((prog, i) => (
                <div key={i} className="silicon-card">
                  <div className="silicon-company">{prog.company} · {prog.companyTicker}</div>
                  <div className="silicon-program">{prog.program}</div>
                  <div className="silicon-meta">
                    {prog.chipType} · {prog.process}
                  </div>
                  <div className="silicon-partners">
                    {prog.partners.map((p, j) => (
                      <div key={j} className="silicon-partner">
                        <div>
                          <div className="partner-name">{p.name}</div>
                          <div className="partner-role">{p.role}</div>
                        </div>
                        <div className="partner-ticker">{p.ticker}</div>
                      </div>
                    ))}
                  </div>
                  {prog.notes && (
                    <div className="silicon-note">{prog.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
