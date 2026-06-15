// MECARYS OS — Système de fichiers documentaire
// ────────────────────────────────────────────────────────────────────────
// API asynchrone fine au-dessus d'un backend de stockage interchangeable.
//
// Le backend par défaut (`localBackend`) persiste dans le navigateur via
// IndexedDB : l'expérience est 100 % fonctionnelle hors-ligne, sans serveur.
//
// Pour passer au cloud plus tard, implémenter la même interface StorageBackend
// contre Supabase Storage ou AWS S3, puis remplacer `backend` ci-dessous —
// AUCUN changement d'UI n'est nécessaire. L'interface attendue :
//   list(userId)            → Node[]
//   putNode(node)           → Node        (insert/update métadonnée)
//   getNode(id)             → Node | undefined
//   deleteNode(id)          → void
//   putBlob(id, blob)       → void        (upload binaire)
//   getBlob(id)             → Blob | undefined
//   deleteBlob(id)          → void
//
// Modèle Node (arbre unique, dossiers + fichiers) :
//   { id, userId, type:'folder'|'file', parentId,  // parentId null = racine
//     name, createdAt, updatedAt,
//     isProduct, asin,            // dossiers uniquement
//     size, mime, ext }          // fichiers uniquement (binaire dans 'blobs')

import { idb } from './idb'

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// ── Backend local (IndexedDB) ───────────────────────────────────────────
const localBackend = {
  async list(userId) {
    const all = (await idb.getAll('nodes')) || []
    return all.filter(n => n.userId === userId)
  },
  async putNode(node) { await idb.put('nodes', node); return node },
  async getNode(id) { return idb.get('nodes', id) },
  async deleteNode(id) { await idb.delete('nodes', id) },
  async putBlob(id, blob) { await idb.put('blobs', blob, id) },
  async getBlob(id) { return idb.get('blobs', id) },
  async deleteBlob(id) { await idb.delete('blobs', id) },
}

// ── Backend actif (remplacer par supabaseBackend / s3Backend le moment venu) ──
const backend = localBackend

// ── Types acceptés ──────────────────────────────────────────────────────
export const ACCEPTED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xlsx', 'mp4', 'mov']
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xlsx,.mp4,.mov'
const MAX_SIZE = 200 * 1024 * 1024 // 200 Mo

export const extOf = (name = '') => (name.split('.').pop() || '').toLowerCase()

export const kindOf = (ext) => {
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['mp4', 'mov'].includes(ext)) return 'video'
  if (['doc', 'docx', 'xlsx'].includes(ext)) return 'doc'
  return 'other'
}

export const formatSize = (bytes = 0) => {
  if (!bytes) return '0 o'
  const u = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), u.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

// ── Lecture ─────────────────────────────────────────────────────────────
export async function listNodes(userId) {
  return backend.list(userId)
}

// ── Dossiers ────────────────────────────────────────────────────────────
export async function createFolder(userId, { name, parentId = null, isProduct = false, asin = '' }) {
  const clean = (name || '').trim()
  if (!clean) throw new Error('Le nom du dossier est requis')
  const now = new Date().toISOString()
  const node = {
    id: uid(), userId, type: 'folder', parentId,
    name: clean, isProduct, asin: (asin || '').trim().toUpperCase(),
    createdAt: now, updatedAt: now,
  }
  return backend.putNode(node)
}

export async function updateFolder(id, updates) {
  const node = await backend.getNode(id)
  if (!node) throw new Error('Dossier introuvable')
  Object.assign(node, updates, { updatedAt: new Date().toISOString() })
  if (typeof node.asin === 'string') node.asin = node.asin.trim().toUpperCase()
  node.name = (node.name || '').trim()
  return backend.putNode(node)
}

// ── Fichiers ────────────────────────────────────────────────────────────
export async function uploadFiles(userId, fileList, parentId = null) {
  const created = []
  for (const file of Array.from(fileList)) {
    const ext = extOf(file.name)
    if (!ACCEPTED_EXT.includes(ext)) throw new Error(`Type non supporté : .${ext}`)
    if (file.size > MAX_SIZE) throw new Error(`${file.name} dépasse 200 Mo`)
    const now = new Date().toISOString()
    const id = uid()
    await backend.putBlob(id, file)
    const node = {
      id, userId, type: 'file', parentId,
      name: file.name, size: file.size, mime: file.type, ext,
      createdAt: now, updatedAt: now,
    }
    await backend.putNode(node)
    created.push(node)
  }
  return created
}

// ── Renommer / déplacer (dossiers et fichiers) ──────────────────────────
export async function renameNode(id, name) {
  const node = await backend.getNode(id)
  if (!node) throw new Error('Élément introuvable')
  const clean = (name || '').trim()
  if (!clean) throw new Error('Le nom est requis')
  // Conserve l'extension d'un fichier si l'utilisateur l'a omise
  if (node.type === 'file' && node.ext && extOf(clean) !== node.ext) {
    node.name = `${clean}.${node.ext}`
  } else {
    node.name = clean
    if (node.type === 'file') node.ext = extOf(clean)
  }
  node.updatedAt = new Date().toISOString()
  return backend.putNode(node)
}

export async function moveNode(id, newParentId, allNodes) {
  if (id === newParentId) throw new Error('Déplacement invalide')
  const node = await backend.getNode(id)
  if (!node) throw new Error('Élément introuvable')
  // Interdit de déplacer un dossier dans l'un de ses propres descendants
  if (node.type === 'folder' && allNodes) {
    const desc = descendantIds(id, allNodes)
    if (desc.has(newParentId)) throw new Error('Impossible de déplacer un dossier dans lui-même')
  }
  node.parentId = newParentId
  node.updatedAt = new Date().toISOString()
  return backend.putNode(node)
}

// Supprime un node et, récursivement, tous ses descendants (+ leurs binaires).
export async function deleteNode(id) {
  const node = await backend.getNode(id)
  if (!node) return 0
  const all = await backend.list(node.userId)
  const ids = [id, ...descendantIds(id, all)]
  for (const nid of ids) {
    await backend.deleteBlob(nid).catch(() => {})
    await backend.deleteNode(nid)
  }
  return ids.length
}

// ── Binaires (aperçu / téléchargement) ──────────────────────────────────
export async function getFileUrl(id) {
  const blob = await backend.getBlob(id)
  return blob ? URL.createObjectURL(blob) : null
}

export async function downloadFile(id, name) {
  const url = await getFileUrl(id)
  if (!url) throw new Error('Fichier indisponible')
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// ── Helpers d'arbre (purs, réutilisables côté UI) ───────────────────────
export function descendantIds(id, nodes) {
  const set = new Set()
  const walk = (pid) => {
    for (const n of nodes) {
      if (n.parentId === pid && !set.has(n.id)) {
        set.add(n.id)
        walk(n.id)
      }
    }
  }
  walk(id)
  return set
}

// Statistiques par dossier : { [folderId]: { files, size } } (récursif).
export function folderStats(nodes) {
  const byParent = {}
  for (const n of nodes) (byParent[n.parentId] ||= []).push(n)
  const stats = {}
  const calc = (id) => {
    let files = 0, size = 0
    for (const c of byParent[id] || []) {
      if (c.type === 'file') { files++; size += c.size || 0 }
      else { const s = calc(c.id); files += s.files; size += s.size }
    }
    return { files, size }
  }
  for (const n of nodes) if (n.type === 'folder') stats[n.id] = calc(n.id)
  return stats
}
