// MECARYS OS — Module Expéditions / Transport
// Domaine métier : types de transport, statuts, calculs, alertes
// + persistance locale (localStorage) fiable par utilisateur.
//
// Pourquoi localStorage : la table Supabase `shipments` ne contient pas
// (encore) les colonnes riches nécessaires (fournisseur, produit, dates
// multiples, coût, type de transport…). En attendant la migration DB,
// localStorage garantit que les données créées par l'utilisateur
// PERSISTENT après actualisation, fermeture du navigateur et redémarrage.
// Aucune donnée fictive n'est réinjectée automatiquement.

// ---------- Types de transport ----------
// Tarifs : bateau 1.44 $/kg, camion 2.34 $/kg.
export const TRANSPORT_TYPES = {
  bateau: { label: 'Bateau', icon: '🚢', color: '#0ea5e9', days: 50, ratePerKg: 1.44 },
  camion: { label: 'Camion', icon: '🚚', color: '#f59e0b', days: 25, ratePerKg: 2.34 },
}

// Taux de conversion indicatif USD → EUR (les tarifs au kg sont en $/kg,
// l'app raisonne en €). Modifiable ici si besoin.
export const USD_EUR = 0.92

// ---------- Workflow de statuts (ordonné) ----------
export const STATUS_FLOW = [
  'draft', 'ordered', 'production', 'ready', 'shipped',
  'transit', 'customs', 'warehouse', 'fba', 'closed',
]

export const STATUS = {
  draft:      { label: 'Brouillon',        icon: '✏️', color: '#9ca3af' },
  ordered:    { label: 'Commandée',        icon: '📝', color: '#6366f1' },
  production: { label: 'En production',     icon: '🏭', color: '#8b5cf6' },
  ready:      { label: 'Prête à expédier',  icon: '📦', color: '#0ea5e9' },
  shipped:    { label: 'Expédiée',          icon: '🚀', color: '#3b82f6' },
  transit:    { label: 'En transit',        icon: '🚢', color: '#2563eb' },
  customs:    { label: 'En douane',         icon: '🛃', color: '#f59e0b' },
  warehouse:  { label: 'En entrepôt',       icon: '🏬', color: '#14b8a6' },
  fba:        { label: 'Reçue Amazon FBA',  icon: '✅', color: '#10b981' },
  closed:     { label: 'Clôturée',          icon: '🔒', color: '#6b7280' },
}

// Étapes affichées dans la timeline (on masque draft/closed qui sont des bornes).
export const TIMELINE_STEPS = ['ordered', 'production', 'shipped', 'transit', 'customs', 'warehouse', 'fba']

// Regroupements métier pour les KPIs (aucune donnée hardcodée — dérivé du statut).
export const ACTIVE_STATUSES = ['ordered', 'production', 'ready', 'shipped', 'transit', 'customs', 'warehouse']
export const MOVING_STATUSES = ['shipped', 'transit', 'customs', 'warehouse'] // unités physiquement en transit
export const DELIVERED_STATUSES = ['fba', 'closed']

// ---------- Transporteurs (lien de suivi temps réel) ----------
export const CARRIERS = {
  dhl:    { name: 'DHL',     url: 'https://www.dhl.com/fr-fr/home/suivi.html?tracking-id=', color: '#FFCC00' },
  fedex:  { name: 'FedEx',   url: 'https://www.fedex.com/fedextrack/?trknbr=', color: '#4D148C' },
  ups:    { name: 'UPS',     url: 'https://www.ups.com/track?tracknum=', color: '#351C15' },
  tnt:    { name: 'TNT',     url: 'https://www.tnt.com/express/fr_fr/site/outils-expedition/suivi.html?searchType=con&cons=', color: '#FF6600' },
  dpd:    { name: 'DPD',     url: 'https://trace.dpd.fr/fr/trace/', color: '#DC0032' },
  cma:    { name: 'CMA CGM', url: 'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=ContainerNumber&Reference=', color: '#002B5C' },
  maersk: { name: 'Maersk',  url: 'https://www.maersk.com/tracking/', color: '#003B5C' },
  msc:    { name: 'MSC',     url: 'https://www.msc.com/track-a-shipment?agencyPath=fr&trackingNumber=', color: '#002244' },
  other:  { name: 'Autre',   url: 'https://www.17track.net/fr/track?nums=', color: '#6b7280' },
}

export function trackingUrl(carrier, tracking) {
  const c = CARRIERS[carrier] || CARRIERS.other
  return c.url + encodeURIComponent(tracking || '')
}

// ---------- Modèle ----------
export function emptyShipment() {
  return {
    reference: '', supplier: '', supplier_id: null,
    product: '', product_id: null, asin: '', quantity: '',
    weight_kg: '', country_from: '', country_to: '',
    carrier: 'dhl', transport_type: 'bateau', tracking_number: '',
    transport_cost: '', status: 'draft',
    order_date: '', departure_date: '', eta: '', actual_arrival: '',
    notes: '', archived: false,
  }
}

// Estimation du coût de transport à partir du poids : poids(kg) × tarif($/kg) → €.
export function estimateCostFromWeight(weightKg, transportType) {
  const w = Number(weightKg) || 0
  const tt = TRANSPORT_TYPES[transportType]
  if (!w || !tt) return null
  return +(w * tt.ratePerKg * USD_EUR).toFixed(2)
}

// Auto-ETA : date de départ + délai estimatif du type de transport.
export function computeEta(departureDate, transportType) {
  const tt = TRANSPORT_TYPES[transportType]
  const d = toDate(departureDate)
  if (!tt || !d) return null
  d.setDate(d.getDate() + tt.days)
  return d.toISOString().slice(0, 10)
}

// ---------- Calculs automatiques ----------
const DAY = 86400000

function toDate(v) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export function daysBetween(from, to) {
  const a = toDate(from), b = toDate(to)
  if (!a || !b) return null
  return Math.round((b - a) / DAY)
}

// Durée de transport : arrivée réelle − date de départ.
export function transportDuration(s) {
  return daysBetween(s.departure_date, s.actual_arrival)
}

// Retard : arrivée réelle (ou aujourd'hui si pas encore arrivée) − date estimée.
// Positif = en retard, négatif = en avance.
export function delayDays(s) {
  if (!s.eta) return null
  const ref = s.actual_arrival || new Date().toISOString().slice(0, 10)
  return daysBetween(s.eta, ref)
}

// Coût unitaire de transport : coût total ÷ quantité.
export function unitCost(s) {
  const q = Number(s.quantity) || 0
  const c = Number(s.transport_cost) || 0
  if (!q || !c) return null
  return c / q
}

const isDelivered = (s) => DELIVERED_STATUSES.includes(s.status)

// ---------- Statistiques globales (tableau de bord) ----------
export function computeStats(shipments) {
  const list = shipments.filter(s => !s.archived)
  return {
    active: list.filter(s => ACTIVE_STATUSES.includes(s.status)).length,
    customs: list.filter(s => s.status === 'customs').length,
    delivered: list.filter(s => DELIVERED_STATUSES.includes(s.status)).length,
    unitsInTransit: list
      .filter(s => MOVING_STATUSES.includes(s.status))
      .reduce((a, s) => a + (Number(s.quantity) || 0), 0),
    withTracking: list.filter(s => s.tracking_number).length,
    totalCost: list.reduce((a, s) => a + (Number(s.transport_cost) || 0), 0),
  }
}

// ---------- Moteur d'alertes (dérivé des données réelles) ----------
export function computeShipmentAlerts(s) {
  const alerts = []
  if (s.archived) return alerts
  const ref = s.reference || 'Expédition'

  if (s.status === 'customs') {
    alerts.push({ severity: 'warning', icon: '🛃', message: `${ref} : bloquée en douane — vérifiez la documentation` })
  }
  const delay = delayDays(s)
  if (!isDelivered(s) && delay != null && delay > 7) {
    alerts.push({ severity: 'critical', icon: '⏰', message: `${ref} : retard de ${delay} j sur l'arrivée estimée` })
  } else if (!isDelivered(s) && delay != null && delay > 0) {
    alerts.push({ severity: 'warning', icon: '📅', message: `${ref} : date estimée dépassée de ${delay} j` })
  }
  if (!s.tracking_number && MOVING_STATUSES.includes(s.status)) {
    alerts.push({ severity: 'warning', icon: '🔍', message: `${ref} : numéro de suivi manquant` })
  }
  if (!s.archived && (!s.quantity || Number(s.quantity) <= 0)) {
    alerts.push({ severity: 'info', icon: '⚠️', message: `${ref} : quantité incohérente ou non renseignée` })
  }
  return alerts
}

export function computeAllAlerts(shipments) {
  const order = { critical: 0, warning: 1, info: 2 }
  return shipments
    .flatMap(computeShipmentAlerts)
    .sort((a, b) => order[a.severity] - order[b.severity])
}

// ---------- Coût transport réel par produit / ASIN ----------
// Moyenne pondérée du coût de transport €/unité, sur les expéditions liées
// à un produit. Sert à alimenter shipping_cost dans le calcul de marge.
export function shippingCostByProduct(shipments) {
  const map = {}
  for (const s of shipments) {
    if (s.archived) continue
    const key = s.product_id || s.product
    if (!key) continue
    const q = Number(s.quantity) || 0
    const c = Number(s.transport_cost) || 0
    if (!q || !c) continue
    if (!map[key]) map[key] = { key, product: s.product, product_id: s.product_id || null, asin: s.asin || null, units: 0, cost: 0, count: 0 }
    map[key].units += q
    map[key].cost += c
    map[key].count += 1
  }
  return Object.values(map)
    .map(m => ({ ...m, unitCost: m.units ? m.cost / m.units : 0 }))
    .sort((a, b) => b.cost - a.cost)
}

// ---------- Export CSV ----------
export function shipmentsToCsv(shipments) {
  const cols = [
    ['reference', 'Référence'], ['supplier', 'Fournisseur'], ['product', 'Produit'],
    ['asin', 'ASIN'], ['quantity', 'Quantité'], ['weight_kg', 'Poids (kg)'],
    ['country_from', 'Départ'], ['country_to', 'Arrivée'],
    ['transport_type', 'Transport'], ['carrier', 'Transporteur'],
    ['tracking_number', 'Suivi'], ['status', 'Statut'],
    ['transport_cost', 'Coût (€)'], ['order_date', 'Commande'],
    ['departure_date', 'Départ'], ['eta', 'ETA'], ['actual_arrival', 'Arrivée réelle'],
    ['notes', 'Notes'],
  ]
  const esc = (v) => {
    const str = v == null ? '' : String(v)
    return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const header = cols.map(c => c[1]).join(';')
  const rows = shipments.map(s => cols.map(([k]) => {
    if (k === 'transport_type') return TRANSPORT_TYPES[s[k]]?.label || s[k]
    if (k === 'carrier') return CARRIERS[s[k]]?.name || s[k]
    if (k === 'status') return STATUS[s[k]]?.label || s[k]
    return esc(s[k])
  }).join(';'))
  return [header, ...rows].join('\n')
}

export function downloadCsv(shipments, filename = 'expeditions.csv') {
  const csv = '﻿' + shipmentsToCsv(shipments) // BOM pour Excel/accents
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ---------- Notifications navigateur (alertes critiques) ----------
export async function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

// Notifie les nouvelles alertes critiques (dédoublonnées via localStorage).
export function notifyCriticalAlerts(uid, alerts) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const critical = alerts.filter(a => a.severity === 'critical')
  if (critical.length === 0) return
  const key = `mecarys.notified.${uid || 'anon'}`
  let seen = []
  try { seen = JSON.parse(localStorage.getItem(key) || '[]') } catch { seen = [] }
  const seenSet = new Set(seen)
  const fresh = critical.filter(a => !seenSet.has(a.message))
  fresh.forEach(a => { try { new Notification('🚨 MECARYS — Alerte expédition', { body: a.message }) } catch { /* ignore */ } })
  try { localStorage.setItem(key, JSON.stringify(critical.map(a => a.message))) } catch { /* ignore */ }
}

// ---------- Persistance locale ----------
const storageKey = (uid) => `mecarys.shipments.${uid || 'anon'}`

export function loadShipments(uid) {
  try {
    const raw = localStorage.getItem(storageKey(uid))
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveShipments(uid, list) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

export function newId() {
  return (crypto?.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
}

export function autoReference() {
  return `EXP-${new Date().getFullYear()}-${Date.now().toString(36).slice(-5).toUpperCase()}`
}

// Jeu de démonstration OPT-IN (jamais injecté automatiquement).
export function demoShipments() {
  const today = new Date()
  const iso = (offset) => new Date(today.getTime() + offset * DAY).toISOString().slice(0, 10)
  return [
    {
      id: newId(), reference: 'EXP-2026-001', supplier: 'Shenzhen Tech Co', product: 'Câble USB-C 2m',
      quantity: 500, country_from: 'Chine', country_to: 'France', carrier: 'cma', transport_type: 'bateau',
      tracking_number: 'CMAU1234567', transport_cost: 1800, status: 'transit',
      order_date: iso(-40), departure_date: iso(-20), eta: iso(10), actual_arrival: '', notes: '', archived: false,
    },
    {
      id: newId(), reference: 'EXP-2026-002', supplier: 'Guangzhou Home', product: 'Lampe LED bureau',
      quantity: 300, country_from: 'Chine', country_to: 'Allemagne', carrier: 'dhl', transport_type: 'camion',
      tracking_number: '', transport_cost: 2400, status: 'customs',
      order_date: iso(-25), departure_date: iso(-9), eta: iso(-2), actual_arrival: '', notes: 'Vérifier HS code', archived: false,
    },
  ]
}
