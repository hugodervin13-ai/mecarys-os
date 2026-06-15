// MECARYS OS — Repository Expéditions (offline-first)
//
// Stratégie : localStorage est la source de vérité durable (fonctionne hors
// ligne, persiste après actualisation / redémarrage). Supabase est une couche
// de synchronisation BEST-EFFORT : si la base est joignable (migration v4
// appliquée + clés configurées), les données sont synchronisées entre
// appareils ; sinon on reste en local sans aucune perte ni régression.
//
// Toute la persistance passe par ce repo — la page ne touche jamais
// directement localStorage, ce qui évite les doubles sources de vérité.

import { getShipments, addShipment, updateShipment, deleteShipment } from './supabase'
import { loadShipments, saveShipments } from './shipments'

let dbAvailable = null // null = inconnu, true/false = sondé

async function probe(uid) {
  if (dbAvailable !== null) return dbAvailable
  try {
    const { error } = await getShipments(uid)
    dbAvailable = !error
  } catch {
    dbAvailable = false
  }
  return dbAvailable
}

export function isDbAvailable() {
  return dbAvailable === true
}

// Modèle riche → ligne DB (avec compat colonnes legacy origin/destination/items).
function toDbRow(s) {
  const qty = Number(s.quantity) || 0
  return {
    id: s.id,
    reference: s.reference || null,
    supplier: s.supplier || null,
    product: s.product || null,
    asin: s.asin || null,
    quantity: qty,
    items: qty,
    weight_kg: s.weight_kg === '' || s.weight_kg == null ? null : Number(s.weight_kg),
    country_from: s.country_from || null,
    country_to: s.country_to || null,
    origin: s.country_from || null,
    destination: s.country_to || null,
    carrier: s.carrier || null,
    transport_type: s.transport_type || null,
    tracking_number: s.tracking_number || null,
    transport_cost: Number(s.transport_cost) || 0,
    status: s.status || 'draft',
    order_date: s.order_date || null,
    departure_date: s.departure_date || null,
    eta: s.eta || null,
    actual_arrival: s.actual_arrival || null,
    notes: s.notes || null,
    archived: !!s.archived,
    product_id: s.product_id || null,
    supplier_id: s.supplier_id || null,
  }
}

// Ligne DB → modèle riche (tolère les schémas pré-v4).
function fromDbRow(r) {
  return {
    id: r.id,
    reference: r.reference || '',
    supplier: r.supplier || '',
    supplier_id: r.supplier_id || null,
    product: r.product || '',
    product_id: r.product_id || null,
    asin: r.asin || '',
    quantity: r.quantity ?? r.items ?? '',
    weight_kg: r.weight_kg ?? '',
    country_from: r.country_from || r.origin || '',
    country_to: r.country_to || r.destination || '',
    carrier: r.carrier || 'dhl',
    transport_type: r.transport_type || 'bateau',
    tracking_number: r.tracking_number || '',
    transport_cost: r.transport_cost ?? '',
    status: r.status || 'draft',
    order_date: r.order_date || '',
    departure_date: r.departure_date || '',
    eta: r.eta || '',
    actual_arrival: r.actual_arrival || '',
    notes: r.notes || '',
    archived: !!r.archived,
  }
}

// Liste + synchro. Renvoie { data, synced }.
export async function listShipments(uid) {
  const local = loadShipments(uid)
  if (!(await probe(uid))) return { data: local, synced: false }
  try {
    const { data, error } = await getShipments(uid)
    if (error || !Array.isArray(data)) return { data: local, synced: false }
    const remote = data.map(fromDbRow)
    const remoteIds = new Set(remote.map(r => r.id))
    // Pousse vers la DB les expéditions créées hors-ligne (présentes en local seulement).
    const localOnly = local.filter(l => !remoteIds.has(l.id))
    for (const l of localOnly) { try { await addShipment(uid, toDbRow(l)) } catch { /* ignore */ } }
    const merged = [...remote, ...localOnly]
    saveShipments(uid, merged)
    return { data: merged, synced: true }
  } catch {
    return { data: local, synced: false }
  }
}

export async function createShipment(uid, s) {
  const next = [s, ...loadShipments(uid)]
  saveShipments(uid, next)
  if (await probe(uid)) { try { await addShipment(uid, toDbRow(s)) } catch { /* ignore */ } }
  return next
}

export async function saveShipment(uid, s) {
  const next = loadShipments(uid).map(x => (x.id === s.id ? s : x))
  saveShipments(uid, next)
  if (await probe(uid)) { try { await updateShipment(s.id, toDbRow(s)) } catch { /* ignore */ } }
  return next
}

export async function removeShipment(uid, id) {
  const next = loadShipments(uid).filter(x => x.id !== id)
  saveShipments(uid, next)
  if (await probe(uid)) { try { await deleteShipment(id) } catch { /* ignore */ } }
  return next
}
