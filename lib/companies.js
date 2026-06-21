/**
 * Canonical company list for AI Infrastructure Tracker.
 * DO NOT auto-modify this file — changes must be made manually.
 *
 * Fields:
 *   ticker       - Primary exchange ticker (used for Yahoo Finance fallback)
 *   googleTicker - GOOGLEFINANCE-compatible ticker (exchange:symbol)
 *   name         - Display name
 *   region       - Geographic region
 *   tier         - Supply chain tier (see lib/chokepoint-weights.js for weights)
 *   tags         - Optional keywords for signal matching
 */

const COMPANIES = [
  // ─── Tier 1: Hyperscalers ────────────────────────────────────────────────
  { ticker: 'GOOGL', googleTicker: 'NASDAQ:GOOGL', name: 'Alphabet (Google)', region: 'US', tier: 'hyperscalers', tags: ['cloud', 'tpu', 'ai'] },
  { ticker: 'MSFT',  googleTicker: 'NASDAQ:MSFT',  name: 'Microsoft',         region: 'US', tier: 'hyperscalers', tags: ['cloud', 'azure', 'ai'] },
  { ticker: 'AMZN',  googleTicker: 'NASDAQ:AMZN',  name: 'Amazon (AWS)',      region: 'US', tier: 'hyperscalers', tags: ['cloud', 'aws', 'trainium'] },
  { ticker: 'META',  googleTicker: 'NASDAQ:META',   name: 'Meta',              region: 'US', tier: 'hyperscalers', tags: ['cloud', 'mtia', 'ai'] },
  { ticker: 'BIDU',  googleTicker: 'NASDAQ:BIDU',   name: 'Baidu',             region: 'China', tier: 'hyperscalers', tags: ['cloud', 'ai'] },
  { ticker: '9988',  googleTicker: 'HKEX:9988',     name: 'Alibaba',           region: 'China', tier: 'hyperscalers', tags: ['cloud', 'ai'] },
  { ticker: '700',   googleTicker: 'HKEX:700',      name: 'Tencent',           region: 'China', tier: 'hyperscalers', tags: ['cloud', 'ai'] },

  // ─── Tier 2: Neocloud / GPU Cloud ───────────────────────────────────────
  { ticker: 'CRWV',  googleTicker: 'NASDAQ:CRWV',   name: 'CoreWeave',         region: 'US', tier: 'neoclouds', tags: ['gpu-cloud', 'h100'] },
  { ticker: 'LNVGY', googleTicker: 'OTC:LNVGY',     name: 'Lenovo',            region: 'China', tier: 'neoclouds', tags: ['servers', 'ai-infra'] },
  { ticker: 'HPE',   googleTicker: 'NYSE:HPE',       name: 'HPE',               region: 'US', tier: 'neoclouds', tags: ['servers', 'ai-infra'] },
  { ticker: 'DELL',  googleTicker: 'NYSE:DELL',      name: 'Dell Technologies', region: 'US', tier: 'neoclouds', tags: ['servers', 'ai-infra'] },
  { ticker: 'SMCI',  googleTicker: 'NASDAQ:SMCI',    name: 'Super Micro Computer', region: 'US', tier: 'neoclouds', tags: ['servers', 'ai-infra'] },

  // ─── Tier 3: Chip Designers (Fabless) ───────────────────────────────────
  { ticker: 'NVDA',  googleTicker: 'NASDAQ:NVDA',   name: 'NVIDIA',            region: 'US', tier: 'chip-designers', tags: ['gpu', 'h100', 'blackwell'] },
  { ticker: 'AMD',   googleTicker: 'NASDAQ:AMD',     name: 'AMD',               region: 'US', tier: 'chip-designers', tags: ['gpu', 'cpu', 'instinct'] },
  { ticker: 'INTC',  googleTicker: 'NASDAQ:INTC',    name: 'Intel',             region: 'US', tier: 'chip-designers', tags: ['cpu', 'gaudi', 'foundry'] },
  { ticker: 'AVGO',  googleTicker: 'NASDAQ:AVGO',    name: 'Broadcom',          region: 'US', tier: 'chip-designers', tags: ['asic', 'networking', 'tpu-partner'] },
  { ticker: 'MRVL',  googleTicker: 'NASDAQ:MRVL',    name: 'Marvell',           region: 'US', tier: 'chip-designers', tags: ['asic', 'networking', 'custom-silicon'] },
  { ticker: 'QCOM',  googleTicker: 'NASDAQ:QCOM',    name: 'Qualcomm',          region: 'US', tier: 'chip-designers', tags: ['cpu', 'ai-edge'] },
  { ticker: '2454',  googleTicker: 'TPE:2454',       name: 'MediaTek',          region: 'Taiwan', tier: 'chip-designers', tags: ['cpu', 'ai-edge'] },
  { ticker: 'CRUS',  googleTicker: 'NASDAQ:CRUS',    name: 'Cirrus Logic',      region: 'US', tier: 'chip-designers', tags: ['mixed-signal'] },
  { ticker: 'MPWR',  googleTicker: 'NASDAQ:MPWR',    name: 'Monolithic Power',  region: 'US', tier: 'chip-designers', tags: ['power-ic', 'vrm'] },

  // ─── Tier 4: Foundries ───────────────────────────────────────────────────
  { ticker: 'TSM',   googleTicker: 'NYSE:TSM',       name: 'TSMC',              region: 'Taiwan', tier: 'foundries', tags: ['n3', 'n2', 'leading-edge'] },
  { ticker: 'INTC',  googleTicker: 'NASDAQ:INTC',    name: 'Intel Foundry',     region: 'US', tier: 'foundries', tags: ['18a', 'foundry-services'] },
  { ticker: '005930',googleTicker: 'KRX:005930',     name: 'Samsung Electronics',region: 'Korea', tier: 'foundries', tags: ['sf3', 'hbm', 'memory'] },
  { ticker: 'GFS',   googleTicker: 'NASDAQ:GFS',     name: 'GlobalFoundries',   region: 'US', tier: 'foundries', tags: ['trailing-edge', 'specialty'] },
  { ticker: 'SMIC',  googleTicker: 'HKEX:981',       name: 'SMIC',              region: 'China', tier: 'foundries', tags: ['mature-node', 'china'] },

  // ─── Tier 5: Semiconductor Equipment ────────────────────────────────────
  { ticker: 'ASML',  googleTicker: 'NASDAQ:ASML',    name: 'ASML',              region: 'Netherlands', tier: 'equipment', tags: ['euv', 'lithography', 'chokepoint'] },
  { ticker: 'AMAT',  googleTicker: 'NASDAQ:AMAT',    name: 'Applied Materials', region: 'US', tier: 'equipment', tags: ['deposition', 'etch', 'cmp'] },
  { ticker: 'LRCX',  googleTicker: 'NASDAQ:LRCX',    name: 'Lam Research',      region: 'US', tier: 'equipment', tags: ['etch', 'deposition', 'cleaning'] },
  { ticker: 'KLAC',  googleTicker: 'NASDAQ:KLAC',    name: 'KLA Corporation',   name: 'KLA Corporation', region: 'US', tier: 'equipment', tags: ['inspection', 'metrology'] },
  { ticker: 'TOELY', googleTicker: 'OTC:TOELY',      name: 'Tokyo Electron',    region: 'Japan', tier: 'equipment', tags: ['coater', 'etch', 'cvd'] },
  { ticker: 'ASM',   googleTicker: 'AMS:ASM',        name: 'ASM International', region: 'Netherlands', tier: 'equipment', tags: ['ald', 'epitaxy'] },
  { ticker: 'BESI',  googleTicker: 'AMS:BESI',       name: 'BE Semiconductor',  region: 'Netherlands', tier: 'equipment', tags: ['die-bonding', 'advanced-packaging'] },

  // ─── Tier 6: Memory ──────────────────────────────────────────────────────
  { ticker: '005930',googleTicker: 'KRX:005930',     name: 'Samsung (Memory)',  region: 'Korea', tier: 'memory', tags: ['hbm3e', 'ddr5', 'nand'] },
  { ticker: 'MU',    googleTicker: 'NASDAQ:MU',      name: 'Micron Technology', region: 'US', tier: 'memory', tags: ['hbm3e', 'ddr5', 'nand'] },
  { ticker: '000660',googleTicker: 'KRX:000660',     name: 'SK Hynix',          region: 'Korea', tier: 'memory', tags: ['hbm3e', 'hbm4', 'ddr5'] },
  { ticker: 'WDC',   googleTicker: 'NASDAQ:WDC',     name: 'Western Digital',   region: 'US', tier: 'memory', tags: ['nand', 'storage'] },

  // ─── Tier 7: Advanced Packaging ──────────────────────────────────────────
  { ticker: 'ASX',   googleTicker: 'NYSE:ASX',       name: 'ASE Technology',    region: 'Taiwan', tier: 'packaging', tags: ['cowos', 'sip', 'osat'] },
  { ticker: 'AMKR',  googleTicker: 'NASDAQ:AMKR',    name: 'Amkor Technology',  region: 'US', tier: 'packaging', tags: ['osat', 'advanced-packaging'] },
  { ticker: '3037',  googleTicker: 'TPE:3037',       name: 'Unimicron',         region: 'Taiwan', tier: 'packaging', tags: ['substrate', 'abf'] },
  { ticker: '6488',  googleTicker: 'TPE:6488',       name: 'Kinsus',            region: 'Taiwan', tier: 'packaging', tags: ['substrate', 'ic-substrate'] },
  { ticker: 'NNDM',  googleTicker: 'NASDAQ:NNDM',    name: 'Nano Dimension',    region: 'Israel', tier: 'packaging', tags: ['additive-manufacturing'] },

  // ─── Tier 8: Optical / Interconnect ─────────────────────────────────────
  { ticker: 'COHR',  googleTicker: 'NYSE:COHR',      name: 'Coherent Corp',     region: 'US', tier: 'optical', tags: ['transceiver', '400g', '800g'] },
  { ticker: 'IIVI',  googleTicker: 'NASDAQ:IIVI',    name: 'II-VI (Coherent)',  region: 'US', tier: 'optical', tags: ['laser', 'compound-semi'] },
  { ticker: 'FNSR',  googleTicker: 'NASDAQ:FNSR',    name: 'Finisar (II-VI)',   region: 'US', tier: 'optical', tags: ['transceiver'] },
  { ticker: 'LITE',  googleTicker: 'NASDAQ:LITE',    name: 'Lumentum',          region: 'US', tier: 'optical', tags: ['laser', 'lidar', 'datacom'] },
  { ticker: 'AAOI',  googleTicker: 'NASDAQ:AAOI',    name: 'Applied Optoelectronics', region: 'US', tier: 'optical', tags: ['transceiver', 'dcf'] },
  { ticker: 'IQE',   googleTicker: 'LON:IQE',        name: 'IQE',               region: 'UK', tier: 'optical', tags: ['compound-semi', 'epiwafer'] },

  // ─── Tier 9: Materials / Specialty Chemicals ─────────────────────────────
  { ticker: '9984',  googleTicker: 'TYO:9984',       name: 'SoftBank Group',    region: 'Japan', tier: 'materials', tags: ['ai-investment', 'arm'] },
  { ticker: '8035',  googleTicker: 'TYO:8035',       name: 'Tokyo Electron',    region: 'Japan', tier: 'materials', tags: ['equipment', 'photoresist-tools'] },
  { ticker: 'WAF',   googleTicker: 'ETR:WAF',        name: 'Siltronic',         region: 'Germany', tier: 'materials', tags: ['silicon-wafer', '300mm'] },
  { ticker: 'SUMCO', googleTicker: 'OTC:SUOPY',      name: 'Sumco',             region: 'Japan', tier: 'materials', tags: ['silicon-wafer', '300mm'] },
  { ticker: 'SHW',   googleTicker: 'NYSE:SHW',       name: 'Sherwin-Williams',  region: 'US', tier: 'materials', tags: ['specialty-chemicals'] },
  { ticker: 'EMN',   googleTicker: 'NYSE:EMN',       name: 'Eastman Chemical',  region: 'US', tier: 'materials', tags: ['specialty-chemicals', 'photoresist'] },
  { ticker: 'MTRS',  googleTicker: 'STO:MTRS',       name: 'Merus Power',       region: 'Sweden', tier: 'materials', tags: ['power-electronics'] },

  // ─── Tier 10: Power & Energy ──────────────────────────────────────────────
  { ticker: 'VST',   googleTicker: 'NYSE:VST',       name: 'Vistra Corp',       region: 'US', tier: 'power-energy', tags: ['power', 'nuclear', 'datacenter'] },
  { ticker: 'CEG',   googleTicker: 'NASDAQ:CEG',     name: 'Constellation Energy',region: 'US', tier: 'power-energy', tags: ['nuclear', 'clean-power', 'datacenter'] },
  { ticker: 'ETR',   googleTicker: 'NYSE:ETR',       name: 'Entergy',           region: 'US', tier: 'power-energy', tags: ['power-utility', 'datacenter'] },
  { ticker: 'NEE',   googleTicker: 'NYSE:NEE',       name: 'NextEra Energy',    region: 'US', tier: 'power-energy', tags: ['renewable', 'solar', 'wind'] },
  { ticker: 'EATON', googleTicker: 'NYSE:ETN',       name: 'Eaton',             region: 'US', tier: 'power-energy', tags: ['power-mgmt', 'ups', 'pdu'] },
  { ticker: 'SU',    googleTicker: 'EPA:SU',         name: 'Schneider Electric',region: 'France', tier: 'power-energy', tags: ['power-mgmt', 'ups', 'pdu', 'dcim'] },

  // ─── Tier 11: Cooling ────────────────────────────────────────────────────
  { ticker: 'VRT',   googleTicker: 'NYSE:VRT',       name: 'Vertiv',            region: 'US', tier: 'cooling', tags: ['liquid-cooling', 'thermal', 'ups'] },
  { ticker: 'AIRSYS',googleTicker: 'OTC:AIRSYS',     name: 'Airedale (Modine)', region: 'US', tier: 'cooling', tags: ['crac', 'thermal'] },
  { ticker: 'MOD',   googleTicker: 'NYSE:MOD',       name: 'Modine Manufacturing',region: 'US', tier: 'cooling', tags: ['liquid-cooling', 'thermal'] },
  { ticker: 'GNRC',  googleTicker: 'NYSE:GNRC',      name: 'Generac',           region: 'US', tier: 'cooling', tags: ['backup-power', 'generator'] },
  { ticker: 'CARR',  googleTicker: 'NYSE:CARR',       name: 'Carrier Global',    region: 'US', tier: 'cooling', tags: ['hvac', 'chillers'] },

  // ─── Tier 12: Networking ──────────────────────────────────────────────────
  { ticker: 'CSCO',  googleTicker: 'NASDAQ:CSCO',    name: 'Cisco',             region: 'US', tier: 'networking', tags: ['ethernet', 'switching', 'ai-networking'] },
  { ticker: 'ANET',  googleTicker: 'NYSE:ANET',      name: 'Arista Networks',   region: 'US', tier: 'networking', tags: ['ethernet', 'switching', 'ai-networking'] },
  { ticker: 'MELI',  googleTicker: 'NASDAQ:MELI',    name: 'Mellanox (NVIDIA)', region: 'US', tier: 'networking', tags: ['infiniband', 'roce', 'ai-fabric'] },
  { ticker: 'INFN',  googleTicker: 'NASDAQ:INFN',    name: 'Infinera',          region: 'US', tier: 'networking', tags: ['optical-transport', 'dwdm'] },
  { ticker: 'CIEN',  googleTicker: 'NYSE:CIEN',      name: 'Ciena',             region: 'US', tier: 'networking', tags: ['optical-transport', 'dwdm'] },
  { ticker: 'JNPR',  googleTicker: 'NYSE:JNPR',      name: 'Juniper Networks',  region: 'US', tier: 'networking', tags: ['routing', 'switching', 'ai-ops'] },

  // ─── Tier 13: Data Center REITs ───────────────────────────────────────────
  { ticker: 'EQIX',  googleTicker: 'NASDAQ:EQIX',    name: 'Equinix',           region: 'US', tier: 'datacenter-reits', tags: ['colocation', 'interconnection'] },
  { ticker: 'DLR',   googleTicker: 'NYSE:DLR',       name: 'Digital Realty',    region: 'US', tier: 'datacenter-reits', tags: ['colocation', 'hyperscale'] },
  { ticker: 'IRM',   googleTicker: 'NYSE:IRM',       name: 'Iron Mountain',     region: 'US', tier: 'datacenter-reits', tags: ['colocation', 'edge-dc'] },
  { ticker: 'SWCH',  googleTicker: 'NYSE:SWCH',      name: 'Switch (acquired)',  region: 'US', tier: 'datacenter-reits', tags: ['colocation'] },
  { ticker: 'OVH',   googleTicker: 'EPA:OVH',        name: 'OVH Cloud',         region: 'France', tier: 'datacenter-reits', tags: ['cloud', 'colocation', 'eu'] },

  // ─── Tier 14: Defense / Space AI ──────────────────────────────────────────
  { ticker: 'PLTR',  googleTicker: 'NASDAQ:PLTR',    name: 'Palantir',          region: 'US', tier: 'defense-space', tags: ['ai-software', 'defense', 'gotham'] },
  { ticker: 'LDOS',  googleTicker: 'NYSE:LDOS',      name: 'Leidos',            region: 'US', tier: 'defense-space', tags: ['defense', 'ai-gov'] },
  { ticker: 'BAH',   googleTicker: 'NYSE:BAH',       name: 'Booz Allen Hamilton',region: 'US', tier: 'defense-space', tags: ['defense', 'ai-gov'] },
  { ticker: 'SAIC',  googleTicker: 'NYSE:SAIC',      name: 'SAIC',              region: 'US', tier: 'defense-space', tags: ['defense', 'ai-gov'] },
  { ticker: 'RHM',   googleTicker: 'ETR:RHM',        name: 'Rheinmetall',       region: 'Germany', tier: 'defense-space', tags: ['defense', 'eu-defense'] },
  { ticker: 'BA',    googleTicker: 'LON:BA',         name: 'BAE Systems',       region: 'UK', tier: 'defense-space', tags: ['defense', 'space', 'ai-defense'] },
  { ticker: 'RKLB',  googleTicker: 'NASDAQ:RKLB',    name: 'Rocket Lab',        region: 'US', tier: 'defense-space', tags: ['space', 'launch', 'satellites'] },
  { ticker: 'SPCE',  googleTicker: 'NYSE:SPCE',      name: 'Virgin Galactic',   region: 'US', tier: 'defense-space', tags: ['space'] },
]

// Deduplicated tickers (some companies appear in multiple tiers by design)
// e.g. INTC appears in both chip-designers and foundries
// e.g. 005930 (Samsung) appears in both foundries and memory
// e.g. 8035 (Tokyo Electron) appears in both equipment and materials

/** Unique tickers for market data queries */
const UNIQUE_TICKERS = [...new Set(COMPANIES.map(c => c.ticker))]

/** Unique Google tickers for GOOGLEFINANCE queries */
const UNIQUE_GOOGLE_TICKERS = [...new Set(COMPANIES.map(c => c.googleTicker))]

/** Look up a company by ticker (returns first match) */
function getByTicker(ticker) {
  return COMPANIES.find(c => c.ticker === ticker)
}

/** Get all companies in a tier */
function getByTier(tier) {
  return COMPANIES.filter(c => c.tier === tier)
}

/** All tier names */
const TIERS = [
  'hyperscalers',
  'neoclouds',
  'chip-designers',
  'foundries',
  'equipment',
  'memory',
  'packaging',
  'optical',
  'materials',
  'power-energy',
  'cooling',
  'networking',
  'datacenter-reits',
  'defense-space',
]

module.exports = { COMPANIES, UNIQUE_TICKERS, UNIQUE_GOOGLE_TICKERS, getByTicker, getByTier, TIERS }
