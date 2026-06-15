// Repository Commandes — offline-first (même pattern qu'Expéditions).
// localStorage = source de vérité, Supabase = synchro best-effort.

import { getOrders, addOrder, updateOrder, deleteOrder } from './supabase'

const key = (uid) => `mecarys.orders.${uid || 'anon'}`

export function loadOrders(uid) {
  try { const r = localStorage.getItem(key(uid)); return r ? JSON.parse(r) : [] }
  catch { return [] }
}

function save(uid, list) {
  try { localStorage.setItem(key(uid), JSON.stringify(list)) } catch { /* ignore */ }
}

function newId() { return crypto?.randomUUID?.() || `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

function autoRef() { return `CMD-${new Date().getFullYear()}-${Date.now().toString(36).slice(-4).toUpperCase()}` }
export { autoRef as autoOrderRef }

let dbOk = null
async function probe(uid) {
  if (dbOk !== null) return dbOk
  try { const { error } = await getOrders(uid); dbOk = !error } catch { dbOk = false }
  return dbOk
}
export const isDbAvailable = () => dbOk === true

export async function listOrders(uid) {
  const local = loadOrders(uid)
  if (!(await probe(uid))) return { data: local, synced: false }
  try {
    const { data, error } = await getOrders(uid)
    if (error || !Array.isArray(data)) return { data: local, synced: false }
    // Aplatir la jointure produit si présente (Supabase renvoie products:{name,asin}).
    const remote = data.map(o => ({
      ...o,
      product_name: o.products?.name || o.product_name || null,
      product_asin: o.products?.asin || o.product_asin || null,
    }))
    const remoteIds = new Set(remote.map(r => r.id))
    const localOnly = local.filter(l => !remoteIds.has(l.id))
    for (const l of localOnly) { try { await addOrder(uid, l) } catch { /* ignore */ } }
    const merged = [...remote, ...localOnly].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    save(uid, merged)
    return { data: merged, synced: true }
  } catch { return { data: local, synced: false } }
}

export async function createOrder(uid, order) {
  const o = { id: newId(), created_at: new Date().toISOString(), ...order }
  const next = [o, ...loadOrders(uid)]
  save(uid, next)
  if (await probe(uid)) { try { await addOrder(uid, o) } catch { /* ignore */ } }
  return next
}

export async function patchOrder(uid, id, updates) {
  const next = loadOrders(uid).map(o => o.id === id ? { ...o, ...updates } : o)
  save(uid, next)
  if (await probe(uid)) { try { await updateOrder(id, updates) } catch { /* ignore */ } }
  return next
}

export async function removeOrder(uid, id) {
  const next = loadOrders(uid).filter(o => o.id !== id)
  save(uid, next)
  if (await probe(uid)) { try { await deleteOrder(id) } catch { /* ignore */ } }
  return next
}
