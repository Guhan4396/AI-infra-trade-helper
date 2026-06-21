/**
 * Custom silicon programs for hyperscalers.
 * Maps each chip program to design partners, foundry, and packaging partners.
 * DO NOT auto-modify.
 */

const HYPERSCALER_SILICON = [
  // ─── Google ──────────────────────────────────────────────────────────────
  {
    company: 'Google',
    companyTicker: 'GOOGL',
    program: 'TPU v5 / v6 (Trillium)',
    chipType: 'Training + Inference',
    process: 'TSMC N3',
    partners: [
      { name: 'TSMC',    role: 'Foundry',      ticker: 'TSM' },
      { name: 'Broadcom', role: 'Design partner / interposer', ticker: 'AVGO' },
      { name: 'ASE',     role: 'Packaging (CoWoS)', ticker: 'ASX' },
      { name: 'Marvell', role: 'Optical/SerDes', ticker: 'MRVL' },
    ],
    notes: 'Broadcom co-designs interconnect; Google owns IP',
  },
  {
    company: 'Google',
    companyTicker: 'GOOGL',
    program: 'Axion (Arm CPU)',
    chipType: 'Cloud CPU',
    process: 'TSMC N3',
    partners: [
      { name: 'TSMC',    role: 'Foundry',      ticker: 'TSM' },
      { name: 'Broadcom', role: 'Design partner', ticker: 'AVGO' },
    ],
    notes: 'Arm-based custom CPU for GCE workloads',
  },

  // ─── Amazon ───────────────────────────────────────────────────────────────
  {
    company: 'Amazon (AWS)',
    companyTicker: 'AMZN',
    program: 'Trainium 2',
    chipType: 'Training',
    process: 'TSMC N3',
    partners: [
      { name: 'TSMC',    role: 'Foundry',      ticker: 'TSM' },
      { name: 'Marvell', role: 'Networking / EFA chip', ticker: 'MRVL' },
      { name: 'Amkor',   role: 'Packaging',    ticker: 'AMKR' },
    ],
    notes: 'Used in UltraCluster 2 (100K-chip scale)',
  },
  {
    company: 'Amazon (AWS)',
    companyTicker: 'AMZN',
    program: 'Inferentia 3',
    chipType: 'Inference',
    process: 'TSMC N4',
    partners: [
      { name: 'TSMC',    role: 'Foundry',      ticker: 'TSM' },
      { name: 'Amkor',   role: 'Packaging',    ticker: 'AMKR' },
    ],
    notes: 'Cost-optimized inference; NeuronSDK',
  },
  {
    company: 'Amazon (AWS)',
    companyTicker: 'AMZN',
    program: 'Graviton 4 / 5',
    chipType: 'Cloud CPU',
    process: 'TSMC N3',
    partners: [
      { name: 'TSMC',    role: 'Foundry',      ticker: 'TSM' },
    ],
    notes: 'Arm-based; Graviton 5 rumored for N2',
  },

  // ─── Meta ─────────────────────────────────────────────────────────────────
  {
    company: 'Meta',
    companyTicker: 'META',
    program: 'MTIA v2 (Meta Training and Inference Accelerator)',
    chipType: 'Inference',
    process: 'TSMC N5',
    partners: [
      { name: 'TSMC',    role: 'Foundry',      ticker: 'TSM' },
      { name: 'Broadcom', role: 'Design partner', ticker: 'AVGO' },
      { name: 'ASE',     role: 'Packaging',    ticker: 'ASX' },
    ],
    notes: 'Recommendation engine inference; v3 expected on N3',
  },

  // ─── Microsoft ────────────────────────────────────────────────────────────
  {
    company: 'Microsoft',
    companyTicker: 'MSFT',
    program: 'Maia 100',
    chipType: 'Training + Inference',
    process: 'TSMC N5',
    partners: [
      { name: 'TSMC',    role: 'Foundry',      ticker: 'TSM' },
      { name: 'Marvell', role: 'Networking / SmartNIC', ticker: 'MRVL' },
      { name: 'Amkor',   role: 'Packaging',    ticker: 'AMKR' },
    ],
    notes: 'Azure AI accelerator; Maia 2 reportedly on N3',
  },
  {
    company: 'Microsoft',
    companyTicker: 'MSFT',
    program: 'Cobalt 100 (Arm CPU)',
    chipType: 'Cloud CPU',
    process: 'TSMC N5',
    partners: [
      { name: 'TSMC',    role: 'Foundry',      ticker: 'TSM' },
    ],
    notes: 'Arm-based Azure compute CPU',
  },
]

/** Get all programs for a company */
function getByCompany(companyTicker) {
  return HYPERSCALER_SILICON.filter(p => p.companyTicker === companyTicker)
}

/** Get all unique partner tickers across all programs */
function getAllPartnerTickers() {
  const tickers = new Set()
  for (const prog of HYPERSCALER_SILICON) {
    for (const partner of prog.partners) {
      tickers.add(partner.ticker)
    }
  }
  return [...tickers]
}

module.exports = { HYPERSCALER_SILICON, getByCompany, getAllPartnerTickers }
