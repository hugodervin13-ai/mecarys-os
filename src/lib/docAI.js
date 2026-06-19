// MECARYS OS — Moteur d'analyse documentaire IA
//
// Architecture en couches prévue pour l'intégration de providers IA réels :
//
//   Couche 1 — Règles déterministes (actuelle)
//     Analyse du nom de fichier + type MIME → classification rapide, 0 ms
//
//   Couche 2 — Vision / OCR (stub prêt, à activer)
//     Images   → Claude Vision / OpenAI GPT-4V  (voir AI_HOOKS.vision)
//     PDFs     → pdf.js (extraction texte) + Claude (résumé/entités)
//     OCR      → Tesseract.js ou Google Vision API
//
//   Couche 3 — LLM avancé (stub prêt)
//     Factures → extraction structurée (numéro, montant, date, fournisseur)
//     Certifs  → organisme, validité, date d'expiration
//     Contrats → parties, obligations clés
//
// Pour activer un provider, implémenter le hook dans AI_HOOKS et
// appeler le dans analyzeFiles() — AUCUN changement d'UI nécessaire.

import { extOf, kindOf } from './fileStore'

// ─── Catalogue de catégories ──────────────────────────────────────────────────
export const CATEGORIES = {
  'Photos Produit':     { icon: '🖼️',  color: '#6366f1', desc: 'Photos du produit fini' },
  'Photos Packaging':   { icon: '📦',  color: '#8b5cf6', desc: 'Visuels emballage / boîte' },
  'Avant / Après':      { icon: '↔️',  color: '#7c3aed', desc: 'Comparaisons et résultats' },
  'Vidéos':             { icon: '🎬',  color: '#ec4899', desc: 'Vidéos produit et démo' },
  'Factures':           { icon: '🧾',  color: '#d97706', desc: 'Factures fournisseurs et achats' },
  'Certificats':        { icon: '📜',  color: '#059669', desc: 'CE, ISO, attestations' },
  'Fiches de Sécurité': { icon: '⚠️',  color: '#dc2626', desc: 'MSDS, SDS, fiches danger' },
  'Notices':            { icon: '📋',  color: '#2563eb', desc: 'Manuels, guides, instructions' },
  'Amazon':             { icon: '🛒',  color: '#f59e0b', desc: 'Visuels, listings, templates FBA' },
  'Logistique':         { icon: '🚢',  color: '#0891b2', desc: 'Transport, CMR, BL, douanes' },
  'Marketing':          { icon: '📣',  color: '#9333ea', desc: 'Pubs, banners, campagnes' },
  'Documents':          { icon: '📄',  color: '#6b7280', desc: 'Autres documents' },
}

// ─── Règles de classification par pattern de nom ─────────────────────────────
const PATTERN_RULES = [
  { re: /factur|invoice|bill|receipt|reçu|achat[_\s-]/i,                         cat: 'Factures' },
  { re: /certif|[_.\s-]ce[_.\s-]|iso[_.\s-]?\d|norme|attestation|conformit/i,   cat: 'Certificats' },
  { re: /msds|[_.\s]sds[_.\s]|[_.\s]fds[_.\s]|safety.?data|securit[eé]|hazard/i,cat: 'Fiches de Sécurité' },
  { re: /notice|manuel|manual|guide[_.\s]|instruction|mode.?emploi|tutoriel/i,    cat: 'Notices' },
  { re: /amazon|aplus|a\+|[_.\s]fba[_.\s]|listing|bullet.?point|template.*fba/i, cat: 'Amazon' },
  { re: /transport|logistiq|shipping|[_.\s]bl[_.\s]|[_.\s]cmr[_.\s]|douane|customs|fret/i, cat: 'Logistique' },
  { re: /market|campagne|publicit|advert|promo[_.\s]|banner|bannière/i,            cat: 'Marketing' },
  { re: /packag|emball|boite|carton|[_.\s]box[_.\s]|sleeve|etiquette|label/i,     cat: 'Photos Packaging' },
  { re: /avant.?apr[eè]s|before.?after|comparai|[_.\s]vs[_.\s]/i,                cat: 'Avant / Après' },
]

// ─── Classification d'un fichier (règles déterministes) ───────────────────────
export function classifyFile(filename, ext) {
  const kind  = kindOf(ext)
  const lower = (filename || '').toLowerCase()

  // Pattern rules (priority over type)
  for (const { re, cat } of PATTERN_RULES) {
    if (re.test(lower)) return { category: cat, confidence: 0.85, method: 'filename_pattern' }
  }

  // Type-based fallback
  if (kind === 'video') return { category: 'Vidéos',         confidence: 0.95, method: 'file_type' }
  if (kind === 'pdf')   return { category: 'Documents',      confidence: 0.50, method: 'file_type' }
  if (kind === 'image') return { category: 'Photos Produit', confidence: 0.60, method: 'file_type' }
  if (kind === 'doc')   return { category: 'Documents',      confidence: 0.50, method: 'file_type' }
  return { category: 'Documents', confidence: 0.30, method: 'default' }
}

// ─── Extraction de métadonnées structurées depuis le nom de fichier ───────────
export function extractMeta(filename, category) {
  const f = filename || ''
  const meta = {}

  if (category === 'Factures') {
    const num  = f.match(/(?:inv|fac|fact|ref|n°|no)[_\s-]?([A-Z0-9-]{3,20})/i)
    if (num)  meta.numero = num[1]
    const date = f.match(/(\d{4}[-_/]\d{2}[-_/]\d{2}|\d{2}[-_/]\d{2}[-_/]\d{4})/)
    if (date) meta.date = date[1]
    const amt  = f.match(/(\d[\d\s]*[.,]\d{2})\s*(?:€|eur|\$|usd|¥|cny)/i)
    if (amt)  meta.montant = amt[1]
  }

  if (category === 'Certificats') {
    if (/\bce\b/i.test(f)) meta.type = 'CE'
    const iso  = f.match(/iso[_\s-]?(\d+)/i)
    if (iso)  meta.type = `ISO ${iso[1]}`
    const yr   = f.match(/(202\d|201\d)/)
    if (yr)   meta.annee = yr[1]
  }

  if (category === 'Fiches de Sécurité') {
    const ver  = f.match(/\bv(\d+[\d.]*)\b/i)
    if (ver)  meta.version = `v${ver[1]}`
    const date = f.match(/(\d{4}[-_/]\d{2}[-_/]\d{2}|\d{2}[-_/]\d{2}[-_/]\d{4})/)
    if (date) meta.date = date[1]
  }

  return meta
}

// ─── Analyse batch d'un tableau de File objects ───────────────────────────────
// onProgress({ current, total }) → callback de progression
export async function analyzeFiles(fileObjects, onProgress) {
  const results = []
  for (let i = 0; i < fileObjects.length; i++) {
    const f   = fileObjects[i]
    const ext = extOf(f.name)
    const { category, confidence, method } = classifyFile(f.name, ext)
    const metadata = extractMeta(f.name, category)

    // ── Hook IA optionnel (désactivé par défaut) ─────────────────────────
    // if (AI_HOOKS.vision && kindOf(ext) === 'image') {
    //   const insight = await AI_HOOKS.vision(f) // GPT-4V / Claude Vision
    //   if (insight.category) category = insight.category
    //   Object.assign(metadata, insight.metadata)
    // }
    // if (AI_HOOKS.ocr && kindOf(ext) === 'pdf') {
    //   const text = await AI_HOOKS.ocr(f)  // pdf.js + Tesseract.js
    //   const insight = await AI_HOOKS.llm(text, 'classify_document')
    //   if (insight.category) category = insight.category
    //   Object.assign(metadata, insight.metadata)
    // }
    // ────────────────────────────────────────────────────────────────────

    results.push({ file: f, category, confidence, method, metadata })

    if (onProgress && (i % 5 === 0 || i === fileObjects.length - 1)) {
      onProgress({ current: i + 1, total: fileObjects.length })
    }
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 0)) // yield UI thread
  }
  return results
}

// ─── Groupement par catégorie ─────────────────────────────────────────────────
export function groupByCategory(results) {
  const groups = {}
  for (const r of results) {
    ;(groups[r.category] ||= []).push(r)
  }
  return groups
}

// ─── Statistiques de type sur une liste de nodes ─────────────────────────────
export function computeTypeStats(fileNodes) {
  const counts = { images: 0, videos: 0, pdfs: 0, docs: 0, other: 0, total: 0, totalSize: 0 }
  for (const n of fileNodes) {
    const k = kindOf(n.ext || extOf(n.name))
    if (k === 'image')  counts.images++
    else if (k === 'video') counts.videos++
    else if (k === 'pdf')   counts.pdfs++
    else if (k === 'doc')   counts.docs++
    else                    counts.other++
    counts.total++
    counts.totalSize += n.size || 0
  }
  return counts
}

// ─── Extraction de texte PDF côté navigateur (sans bibliothèque externe) ────────
// Fonctionne pour les PDFs générés par logiciels (devis, factures, bons de
// commande). Les PDFs scannés nécessiteraient un OCR côté serveur.
// Technique : décode le binaire en latin-1 puis cherche les opérateurs PDF
// Tj et TJ (text-show) dans les flux de contenu non compressés.
export async function extractPdfText(blob) {
  try {
    const buf = await blob.arrayBuffer()
    const raw = new TextDecoder('latin1').decode(new Uint8Array(buf))
    const texts = []
    // Opérateur Tj : (texte) Tj
    const re1 = /\(([^)\\]{1,200}(?:\\.[^)\\]{0,50})*)\)\s*Tj/g
    let m
    while ((m = re1.exec(raw)) !== null) {
      const t = m[1]
        .replace(/\\n/g,' ').replace(/\\r/g,' ')
        .replace(/\\\(/g,'(').replace(/\\\)/g,')')
        .replace(/\\\\/g,'\\').replace(/\s+/g,' ').trim()
      if (t.length > 1 && /[a-zA-ZÀ-ÿ0-9]/.test(t)) texts.push(t)
    }
    // Opérateur TJ : [(texte) -kern (texte)] TJ
    const re2 = /\[([^\]]{1,1000})\]\s*TJ/g
    while ((m = re2.exec(raw)) !== null) {
      const inner = m[1]
      const re3 = /\(([^)]{1,150})\)/g
      let m2
      while ((m2 = re3.exec(inner)) !== null) {
        const t = m2[1].replace(/\s+/g,' ').trim()
        if (t.length > 1 && /[a-zA-ZÀ-ÿ0-9]/.test(t)) texts.push(t)
      }
    }
    return texts.slice(0, 300).join(' ')
  } catch { return '' }
}

// ─── Parse les métadonnées structurées depuis le texte extrait d'un PDF ─────
export function parseDocumentMeta(text) {
  if (!text || text.length < 10) return {}
  const result = {}

  // Type de document (priorité décroissante)
  const typeMap = [
    [/\bDEVIS\b/i,                                        'Devis'],
    [/\bFACTURE\b|\bINVOICE\b/i,                         'Facture'],
    [/\bPROFORMA\b/i,                                     'Proforma'],
    [/\bBON\s+DE\s+COMMANDE\b|\bPURCHASE\s+ORDER\b/i,    'Bon de Commande'],
    [/\bBON\s+DE\s+LIVRAISON\b|\bDELIVERY\s+NOTE\b/i,    'Bon de Livraison'],
    [/\bPACKING\s+LIST\b/i,                               'Packing List'],
    [/\bCERTIFICAT\b|\bCERTIFICATE\b/i,                  'Certificat'],
    [/\bCONTRAT\b|\bCONTRACT\b/i,                        'Contrat'],
    [/\bREÇU\b|\bRECEIPT\b/i,                             'Reçu'],
  ]
  for (const [re, label] of typeMap) {
    if (re.test(text)) { result.docType = label; break }
  }

  // Référence (WEB-260421-H8W1, INV-2024-001, FAC-0042, etc.)
  const refM = text.match(/\bRef\.?\s*:?\s*([A-Z]{2,6}[-][\dA-Z]{4,15})\b/i)
    || text.match(/\b([A-Z]{2,6}[-][\d]{4,8}[-][A-Z0-9]{2,8})\b/)
    || text.match(/\b((?:INV|FAC|FACT|CMD|PO|WEB|REF|BL|BDC)[-_][\dA-Z]{3,15})\b/i)
  if (refM) result.ref = (refM[1] || refM[0]).toUpperCase().replace(/^REF\.\s*/i, '')

  return result
}

// ─── Construit un nom de fichier propre depuis les métadonnées parsées ───────
export function buildSmartName(meta, ext = '') {
  const parts = []
  if (meta.docType) parts.push(meta.docType)
  if (meta.ref)     parts.push(meta.ref)
  if (!parts.length) return null
  const dotExt = ext ? (ext.startsWith('.') ? ext : `.${ext}`) : ''
  return parts.join(' - ').replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() + dotExt
}

// ─── Stubs providers IA (à implémenter) ──────────────────────────────────────
// Brancher un provider ici suffit — l'UI ne change pas.
export const AI_HOOKS = {
  // vision: async (imageFile) => { category, confidence, tags, description }
  // ocr:    async (pdfFile)   => string (texte extrait)
  // llm:    async (text, task) => { category, metadata, summary }
  vision: null,
  ocr:    null,
  llm:    null,
}
