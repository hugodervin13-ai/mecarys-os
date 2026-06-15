// Repository Fournisseurs — offline-first (même pattern qu'Expéditions).
// localStorage = source de vérité, Supabase = synchro best-effort.

import { getSuppliers, addSupplier, deleteSupplier } from './supabase'

const key = (uid) => `mecarys.suppliers.${uid || 'anon'}`

export function loadSuppliers(uid) {
  try { const r = localStorage.getItem(key(uid)); return r ? JSON.parse(r) : [] }
  catch { return [] }
}

function save(uid, list) {
  try { localStorage.setItem(key(uid), JSON.stringify(list)) } catch { /* ignore */ }
}

function newId() { return crypto?.randomUUID?.() || `sup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

let dbOk = null
async function probe(uid) {
  if (dbOk !== null) return dbOk
  try { const { error } = await getSuppliers(uid); dbOk = !error } catch { dbOk = false }
  return dbOk
}
export const isDbAvailable = () => dbOk === true

export async function listSuppliers(uid) {
  const local = loadSuppliers(uid)
  if (!(await probe(uid))) return { data: local, synced: false }
  try {
    const { data, error } = await getSuppliers(uid)
    if (error || !Array.isArray(data)) return { data: local, synced: false }
    const remoteIds = new Set(data.map(r => r.id))
    const localOnly = local.filter(l => !remoteIds.has(l.id))
    for (const l of localOnly) { try { await addSupplier(uid, l) } catch { /* ignore */ } }
    const merged = [...data, ...localOnly]
    save(uid, merged)
    return { data: merged, synced: true }
  } catch { return { data: local, synced: false } }
}

export async function createSupplier(uid, supplier) {
  const s = { id: newId(), created_at: new Date().toISOString(), ...supplier }
  const next = [s, ...loadSuppliers(uid)]
  save(uid, next)
  if (await probe(uid)) { try { await addSupplier(uid, s) } catch { /* ignore */ } }
  return next
}

export async function removeSupplier(uid, id) {
  const next = loadSuppliers(uid).filter(s => s.id !== id)
  save(uid, next)
  if (await probe(uid)) { try { await deleteSupplier(id) } catch { /* ignore */ } }
  return next
}
