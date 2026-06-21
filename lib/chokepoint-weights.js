/**
 * Chokepoint weights per supply chain tier (1=low, 5=critical).
 * Higher weight = harder to substitute / more systemic risk if disrupted.
 */

const CHOKEPOINT_WEIGHTS = {
  'hyperscalers':     1,
  'neoclouds':        1,
  'chip-designers':   3,
  'foundries':        5,
  'equipment':        5,
  'memory':           4,
  'packaging':        4,
  'optical':          3,
  'materials':        3,
  'power-energy':     2,
  'cooling':          2,
  'networking':       2,
  'datacenter-reits': 1,
  'defense-space':    2,
}

const WEIGHT_LABELS = {
  1: 'Low',
  2: 'Moderate',
  3: 'Significant',
  4: 'High',
  5: 'Critical',
}

function getWeight(tier) {
  return CHOKEPOINT_WEIGHTS[tier] ?? 1
}

function getLabel(tier) {
  const w = getWeight(tier)
  return WEIGHT_LABELS[w] ?? 'Unknown'
}

module.exports = { CHOKEPOINT_WEIGHTS, WEIGHT_LABELS, getWeight, getLabel }
