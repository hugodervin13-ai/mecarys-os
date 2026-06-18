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
export const ACCEPTED_EXT = [
  'jpg','jpeg','png','webp','gif','heic','avif',           // images
  'pdf',                                                    // pdf
  'mp4','mov','avi','mkv','webm',                           // vidéos
  'doc','docx','xls','xlsx','ppt','pptx','csv','txt','rtf', // documents
]
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,.gif,.heic,.avif,.pdf,.mp4,.mov,.avi,.mkv,.webm,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.rtf'
const MAX_SIZE = 500 * 1024 * 1024 // 500 Mo

export const extOf = (name = '') => (name.split('.').pop() || '').toLowerCase()

export const kindOf = (ext) => {
  if (['jpg','jpeg','png','webp','gif','heic','avif'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['mp4','mov','avi','mkv','webm'].includes(ext)) return 'video'
  if (['doc','docx','xls','xlsx','ppt','pptx','csv','txt','rtf'].includes(ext)) return 'doc'
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
    if (file.size > MAX_SIZE) throw new Error(`${file.name} dépasse 500 Mo`)
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

// ── Mise à jour des métadonnées IA d'un node ────────────────────────────────
export async function updateNodeMeta(id, meta) {
  const node = await backend.getNode(id)
  if (!node) return null
  Object.assign(node, meta, { updatedAt: new Date().toISOString() })
  return backend.putNode(node)
}

// ── Import de dossier avec organisation IA ──────────────────────────────────
// Prend les résultats d'analyzeFiles() (chaque entrée a { file, category })
// et crée les sous-dossiers de catégorie dans parentId avant d'uploader.
// onProgress({ current, total }) est appelé à chaque fichier uploadé.
export async function uploadWithAIOrganize(userId, parentId, analysisResults, onProgress) {
  const groups = {}
  for (const r of analysisResults) {
    ;(groups[r.category] ||= []).push(r)
  }

  // Créer les dossiers de catégorie
  const folderIds = {}
  for (const cat of Object.keys(groups)) {
    const folder = await createFolder(userId, { name: cat, parentId: parentId || null })
    folderIds[cat] = folder.id
  }

  // Uploader les fichiers
  let done = 0, uploaded = 0, skipped = 0
  const all = Object.values(groups).flat()

  for (const { file, category, metadata } of all) {
    try {
      const [node] = await uploadFiles(userId, [file], folderIds[category])
      if (metadata && Object.keys(metadata).length) {
        await updateNodeMeta(node.id, { aiCategory: category, aiMetadata: metadata, processedAt: new Date().toISOString() })
      }
      uploaded++
    } catch { skipped++ }
    done++
    if (onProgress) onProgress({ current: done, total: all.length })
    if (done % 5 === 0) await new Promise(r => setTimeout(r, 0))
  }

  return { uploaded, skipped, folders: Object.keys(groups).length, categories: Object.keys(groups) }
}

// ── Auto-organisation des fichiers existants (déplacement + catégorisation) ──
// classifyFn(name, ext) → { category }
export async function autoOrganizeNodes(userId, parentId, fileNodes, classifyFn, onProgress) {
  const groups = {}
  for (const n of fileNodes) {
    const { category } = classifyFn(n.name, n.ext || extOf(n.name))
    ;(groups[category] ||= []).push(n)
  }

  const folderIds = {}
  for (const cat of Object.keys(groups)) {
    const folder = await createFolder(userId, { name: cat, parentId: parentId || null })
    folderIds[cat] = folder.id
  }

  let done = 0
  for (const [cat, nodes] of Object.entries(groups)) {
    for (const n of nodes) {
      await moveNode(n.id, folderIds[cat], null)
      await updateNodeMeta(n.id, { aiCategory: cat, processedAt: new Date().toISOString() })
      done++
      if (onProgress) onProgress({ current: done, total: fileNodes.length })
    }
    await new Promise(r => setTimeout(r, 0))
  }

  return { organized: fileNodes.length, folders: Object.keys(groups).length }
}

// ── Hash de contenu (SHA-256) pour détecter les VRAIS doublons ──────────────
// Deux fichiers au contenu identique ont le même hash, même si leur nom diffère.
export async function hashBlob(blob) {
  const buf = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Suppression des doublons par contenu identique ──────────────────────────
// Garde l'exemplaire le plus ancien de chaque groupe, supprime les copies.
// onProgress({ current, total }) suit l'avancement du hachage.
export async function dedupeAllNodes(userId, onProgress) {
  const all   = await backend.list(userId)
  const files = all.filter(n => n.type === 'file')
  const byHash = {}
  let done = 0
  for (const f of files) {
    const blob = await backend.getBlob(f.id)
    if (blob) {
      try {
        const h = await hashBlob(blob)
        ;(byHash[h] ||= []).push(f)
      } catch { /* blob illisible : ignoré */ }
    }
    done++
    if (onProgress) onProgress({ current: done, total: files.length })
    if (done % 4 === 0) await new Promise(r => setTimeout(r, 0))
  }

  let removed = 0
  const removedNames = []
  for (const group of Object.values(byHash)) {
    if (group.length < 2) continue
    group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // plus ancien d'abord
    for (const dup of group.slice(1)) {
      await backend.deleteBlob(dup.id).catch(() => {})
      await backend.deleteNode(dup.id)
      removed++
      removedNames.push(dup.name)
    }
  }
  return { removed, scanned: files.length, removedNames }
}

// ── Renommage intelligent en masse : "Catégorie NN.ext" ─────────────────────
// Numérotation par dossier et par catégorie (Photo Produit 01, 02… Facture 01…).
// classifyFn(name, ext) → { category }
const sanitizeForFilename = (s) =>
  (s || 'Document').replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim()

export async function renameAllNodes(userId, classifyFn, onProgress) {
  const all   = await backend.list(userId)
  const files = all.filter(n => n.type === 'file')

  const byParent = {}
  for (const f of files) (byParent[f.parentId] ||= []).push(f)

  let done = 0, renamed = 0
  for (const group of Object.values(byParent)) {
    group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    const counters = {}
    for (const f of group) {
      const ext = f.ext || extOf(f.name)
      const { category } = classifyFn(f.name, ext)
      counters[category] = (counters[category] || 0) + 1
      const n = String(counters[category]).padStart(2, '0')
      const newName = `${sanitizeForFilename(category)} ${n}${ext ? '.' + ext : ''}`
      if (newName !== f.name) {
        const node = await backend.getNode(f.id)
        if (node) {
          node.name = newName
          node.aiCategory = category
          node.updatedAt = new Date().toISOString()
          await backend.putNode(node)
          renamed++
        }
      }
      done++
      if (onProgress) onProgress({ current: done, total: files.length })
    }
    await new Promise(r => setTimeout(r, 0))
  }
  return { renamed, total: files.length }
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
