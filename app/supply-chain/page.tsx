import { COMPANIES, TIERS } from '@/lib/companies'
import { getWeight, getLabel } from '@/lib/chokepoint-weights'

const TIER_DISPLAY: Record<string, string> = {
  'hyperscalers':     'Hyperscalers',
  'neoclouds':        'Neocloud / GPU Cloud',
  'chip-designers':   'Chip Designers',
  'foundries':        'Foundries',
  'equipment':        'Semiconductor Equipment',
  'memory':           'Memory',
  'packaging':        'Advanced Packaging',
  'optical':          'Optical / Interconnect',
  'materials':        'Materials',
  'power-energy':     'Power & Energy',
  'cooling':          'Cooling',
  'networking':       'Networking',
  'datacenter-reits': 'Data Center REITs',
  'defense-space':    'Defense / Space AI',
}

export default function SupplyChainPage() {
  return (
    <>
      <div className="page-header">
        <h1>AI Infrastructure Supply Chain Map</h1>
        <p>
          {COMPANIES.length} company entries across {TIERS.length} tiers. Chokepoint weight 1–5 reflects supply-chain substitutability risk.
        </p>
      </div>

      <div className="disclaimer">
        <strong>Signal only.</strong> This map shows supply-chain structure and publicly known relationships.
        Nothing here constitutes investment advice or a recommendation to buy, sell, or hold any security.
      </div>

      <div className="tier-grid">
        {TIERS.map(tier => {
          const companies = COMPANIES.filter(c => c.tier === tier)
          const weight = getWeight(tier)
          const label = getLabel(tier)
          return (
            <div key={tier} className="tier-card">
              <div className="tier-header">
                <span className="tier-name">{TIER_DISPLAY[tier] ?? tier}</span>
                <span className={`weight-badge weight-${weight}`}>
                  ⬤ {label} ({weight}/5)
                </span>
              </div>
              <div className="tier-companies">
                {companies.map((c, i) => (
                  <div key={`${c.ticker}-${i}`} className="company-row">
                    <span className="company-name" title={c.name}>{c.name}</span>
                    <span className="company-ticker">{c.ticker}</span>
                    <span className="company-region">{c.region}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
