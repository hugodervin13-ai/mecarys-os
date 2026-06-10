import { computeProfit } from './profit'

// Moteur d'alertes : dérive des alertes réelles depuis les données produits.
// Calculé côté client à chaque chargement — pas de cron nécessaire.

export const SEVERITY = {
  critical: { label: 'Critique', color: '#ef4444', icon: '🔴' },
  warning:  { label: 'Attention', color: '#f59e0b', icon: '🟠' },
  info:     { label: 'Info', color: '#3b82f6', icon: '🔵' },
}

export function computeAlerts(products) {
  const alerts = []

  for (const p of products || []) {
    const velocity = (Number(p.units_sold_30d) || 0) / 30 // unités vendues par jour
    const stock = Number(p.stock_fba) || 0
    const seuil = Number(p.stock_alerte) ?? 20

    // Stock : rupture estimée selon la vélocité réelle de vente
    if (velocity > 0) {
      const daysLeft = Math.floor(stock / velocity)
      if (daysLeft <= 7) {
        alerts.push({ severity: 'critical', type: 'stock', product_id: p.id, message: `${p.name} : rupture dans ~${daysLeft} j (${stock} unités, ${velocity.toFixed(1)}/jour) — commandez maintenant` })
      } else if (daysLeft <= 21) {
        alerts.push({ severity: 'warning', type: 'stock', product_id: p.id, message: `${p.name} : rupture estimée dans ~${daysLeft} j — anticipez le réassort (délai usine + transport)` })
      }
    } else if (stock > 0 && stock <= seuil) {
      alerts.push({ severity: 'info', type: 'stock', product_id: p.id, message: `${p.name} : stock (${stock}) sous le seuil d'alerte (${seuil})` })
    }

    // Marge : nette négative ou trop faible
    const { margeNette, margePct, breakEvenAcos } = computeProfit(p)
    if (Number(p.price_current) > 0) {
      if (margeNette < 0) {
        alerts.push({ severity: 'critical', type: 'marge', product_id: p.id, message: `${p.name} : marge nette NÉGATIVE (${margePct.toFixed(1)}%) — chaque vente perd de l'argent` })
      } else if (margePct < 15) {
        alerts.push({ severity: 'warning', type: 'marge', product_id: p.id, message: `${p.name} : marge nette faible (${margePct.toFixed(1)}%) — visez 20%+ pour absorber les imprévus` })
      }
    }

    // ACOS : au-dessus du seuil de rentabilité
    const acos = Number(p.acos) || 0
    if (acos > 0 && breakEvenAcos > 0 && acos > breakEvenAcos) {
      alerts.push({ severity: 'warning', type: 'acos', product_id: p.id, message: `${p.name} : ACOS ${acos}% > break-even ${breakEvenAcos.toFixed(0)}% — les ventes pub sont à perte` })
    }

    // Réputation
    const rating = Number(p.rating) || 0
    if (rating > 0 && rating < 4) {
      alerts.push({ severity: 'warning', type: 'avis', product_id: p.id, message: `${p.name} : note ${rating}/5 — impact direct sur la conversion, traitez les avis négatifs` })
    }
  }

  const order = { critical: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity])
}
