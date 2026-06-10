// Calcul de profitabilité par ASIN.
// Marge nette/unité = prix − COGS − frais FBA − logistique − pub estimée.
// La pub est estimée via l'ACOS appliqué au prix (approximation TACOS,
// standard chez les vendeurs quand la part exacte des ventes pub est inconnue).

export function computeProfit(p) {
  const price = Number(p.price_current) || 0
  const cost = Number(p.cost) || 0
  const fba = Number(p.fba_fee) || 0
  const ship = Number(p.shipping_cost) || 0
  const acos = Number(p.acos) || 0
  const units = Number(p.units_sold_30d) || 0

  const pubPerUnit = price * (acos / 100)
  const margeBrute = price - cost
  const margeNette = price - cost - fba - ship - pubPerUnit
  const margePct = price > 0 ? (margeNette / price) * 100 : 0
  // ACOS de rentabilité : au-delà, chaque vente pub perd de l'argent
  const breakEvenAcos = price > 0 ? ((price - cost - fba - ship) / price) * 100 : 0
  const profitNet30d = margeNette * units
  const revenue30d = price * units
  const roi = cost + fba + ship > 0 ? (margeNette / (cost + fba + ship)) * 100 : 0

  return { price, cost, fba, ship, pubPerUnit, margeBrute, margeNette, margePct, breakEvenAcos, profitNet30d, revenue30d, roi, units }
}

export const margeColor = (pct) => pct >= 25 ? '#10b981' : pct >= 15 ? '#f59e0b' : '#ef4444'
