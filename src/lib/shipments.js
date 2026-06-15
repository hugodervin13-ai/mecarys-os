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
// Chaque type : icône, couleur, délai estimatif (jours, porte-à-porte indicatif).
export const TRANSPORT_TYPES = {
  avion:   { label: 'Avion',   icon: '✈️', color: '#3b82f6', days: 7 },
  bateau:  { label: 'Bateau',  icon: '🚢', color: '#0ea5e9', days: 35 },
  camion:  { label: 'Camion',  icon: '🚚', color: '#f59e0b', days: 10 },
  train:   { label: 'Train',   icon: '🚆', color: '#8b5cf6', days: 20 },
  express: { label: 'Express', icon: '⚡', color: '#ef4444', days: 4 },
}

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
    reference: '', supplier: '', product: '', quantity: '',
    country_from: '', country_to: '',
    carrier: 'dhl', transport_type: 'bateau', tracking_number: '',
    transport_cost: '', status: 'draft',
    order_date: '', departure_date: '', eta: '', actual_arrival: '',
    notes: '', archived: false,
  }
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
      quantity: 300, country_from: 'Chine', country_to: 'Allemagne', carrier: 'dhl', transport_type: 'avion',
      tracking_number: '', transport_cost: 2400, status: 'customs',
      order_date: iso(-25), departure_date: iso(-9), eta: iso(-2), actual_arrival: '', notes: 'Vérifier HS code', archived: false,
    },
  ]
}
