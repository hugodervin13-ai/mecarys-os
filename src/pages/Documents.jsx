import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useStore, toast } from '../lib/store'
import { colors, box, inp, lbl } from '../lib/theme'
import { formatDate } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import ContextMenu from '../components/ContextMenu'
import FilePreview from '../components/FilePreview'
import {
  listNodes, createFolder, updateFolder, uploadFiles, uploadWithAIOrganize,
  autoOrganizeNodes, updateNodeMeta, renameNode, moveNode, deleteNode,
  downloadFile, getFileUrl, folderStats, descendantIds, kindOf, extOf, formatSize,
  dedupeAllNodes, renameAllNodes,
  ACCEPT_ATTR, ACCEPTED_EXT,
} from '../lib/fileStore'
import {
  classifyFile, extractMeta, analyzeFiles, groupByCategory,
  computeTypeStats, CATEGORIES,
} from '../lib/docAI'

// ─── Helpers visuels ────────────────────────────────────────────────────────
const fileIcon = name => {
  const k = kindOf(extOf(name))
  return k==='image'?'🖼️':k==='pdf'?'📕':k==='video'?'🎬':k==='doc'?'📄':'📎'
}
const fileColor = name => {
  const k = kindOf(extOf(name))
  return k==='image'?'#6366f1':k==='pdf'?'#ef4444':k==='video'?'#ec4899':k==='doc'?'#10b981':'#6b7280'
}

// ─── Détection de doublons ───────────────────────────────────────────────────
// Renvoie { unique: File[], dupes: File[] } en comparant nom + taille exacte
const filterDuplicates = (fileList, existingNodes) => {
  const existingSet = new Set(existingNodes.map(n => `${n.name}::${n.size}`))
  const unique = [], dupes = []
  for (const f of fileList) {
    if (existingSet.has(`${f.name}::${f.size}`)) dupes.push(f)
    else unique.push(f)
  }
  return { unique, dupes }
}

// ─── Suggestions de renommage intelligent ────────────────────────────────────
const generateRenameSugs = (node, siblings) => {
  if (node.type === 'folder') return []
  const ext = node.ext ? `.${node.ext}` : ''
  const base = node.name.replace(/\.[^.]+$/, '')
  const sugs = new Set()

  // 1. Nom nettoyé : underscores → espaces, majuscule initiale
  const clean = base.trim().replace(/[_]+/g, ' ').replace(/\s+/g, ' ').replace(/^(.)/, c => c.toUpperCase())
  if (clean + ext !== node.name) sugs.add(clean + ext)

  // 2. Suggestion basée sur la catégorie IA
  if (node.aiCategory) {
    const cat = node.aiCategory
    const samecat = siblings.filter(s => s.aiCategory === cat && s.id !== node.id).length + 1
    const n = String(samecat).padStart(2, '0')
    const labels = {
      'Photos Produit': `Photo Produit ${n}`,
      'Photos Packaging': `Packaging ${n}`,
      'Avant / Après': `Avant-Après ${n}`,
      'Vidéos': `Vidéo Produit ${n}`,
      'Factures': `Facture ${n}`,
      'Certificats': `Certificat ${n}`,
      'Fiches de Sécurité': `Fiche Sécurité ${n}`,
      'Notices': `Notice ${n}`,
    }
    if (labels[cat]) sugs.add(labels[cat] + ext)
  }

  // 3. Nom horodaté (utile pour factures/certifs)
  const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
  if (node.aiCategory === 'Factures' || node.aiCategory === 'Certificats') {
    sugs.add(`${clean} - ${today}${ext}`)
  }

  return [...sugs].filter(s => s !== node.name).slice(0, 4)
}

// ─── Etat de la pipeline IA ──────────────────────────────────────────────────
const AI_IDLE    = { phase:'idle' }
const AI_INIT    = (total) => ({ phase:'analyzing', progress:0, current:0, total, results:null, groups:null })
const AI_REVIEW  = (results,groups,mode='import') => ({ phase:'reviewing', mode, results, groups })
const AI_UPLOAD  = (total) => ({ phase:'uploading', progress:0, current:0, total })
const AI_ORGANIZE= (total) => ({ phase:'organizing', progress:0, current:0, total })
const AI_DONE    = (summary) => ({ phase:'done', summary })
const AI_CLEAN   = (label,total) => ({ phase:'cleaning', label, progress:0, current:0, total })

export default function Documents() {
  const { user } = useStore()

  // ── Données ────────────────────────────────────────────────────────────
  const [nodes,   setNodes]   = useState([])
  const [loading, setLoading] = useState(true)

  // ── Navigation ─────────────────────────────────────────────────────────
  const [path, setPath] = useState([])     // pile de dossiers (breadcrumb)
  const currentParentId = path.length ? path[path.length-1].id : null
  const atRoot = path.length === 0

  // ── Filtres / UI ────────────────────────────────────────────────────────
  const [search,  setSearch]  = useState('')
  const [catFilter, setCat]   = useState('all')   // 'all' | category name
  const [sortBy,  setSortBy]  = useState('name')
  const [view,    setView]    = useState('grid')
  const [dragOver,setDragOver]= useState(false)
  const [preview, setPreview] = useState(null)
  const [menu,    setMenu]    = useState(null)
  const [busy,    setBusy]    = useState(false)
  const [dismissOrganize, setDismissOrganize] = useState(false)

  // ── Modales classiques ──────────────────────────────────────────────────
  const [folderModal,  setFolderModal]  = useState(false)
  const [folderForm,   setFolderForm]   = useState({ name:'', asin:'' })
  const [renameModal,  setRenameModal]  = useState(null)
  const [renameVal,    setRenameVal]    = useState('')
  const [renameSugs,   setRenameSugs]   = useState([])
  const [moveModal,    setMoveModal]    = useState(null)
  const [confirm,      setConfirm]      = useState(null)
  const [cleanConfirm, setCleanConfirm] = useState(false)

  // ── Pipeline IA ─────────────────────────────────────────────────────────
  const [ai, setAI] = useState(AI_IDLE)

  // ── Refs ────────────────────────────────────────────────────────────────
  const fileInputRef   = useRef(null)
  const folderInputRef = useRef(null)

  // webkitdirectory doit être posé en impératif (pas supporté comme prop JSX en React 19)
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '')
      folderInputRef.current.setAttribute('directory', '')
    }
  }, [])

  // ── Chargement ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    try {
      setNodes(await listNodes(user.id))
    } catch (e) {
      toast(`Erreur : ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Nettoie le breadcrumb si un dossier a été supprimé
  useEffect(() => {
    if (!path.length) return
    const ids = new Set(nodes.map(n=>n.id))
    const valid = []
    for (const p of path) { if (ids.has(p.id)) valid.push(p); else break }
    if (valid.length !== path.length) setPath(valid)
  }, [nodes]) // eslint-disable-line

  // ── Statistiques ────────────────────────────────────────────────────────
  const fStats  = useMemo(() => folderStats(nodes), [nodes])

  const typeStats = useMemo(() => {
    // Compte les fichiers directs du niveau courant (pas récursif)
    const directFiles = nodes.filter(n => n.type==='file' && n.parentId===currentParentId)
    return computeTypeStats(directFiles)
  }, [nodes, currentParentId])

  // Fichiers non organisés au niveau courant (pas dans un sous-dossier déjà catégorisé)
  const unorganizedFiles = useMemo(() => (
    nodes.filter(n => n.type==='file' && n.parentId===currentParentId && !n.aiCategory)
  ), [nodes, currentParentId])

  // ── Éléments du niveau courant (filtre + tri) ───────────────────────────
  const items = useMemo(() => {
    let list = nodes.filter(n => n.parentId===currentParentId)

    // Filtre texte
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(n =>
        n.name.toLowerCase().includes(q) ||
        (n.asin||'').toLowerCase().includes(q) ||
        (n.aiCategory||'').toLowerCase().includes(q)
      )
    }

    // Filtre catégorie
    if (catFilter !== 'all') {
      list = list.filter(n =>
        n.type === 'folder'
          ? n.name === catFilter
          : n.aiCategory === catFilter || (CATEGORIES[catFilter] && kindOf(extOf(n.name)) === kindOf(extOf(catFilter)))
      )
    }

    // Tri (dossiers toujours avant les fichiers)
    list.sort((a,b) => {
      if (a.type!==b.type) return a.type==='folder'?-1:1
      if (sortBy==='date') return new Date(b.createdAt)-new Date(a.createdAt)
      if (sortBy==='size') return ((fStats[b.id]?.size||b.size||0)-(fStats[a.id]?.size||a.size||0))
      return a.name.localeCompare(b.name,'fr')
    })
    return list
  }, [nodes, currentParentId, search, sortBy, catFilter, fStats])

  // Catégories présentes au niveau courant (pour le filtre)
  const presentCats = useMemo(() => {
    const cats = new Set(
      nodes.filter(n => n.type==='file' && n.parentId===currentParentId && n.aiCategory)
           .map(n => n.aiCategory)
    )
    return [...cats]
  }, [nodes, currentParentId])

  // ── Navigation ──────────────────────────────────────────────────────────
  const openFolder = (folder) => { setPath(p=>[...p,folder]); setSearch(''); setCat('all') }
  const goTo = (i) => { setPath(p=>p.slice(0,i)); setSearch(''); setCat('all') }
  const openItem = (node) => { if (node.type==='folder') openFolder(node); else setPreview(node) }

  // ── Création dossier ─────────────────────────────────────────────────────
  const submitFolder = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      await createFolder(user.id, { name:folderForm.name, parentId:currentParentId, isProduct:atRoot, asin:atRoot?folderForm.asin:'' })
      toast('Dossier créé','success')
      setFolderModal(false); setFolderForm({name:'',asin:''}); await load()
    } catch(e){ toast(e.message) } finally { setBusy(false) }
  }

  const quickSubfolder = async (name) => {
    setBusy(true)
    try {
      await createFolder(user.id,{name,parentId:currentParentId})
      toast(`« ${name} » créé`,'success'); await load()
    } catch(e){ toast(e.message) } finally { setBusy(false) }
  }

  // ── Upload fichiers classiques ───────────────────────────────────────────
  const handleFiles = async (fileList) => {
    if (!fileList?.length) return
    if (atRoot) { toast("Ouvrez un dossier avant d'ajouter des fichiers"); return }
    setBusy(true)
    try {
      const siblings = nodes.filter(n => n.parentId === currentParentId && n.type === 'file')
      const { unique, dupes } = filterDuplicates(Array.from(fileList), siblings)
      if (!unique.length) { toast(`${dupes.length} fichier${dupes.length>1?'s':''} déjà présent${dupes.length>1?'s':''} (doublons ignorés)`); setBusy(false); return }
      const created = await uploadFiles(user.id, unique, currentParentId)
      const msg = dupes.length
        ? `${created.length} ajouté${created.length>1?'s':''} · ${dupes.length} doublon${dupes.length>1?'s':''} ignoré${dupes.length>1?'s':''}`
        : `${created.length} fichier${created.length>1?'s':''} ajouté${created.length>1?'s':''}`
      toast(msg, 'success')
      await load()
    } catch(e){ toast(e.message) } finally { setBusy(false) }
  }

  // ── Import dossier avec analyse IA ──────────────────────────────────────
  const handleFolderImport = async (fileList) => {
    if (!fileList?.length) return
    const valid = Array.from(fileList).filter(f => ACCEPTED_EXT.includes(extOf(f.name)))
    if (!valid.length) { toast('Aucun fichier compatible trouvé'); return }

    try {
      setAI(AI_INIT(valid.length))
      const results = await analyzeFiles(valid, ({current,total}) =>
        setAI(s => ({...s, progress:current/total, current, total}))
      )
      const groups = groupByCategory(results)
      setAI(AI_REVIEW(results, groups))
    } catch(e) {
      setAI(AI_IDLE)
      toast(e?.message || 'Erreur lors de l\'analyse')
    }
  }

  const confirmAIImport = async () => {
    if (!ai.results) return
    const total = ai.results.length

    // ── Mode organisation : déplacer les fichiers existants ─────────────────
    if (ai.mode === 'organize') {
      setAI(AI_ORGANIZE(total))
      try {
        const groups = ai.groups
        const folderIds = {}
        for (const cat of Object.keys(groups)) {
          const folder = await createFolder(user.id, { name:cat, parentId:currentParentId||null })
          folderIds[cat] = folder.id
        }
        let done = 0
        for (const r of ai.results) {
          await moveNode(r.file.id, folderIds[r.category], nodes)
          if (r.metadata && Object.keys(r.metadata).length)
            await updateNodeMeta(r.file.id, { aiCategory:r.category, aiMetadata:r.metadata, processedAt:new Date().toISOString() })
          done++
          setAI(s=>({...s, progress:done/total, current:done, total}))
          if (done % 5 === 0) await new Promise(res=>setTimeout(res,0))
        }
        await load()
        setAI(AI_DONE({ organized:done, folders:Object.keys(groups).length, skipped:0 }))
      } catch(e) { toast(e.message); setAI(AI_IDLE) }
      return
    }

    // ── Mode import : uploader les fichiers analysés ─────────────────────────
    setAI(AI_UPLOAD(total))
    try {
      const summary = await uploadWithAIOrganize(user.id, currentParentId, ai.results,
        ({current,total}) => setAI(s=>({...s, progress:current/total, current, total}))
      )
      await load()
      setAI(AI_DONE(summary))
    } catch(e) { toast(e.message); setAI(AI_IDLE) }
  }

  // ── 🤖 Nettoyage complet : dédoublonnage + renommage de TOUTE la bibliothèque ──
  const handleCleanAll = async () => {
    setCleanConfirm(false)
    const allFiles = nodes.filter(n => n.type === 'file')
    if (!allFiles.length) { toast('Aucun fichier à nettoyer'); return }
    try {
      // Étape 1 — supprimer les doublons par contenu identique
      setAI(AI_CLEAN('Recherche des doublons identiques…', allFiles.length))
      const dedup = await dedupeAllNodes(user.id, ({current,total}) =>
        setAI(s => ({...s, progress:current/total, current, total}))
      )
      // Étape 2 — renommer chaque fichier (Catégorie NN.ext)
      const remaining = allFiles.length - dedup.removed
      setAI(AI_CLEAN('Renommage intelligent des fichiers…', remaining))
      const ren = await renameAllNodes(user.id, classifyFile, ({current,total}) =>
        setAI(s => ({...s, progress:current/total, current, total}))
      )
      await load()
      setAI({ phase:'done', mode:'clean', summary:{ removed:dedup.removed, renamed:ren.renamed, scanned:dedup.scanned } })
    } catch(e) { toast(e.message); setAI(AI_IDLE) }
  }

  // ── Analyser les fichiers déjà présents dans le dossier courant ──────────
  const handleAnalyzeExisting = async () => {
    const currentFiles = nodes.filter(n => n.type==='file' && n.parentId===currentParentId)
    if (!currentFiles.length) { toast('Aucun fichier dans ce dossier'); return }
    try {
      setAI(AI_INIT(currentFiles.length))
      // analyzeFiles n'utilise que f.name — les nodes conviennent parfaitement
      const results = await analyzeFiles(currentFiles, ({current,total}) =>
        setAI(s=>({...s, progress:current/total, current, total}))
      )
      const groups = groupByCategory(results)
      setAI(AI_REVIEW(results, groups, 'organize'))
    } catch(e) {
      setAI(AI_IDLE)
      toast(e?.message || 'Erreur lors de l\'analyse')
    }
  }

  // ── Renommer ────────────────────────────────────────────────────────────
  const submitRename = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      await renameNode(renameModal.id, renameVal)
      if (renameModal.type==='folder'&&renameModal.isProduct) await updateFolder(renameModal.id,{asin:renameModal.asin||''})
      toast('Modifié','success'); setRenameModal(null); await load()
    } catch(e){ toast(e.message) } finally { setBusy(false) }
  }

  // ── Déplacer ─────────────────────────────────────────────────────────────
  const doMove = async (destId) => {
    setBusy(true)
    try {
      await moveNode(moveModal.id, destId, nodes)
      toast('Déplacé','success'); setMoveModal(null); await load()
    } catch(e){ toast(e.message) } finally { setBusy(false) }
  }

  // ── Supprimer ────────────────────────────────────────────────────────────
  const doDelete = async () => {
    setBusy(true)
    try {
      await deleteNode(confirm.node.id)
      toast('Supprimé','success'); setConfirm(null); await load()
    } catch(e){ toast(e.message) } finally { setBusy(false) }
  }

  // ── Menu contextuel ──────────────────────────────────────────────────────
  const openMenu  = (e,node) => { e.preventDefault(); e.stopPropagation(); setMenu({x:e.clientX,y:e.clientY,node}) }
  const askDelete = (node) => { const s=node.type==='folder'?fStats[node.id]:null; setConfirm({node,count:s?s.files:0}) }
  const menuItems = (node) => {
    const isF = node.type==='folder'
    return [
      { icon:isF?'📂':'👁️', label:isF?'Ouvrir':'Aperçu',    onClick:()=>openItem(node) },
      { icon:'✏️',           label:'Renommer',               onClick:()=>{ const sibs=nodes.filter(n=>n.parentId===currentParentId&&n.id!==node.id); setRenameModal(node); setRenameVal(node.name); setRenameSugs(generateRenameSugs(node,sibs)) } },
      { icon:'↪️',           label:'Déplacer',               onClick:()=>setMoveModal(node) },
      !isF&&{ icon:'⬇️',    label:'Télécharger',            onClick:()=>downloadFile(node.id,node.name) },
      { divider:true },
      { icon:'🗑️', label:'Supprimer', danger:true, onClick:()=>askDelete(node) },
    ].filter(Boolean)
  }

  if (loading) return <Loading />

  const canOrganize = !atRoot && unorganizedFiles.length > 1

  return (
    <div
      onDragOver={e=>{ if(!atRoot){e.preventDefault();setDragOver(true)} }}
      onDragLeave={e=>{ if(e.target===e.currentTarget) setDragOver(false) }}
      onDrop={e=>{ e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
      style={{ minHeight:'100%' }}
    >
      <style>{`
        @keyframes docPop { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
        @keyframes docFade { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes aiPulse { 0%,100% { opacity:0.6 } 50% { opacity:1 } }
        .doc-card { transition:all .15s ease; cursor:pointer; }
        .doc-card:hover { border-color:#5046e4 !important; box-shadow:0 8px 24px rgba(80,70,228,0.12) !important; transform:translateY(-2px); }
        .doc-row:hover { background:#f7f6f3 !important; }
        .doc-row { transition:background .1s; cursor:pointer; }
      `}</style>

      {/* ══════════ HEADER ══════════ */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        <Breadcrumb path={path} goTo={goTo} />

        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {/* 🤖 Nettoyage complet de toute la bibliothèque */}
          {nodes.some(n=>n.type==='file') && (
            <button onClick={()=>setCleanConfirm(true)} disabled={busy}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:busy?'wait':'pointer', boxShadow:'0 2px 8px rgba(5,150,105,0.25)' }}>
              🤖 Tout nettoyer
            </button>
          )}

          {/* Analyser les fichiers existants */}
          {!atRoot && nodes.some(n=>n.type==='file'&&n.parentId===currentParentId) && (
            <button onClick={handleAnalyzeExisting} disabled={busy}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'linear-gradient(135deg,#5046e4,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:busy?'wait':'pointer', boxShadow:'0 2px 8px rgba(80,70,228,0.25)' }}>
              ✨ Analyser avec l'IA
            </button>
          )}

          {/* Importer un dossier */}
          {!atRoot && (
            <button
              onClick={()=>folderInputRef.current?.click()} disabled={busy}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#fff', color:'#5046e4', border:'1.5px solid #5046e4', borderRadius:10, fontSize:13, fontWeight:600, cursor:busy?'wait':'pointer' }}
            >
              ⬆ Importer un dossier
            </button>
          )}

          {/* Ajouter des fichiers */}
          {!atRoot && (
            <button onClick={()=>fileInputRef.current?.click()} disabled={busy}
              style={{ padding:'8px 14px', background:'#fff', color:'#5046e4', border:'1.5px solid #5046e4', borderRadius:10, fontSize:13, fontWeight:600, cursor:busy?'wait':'pointer' }}>
              ⬆ Fichiers
            </button>
          )}

          {/* Nouveau dossier */}
          <button onClick={()=>{ setFolderForm({name:'',asin:''}); setFolderModal(true) }}
            style={{ padding:'8px 14px', background:'#f5f4f0', color:'#374151', border:'1.5px solid #ebebE6', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            + {atRoot?'Dossier produit':'Sous-dossier'}
          </button>
        </div>
      </div>

      {/* ══════════ STATS BAR (dans un dossier, pas à la racine) ══════════ */}
      {!atRoot && typeStats.total > 0 && (
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          {[
            { label:'Images',   count:typeStats.images,  icon:'🖼️',  color:'#6366f1' },
            { label:'Vidéos',   count:typeStats.videos,  icon:'🎬',  color:'#ec4899' },
            { label:'PDFs',     count:typeStats.pdfs,    icon:'📕',  color:'#ef4444' },
            { label:'Docs',     count:typeStats.docs,    icon:'📄',  color:'#10b981' },
          ].filter(s=>s.count>0).map(s=>(
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:`${s.color}10`, border:`1px solid ${s.color}25` }}>
              <span style={{ fontSize:12 }}>{s.icon}</span>
              <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{s.count}</span>
              <span style={{ fontSize:11, color:'#9ca3af', fontWeight:500 }}>{s.label}</span>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:'#f5f4f0', border:'1px solid #ebebE6', marginLeft:'auto' }}>
            <span style={{ fontSize:11, color:'#6b7280', fontWeight:500 }}>{typeStats.total} fichier{typeStats.total>1?'s':''}</span>
            <span style={{ fontSize:11, color:'#d1d5db' }}>·</span>
            <span style={{ fontSize:11, color:'#6b7280', fontWeight:500 }}>{formatSize(typeStats.totalSize)}</span>
          </div>
        </div>
      )}

      {/* ══════════ BANNIÈRE "ORGANISER AVEC L'IA" ══════════ */}
      {canOrganize && ai.phase==='idle' && !dismissOrganize && (
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:14, background:'linear-gradient(135deg,#ede9fe,#ddd6fe)', border:'1.5px solid #c4b5fd', marginBottom:14, animation:'docFade .3s ease' }}>
          <div style={{ fontSize:22 }}>✨</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#3730a3' }}>Organiser automatiquement avec l'IA</div>
            <div style={{ fontSize:11, color:'#5b21b6', marginTop:1 }}>
              {unorganizedFiles.length} fichier{unorganizedFiles.length>1?'s':''} non classé{unorganizedFiles.length>1?'s':''} dans ce dossier — l'IA peut créer les sous-dossiers et les ranger automatiquement.
            </div>
          </div>
          <button onClick={handleAnalyzeExisting} style={{ padding:'8px 16px', background:'#5046e4', color:'#fff', border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            Analyser et organiser
          </button>
          <button onClick={()=>setDismissOrganize(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'#7c3aed', fontSize:16, padding:4 }} title="Ignorer">✕</button>
        </div>
      )}

      {/* ══════════ BARRE DE RECHERCHE + FILTRES ══════════ */}
      {nodes.length>0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {/* Search */}
            <div style={{ position:'relative', flex:'1 1 260px', minWidth:200 }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#9ca3af' }}>🔍</span>
              <input
                value={search} onChange={e=>setSearch(e.target.value)}
                placeholder={atRoot?'Rechercher un dossier, un ASIN…':'Rechercher nom, catégorie…'}
                style={{ ...inp, paddingLeft:34, background:'#fff', border:'1.5px solid #ebebE6' }}
                onFocus={e=>(e.target.style.borderColor='#5046e4')}
                onBlur={e=>(e.target.style.borderColor='#ebebE6')}
              />
            </div>

            {/* Sort */}
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{ ...inp, width:'auto', cursor:'pointer', background:'#fff', border:'1.5px solid #ebebE6' }}>
              <option value="name">Nom A→Z</option>
              <option value="date">Plus récent</option>
              <option value="size">Plus grand</option>
            </select>

            {/* View toggle */}
            <div style={{ display:'flex', border:'1.5px solid #ebebE6', borderRadius:9, overflow:'hidden', background:'#fff' }}>
              {['grid','list'].map(v=>(
                <button key={v} onClick={()=>setView(v)}
                  style={{ padding:'7px 12px', border:'none', background:view===v?'#5046e4':'transparent', color:view===v?'#fff':'#9ca3af', cursor:'pointer', fontSize:13, transition:'all .15s' }}>
                  {v==='grid'?'▦':'☰'}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter pills (only when there are categorized files) */}
          {presentCats.length > 0 && !atRoot && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button onClick={()=>setCat('all')} style={{ padding:'4px 12px', borderRadius:20, border:`1.5px solid ${catFilter==='all'?'#5046e4':'#ebebE6'}`, background:catFilter==='all'?'#5046e4':'#fff', color:catFilter==='all'?'#fff':'#6b7280', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
                Tous
              </button>
              {presentCats.map(cat=>{
                const c = CATEGORIES[cat]
                const active = catFilter===cat
                return (
                  <button key={cat} onClick={()=>setCat(active?'all':cat)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 12px', borderRadius:20, border:`1.5px solid ${active?c?.color||'#5046e4':'#ebebE6'}`, background:active?(c?.color||'#5046e4'):'#fff', color:active?'#fff':'#6b7280', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
                    <span>{c?.icon||'📄'}</span> {cat}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ SUGGESTIONS DE SOUS-DOSSIERS ══════════ */}
      {!atRoot && items.length===0 && !search && ai.phase==='idle' && (
        <div style={{ ...box, padding:18, marginBottom:16, background:'#fff', border:'1.5px solid #ebebE6', borderRadius:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#6b7280', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.07em' }}>Créer rapidement un sous-dossier</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {Object.entries(CATEGORIES).map(([name,{icon}])=>(
              <button key={name} onClick={()=>quickSubfolder(name)} disabled={busy}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:20, border:'1.5px solid #ebebE6', background:'#fafaf8', color:'#374151', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='#5046e4'; e.currentTarget.style.color='#5046e4' }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='#ebebE6'; e.currentTarget.style.color='#374151' }}
              >
                {icon} {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ CONTENU PRINCIPAL ══════════ */}
      {atRoot && nodes.length===0 ? (
        <EmptyRoot onCreate={()=>setFolderModal(true)} onImport={()=>folderInputRef.current?.click()} />
      ) : items.length===0 ? (
        <div style={{ background:'#fff', border:'1.5px solid #ebebE6', borderRadius:18, padding:'60px 20px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>{search?'🔍':'📂'}</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:4 }}>
            {search?'Aucun résultat':'Dossier vide'}
          </div>
          <div style={{ fontSize:12, color:'#9ca3af' }}>
            {search?'Essayez un autre terme.':atRoot?'Créez un dossier produit pour démarrer.':'Importez des fichiers ou créez un sous-dossier.'}
          </div>
        </div>
      ) : view==='grid' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(172px,1fr))', gap:12 }}>
          {items.map(n=>(
            <GridCard key={n.id} node={n} stat={fStats[n.id]} onOpen={()=>openItem(n)} onMenu={e=>openMenu(e,n)} />
          ))}
        </div>
      ) : (
        <div style={{ background:'#fff', border:'1.5px solid #ebebE6', borderRadius:16, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#fafaf8' }}>
                {['Nom','Catégorie','Type','Taille','Éléments','Date',''].map(h=>(
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(n=>{
                const s = fStats[n.id]
                const cat = CATEGORIES[n.aiCategory||n.name]
                return (
                  <tr key={n.id} className="doc-row" style={{ borderTop:'1px solid #f5f4f0' }}
                    onClick={()=>openItem(n)} onContextMenu={e=>openMenu(e,n)}>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:18, flexShrink:0 }}>{n.type==='folder'?'📁':fileIcon(n.name)}</span>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{n.name}</div>
                          {n.asin && <div style={{ fontSize:10, color:'#9ca3af', fontFamily:'monospace' }}>{n.asin}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'11px 16px' }}>
                      {n.aiCategory && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${CATEGORIES[n.aiCategory]?.color||'#6366f1'}12`, color:CATEGORIES[n.aiCategory]?.color||'#6366f1', whiteSpace:'nowrap' }}>
                          {CATEGORIES[n.aiCategory]?.icon} {n.aiCategory}
                        </span>
                      )}
                    </td>
                    <td style={{ padding:'11px 16px', fontSize:11, color:'#9ca3af' }}>{n.type==='folder'?'Dossier':(n.ext||'').toUpperCase()}</td>
                    <td style={{ padding:'11px 16px', fontSize:11, color:'#9ca3af' }}>{n.type==='folder'?formatSize(s?.size):formatSize(n.size)}</td>
                    <td style={{ padding:'11px 16px', fontSize:11, color:'#9ca3af' }}>{n.type==='folder'?`${s?.files??0} fichier${(s?.files??0)>1?'s':''}`:'-'}</td>
                    <td style={{ padding:'11px 16px', fontSize:11, color:'#9ca3af', whiteSpace:'nowrap' }}>{n.createdAt?formatDate(n.createdAt):'—'}</td>
                    <td style={{ padding:'11px 16px', textAlign:'right' }}>
                      <button onClick={e=>openMenu(e,n)} style={{ border:'none', background:'none', cursor:'pointer', fontSize:18, color:'#9ca3af', padding:'0 6px' }}>⋯</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════ DRAG OVERLAY ══════════ */}
      {dragOver && !atRoot && (
        <div style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(80,70,228,0.1)', border:'3px dashed #5046e4', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ background:'#fff', padding:'20px 32px', borderRadius:14, fontSize:15, fontWeight:700, color:'#5046e4', boxShadow:'0 12px 40px rgba(0,0,0,0.15)' }}>
            ⬆ Déposez vos fichiers ici
          </div>
        </div>
      )}

      {/* Inputs cachés */}
      <input ref={fileInputRef} type="file" multiple accept={ACCEPT_ATTR} style={{ display:'none' }}
        onChange={e=>{ handleFiles(e.target.files); e.target.value='' }} />
      <input ref={folderInputRef} type="file" multiple style={{ display:'none' }}
        onChange={e=>{ handleFolderImport(e.target.files); e.target.value='' }} />

      {/* ══════════ OVERLAY PIPELINE IA ══════════ */}
      {ai.phase!=='idle' && (
        <AIOverlay
          state={ai}
          onConfirm={confirmAIImport}
          onClose={()=>setAI(AI_IDLE)}
        />
      )}

      {/* ── Modale : confirmation nettoyage complet ── */}
      <Modal isOpen={cleanConfirm} onClose={()=>setCleanConfirm(false)} title="🤖 Nettoyer toute la bibliothèque">
        <div>
          <p style={{ fontSize:14, color:'#111827', lineHeight:1.6, marginBottom:14 }}>
            L'IA va parcourir <strong>tous vos fichiers</strong> et :
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ fontSize:18 }}>🗑️</span>
              <div style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>
                <strong>Supprimer les doublons identiques</strong> — détectés par contenu, pas seulement par nom. Garde l'exemplaire le plus ancien.
              </div>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ fontSize:18 }}>✏️</span>
              <div style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>
                <strong>Renommer chaque fichier</strong> selon sa catégorie — ex : <code style={{ background:'#f3f4f6', padding:'1px 6px', borderRadius:5, fontSize:12 }}>Photo Produit 01.jpg</code>
              </div>
            </div>
          </div>
          <p style={{ fontSize:12, color:'#dc2626', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'9px 12px', marginBottom:16 }}>
            ⚠️ Action irréversible : les doublons seront définitivement supprimés.
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setCleanConfirm(false)}
              style={{ flex:1, padding:12, background:'#fff', color:'#6b7280', border:'1.5px solid #ebebE6', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Annuler
            </button>
            <button onClick={handleCleanAll}
              style={{ flex:2, padding:12, background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>
              🤖 Lancer le nettoyage
            </button>
          </div>
        </div>
      </Modal>

      {/* Menu contextuel */}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.node)} onClose={()=>setMenu(null)} />}

      {/* Aperçu */}
      <FilePreview node={preview} onClose={()=>setPreview(null)} />

      {/* ── Modale : créer dossier ── */}
      <Modal isOpen={folderModal} onClose={()=>setFolderModal(false)} title={atRoot?'Nouveau dossier produit':'Nouveau sous-dossier'}>
        <form onSubmit={submitFolder}>
          <div style={{ marginBottom:atRoot?12:20 }}>
            <label style={lbl}>Nom du dossier *</label>
            <input style={{ ...inp, background:'#fff', border:'1.5px solid #ebebE6' }} autoFocus value={folderForm.name}
              onChange={e=>setFolderForm({...folderForm,name:e.target.value})}
              placeholder={atRoot?'Ex : Kit Phare LED H7':'Ex : Photos Produit'} required />
          </div>
          {atRoot && (
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>ASIN Amazon (optionnel)</label>
              <input style={{ ...inp, fontFamily:'monospace', textTransform:'uppercase', background:'#fff', border:'1.5px solid #ebebE6' }} maxLength={10}
                value={folderForm.asin} onChange={e=>setFolderForm({...folderForm,asin:e.target.value})} placeholder="B0XXXXXXXXX" />
            </div>
          )}
          <button type="submit" disabled={busy}
            style={{ width:'100%', padding:12, background:busy?'#9ca3af':'#5046e4', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:busy?'wait':'pointer' }}>
            {busy?'Création…':'Créer le dossier'}
          </button>
        </form>
      </Modal>

      {/* ── Modale : renommer ── */}
      <Modal isOpen={!!renameModal} onClose={()=>setRenameModal(null)} title={renameModal?.type==='folder'?'Modifier le dossier':'Renommer le fichier'}>
        {renameModal && (
          <form onSubmit={submitRename}>
            <div style={{ marginBottom: renameSugs.length > 0 ? 8 : (renameModal.type==='folder'&&renameModal.isProduct)?12:20 }}>
              <label style={lbl}>Nom *</label>
              <input style={{ ...inp, background:'#fff', border:'1.5px solid #ebebE6' }} autoFocus value={renameVal}
                onChange={e=>setRenameVal(e.target.value)} required />
            </div>
            {/* Suggestions IA */}
            {renameSugs.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, color:'#9ca3af', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>Suggestions</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {renameSugs.map(s => (
                    <button key={s} type="button" onClick={()=>setRenameVal(s)}
                      style={{ padding:'4px 10px', borderRadius:20, border:`1.5px solid ${renameVal===s?'#5046e4':'#e5e7eb'}`, background:renameVal===s?'#eef2ff':'#fff', color:renameVal===s?'#5046e4':'#374151', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .1s' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {renameModal.type==='folder'&&renameModal.isProduct && (
              <div style={{ marginBottom:20 }}>
                <label style={lbl}>ASIN Amazon</label>
                <input style={{ ...inp, fontFamily:'monospace', textTransform:'uppercase', background:'#fff', border:'1.5px solid #ebebE6' }} maxLength={10}
                  value={renameModal.asin||''} onChange={e=>setRenameModal({...renameModal,asin:e.target.value})} />
              </div>
            )}
            <button type="submit" disabled={busy}
              style={{ width:'100%', padding:12, background:busy?'#9ca3af':'#5046e4', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:busy?'wait':'pointer' }}>
              {busy?'Enregistrement…':'Enregistrer'}
            </button>
          </form>
        )}
      </Modal>

      {/* ── Modale : déplacer ── */}
      <Modal isOpen={!!moveModal} onClose={()=>setMoveModal(null)} title="Déplacer vers…">
        {moveModal && <MovePicker node={moveModal} nodes={nodes} busy={busy} onPick={doMove} />}
      </Modal>

      {/* ── Modale : confirmation suppression ── */}
      <Modal isOpen={!!confirm} onClose={()=>setConfirm(null)} title="Confirmer la suppression">
        {confirm && (
          <div>
            <p style={{ fontSize:14, color:'#111827', lineHeight:1.5, marginBottom:8 }}>
              Supprimer définitivement <strong>{confirm.node.name}</strong> ?
            </p>
            {confirm.node.type==='folder' && (
              <p style={{ fontSize:13, color:'#dc2626', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 12px', marginBottom:16 }}>
                ⚠️ Ce dossier et tout son contenu ({confirm.count} fichier{confirm.count>1?'s':''} + sous-dossiers) seront supprimés. Irréversible.
              </p>
            )}
            {confirm.node.type==='file' && (
              <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>Cette action est irréversible.</p>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setConfirm(null)} disabled={busy}
                style={{ flex:1, padding:12, background:'#fff', color:'#6b7280', border:'1.5px solid #ebebE6', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                Annuler
              </button>
              <button onClick={doDelete} disabled={busy}
                style={{ flex:1, padding:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:busy?'wait':'pointer' }}>
                {busy?'Suppression…':'Supprimer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb({ path, goTo }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', minWidth:0 }}>
      <button onClick={()=>goTo(0)}
        style={{ fontSize:path.length?16:20, fontWeight:700, color:path.length?'#9ca3af':'#111827', background:'none', border:'none', cursor:'pointer', padding:0 }}>
        Documents
      </button>
      {path.map((f,i)=>(
        <span key={f.id} style={{ display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
          <span style={{ color:'#d1d5db', fontSize:16 }}>›</span>
          <button onClick={()=>goTo(i+1)}
            style={{ fontSize:i===path.length-1?16:15, fontWeight:i===path.length-1?700:500, color:i===path.length-1?'#111827':'#6b7280', background:'none', border:'none', cursor:'pointer', padding:0, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {f.name}
          </button>
        </span>
      ))}
    </div>
  )
}

// ── GridCard ──────────────────────────────────────────────────────────────────
function GridCard({ node, stat, onOpen, onMenu }) {
  const isF    = node.type === 'folder'
  const isImg  = !isF && kindOf(extOf(node.name)) === 'image'
  const cat    = node.aiCategory ? CATEGORIES[node.aiCategory] : null
  const baseColor = isF ? '#5046e4' : fileColor(node.name)

  const [thumbUrl, setThumbUrl] = useState(null)

  useEffect(() => {
    if (!isImg) return
    let revoke
    getFileUrl(node.id).then(url => {
      if (url) { setThumbUrl(url); revoke = url }
    })
    return () => { if (revoke) URL.revokeObjectURL(revoke) }
  }, [node.id, isImg])

  return (
    <div className="doc-card" onClick={onOpen} onContextMenu={onMenu}
      style={{ background:'#fff', border:'1.5px solid #ebebE6', borderRadius:16, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column', animation:'docPop .15s ease' }}>

      {/* Menu button */}
      <button onClick={e=>{e.stopPropagation();onMenu(e)}}
        style={{ position:'absolute', top:8, right:8, zIndex:2, border:'none', background:'rgba(255,255,255,0.85)', backdropFilter:'blur(4px)', cursor:'pointer', fontSize:17, color:'#374151', lineHeight:1, padding:'3px 6px', borderRadius:8, opacity:0, transition:'opacity .15s' }}
        onMouseEnter={e=>(e.currentTarget.style.opacity='1')}
        onMouseLeave={e=>(e.currentTarget.style.opacity='0')}
      >⋯</button>

      {/* Zone image (si image avec thumb chargé) */}
      {isImg ? (
        <div style={{ width:'100%', aspectRatio:'4/3', background:`${baseColor}10`, overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {thumbUrl
            ? <img src={thumbUrl} alt={node.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            : <span style={{ fontSize:32, opacity:0.4 }}>🖼️</span>
          }
        </div>
      ) : (
        /* Icône standard pour dossiers + fichiers non-image */
        <div style={{ padding:'14px 14px 0', display:'flex', alignItems:'center' }}>
          <div style={{ width:46, height:46, borderRadius:12, background:`${baseColor}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
            {isF ? '📁' : fileIcon(node.name)}
          </div>
        </div>
      )}

      {/* Métadonnées */}
      <div style={{ padding: isImg ? '10px 12px 12px' : '8px 14px 14px', flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>{node.name}</div>

        {node.asin && <div style={{ fontSize:10, color:'#9ca3af', fontFamily:'monospace', marginTop:2 }}>{node.asin}</div>}

        {isF ? (
          <div style={{ fontSize:10, color:'#9ca3af', marginTop:3 }}>
            {stat?.files??0} fichier{(stat?.files??0)>1?'s':''} · {formatSize(stat?.size)}
          </div>
        ) : (
          <div style={{ fontSize:10, color:'#9ca3af', marginTop:3 }}>{(node.ext||'').toUpperCase()} · {formatSize(node.size)}</div>
        )}

        {node.aiCategory && (
          <div style={{ marginTop:5 }}>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${cat?.color||'#6366f1'}12`, color:cat?.color||'#6366f1', whiteSpace:'nowrap' }}>
              {cat?.icon} {node.aiCategory}
            </span>
          </div>
        )}

        {node.aiMetadata && Object.keys(node.aiMetadata).length > 0 && (
          <div style={{ fontSize:9, color:'#9ca3af', marginTop:4, lineHeight:1.4 }}>
            {Object.entries(node.aiMetadata).slice(0,2).map(([k,v]) => (
              <span key={k} style={{ marginRight:6 }}>
                <span style={{ textTransform:'capitalize' }}>{k}</span>: {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── AI Processing Overlay ─────────────────────────────────────────────────────
function AIOverlay({ state, onConfirm, onClose }) {
  const { phase, progress, current, total, groups, summary, mode, label } = state
  const isOrganize = mode === 'organize'
  const isClean = mode === 'clean'
  const isActive = ['analyzing','uploading','organizing','cleaning'].includes(phase)
  const pct = Math.round((progress||0)*100)
  const accent = (phase==='cleaning' || isClean) ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#5046e4,#7c3aed)'
  const barAccent = (phase==='cleaning' || isClean) ? 'linear-gradient(90deg,#059669,#10b981)' : 'linear-gradient(90deg,#5046e4,#7c3aed)'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(10,10,20,0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:32, width:'100%', maxWidth:560, boxShadow:'0 24px 80px rgba(0,0,0,0.3)', animation:'docFade .25s ease' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{(phase==='cleaning'||isClean)?'🤖':'✨'}</div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'#111827' }}>
              {phase==='analyzing'  && 'Analyse IA en cours…'}
              {phase==='reviewing'  && (isOrganize ? 'Aperçu de l\'organisation' : 'Aperçu de l\'import IA')}
              {phase==='uploading'  && 'Import en cours…'}
              {phase==='organizing' && 'Organisation en cours…'}
              {phase==='cleaning'   && (label || 'Nettoyage en cours…')}
              {phase==='done'       && 'Terminé !'}
            </div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>
              {isActive && `${current||0} / ${total||0} fichiers`}
              {phase==='reviewing' && `${state.results?.length||0} fichiers → ${Object.keys(groups||{}).length} catégories`}
              {phase==='done' && (isClean ? 'Bibliothèque nettoyée' : isOrganize ? 'Organisation réussie' : 'Import réussi')}
            </div>
          </div>
          {!isActive && phase!=='done' && (
            <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#9ca3af' }}>✕</button>
          )}
        </div>

        {/* Progress bar */}
        {isActive && (
          <div style={{ marginBottom:20 }}>
            <div style={{ height:8, background:'#f0f0f0', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', width:`${pct}%`, background:barAccent, borderRadius:4, transition:'width .3s ease', animation:pct<100?'aiPulse 1.5s ease infinite':undefined }} />
            </div>
            <div style={{ fontSize:11, color:'#9ca3af', textAlign:'right' }}>{pct}%</div>
          </div>
        )}

        {/* Review: catégories trouvées */}
        {phase==='reviewing' && groups && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
              Catégories détectées automatiquement
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7, maxHeight:280, overflowY:'auto' }}>
              {Object.entries(groups).sort((a,b)=>b[1].length-a[1].length).map(([cat,files])=>{
                const c = CATEGORIES[cat]
                return (
                  <div key={cat} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:`${c?.color||'#6366f1'}08`, border:`1px solid ${c?.color||'#6366f1'}20` }}>
                    <span style={{ fontSize:18 }}>{c?.icon||'📄'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{cat}</div>
                      <div style={{ fontSize:11, color:'#9ca3af' }}>{files.length} fichier{files.length>1?'s':''}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:c?.color||'#6366f1', color:'#fff' }}>
                      {files.length}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Done summary */}
        {phase==='done' && summary && (
          <div style={{ marginBottom:24, padding:'18px', borderRadius:14, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
            <div style={{ fontSize:24, marginBottom:8, textAlign:'center' }}>✅</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, textAlign:'center' }}>
              {(isClean ? [
                { label:'Doublons supprimés', value:summary.removed||0 },
                { label:'Fichiers renommés',  value:summary.renamed||0 },
                { label:'Fichiers analysés',  value:summary.scanned||0 },
              ] : [
                { label: isOrganize ? 'Fichiers organisés' : 'Fichiers importés', value:summary.uploaded||summary.organized||0 },
                { label:'Dossiers créés',    value:summary.folders||0 },
                { label:'Ignorés',           value:summary.skipped||0 },
              ]).map(s=>(
                <div key={s.label}>
                  <div style={{ fontSize:22, fontWeight:900, color:'#059669' }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:10 }}>
          {phase==='reviewing' && (
            <>
              <button onClick={onClose} style={{ flex:1, padding:'11px', background:'#fff', color:'#6b7280', border:'1.5px solid #ebebE6', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Annuler
              </button>
              <button onClick={onConfirm} style={{ flex:2, padding:'11px', background:'linear-gradient(135deg,#5046e4,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                {isOrganize
                  ? `✨ Organiser (${state.results?.length} fichiers)`
                  : `✨ Importer et organiser (${state.results?.length} fichiers)`}
              </button>
            </>
          )}
          {phase==='done' && (
            <button onClick={onClose} style={{ flex:1, padding:'11px', background:'#5046e4', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MovePicker ─────────────────────────────────────────────────────────────────
function MovePicker({ node, nodes, busy, onPick }) {
  const blocked = node.type==='folder' ? descendantIds(node.id,nodes) : new Set()
  const folders = nodes.filter(n=>n.type==='folder'&&n.id!==node.id&&!blocked.has(n.id))
  const pathLabel = f => {
    const parts=[]; let cur=f; const byId=Object.fromEntries(nodes.map(n=>[n.id,n]))
    while(cur){ parts.unshift(cur.name); cur=cur.parentId?byId[cur.parentId]:null }
    return parts.join(' › ')
  }
  return (
    <div>
      <div style={{ fontSize:13, color:'#6b7280', marginBottom:12 }}>
        Déplacer <strong>{node.name}</strong> vers :
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:300, overflowY:'auto' }}>
        <button onClick={()=>onPick(null)} disabled={busy||node.parentId===null}
          style={{ textAlign:'left', padding:'10px 14px', borderRadius:10, border:'1.5px solid #ebebE6', background:node.parentId===null?'#fafaf8':'#fff', color:'#111827', fontSize:13, fontWeight:600, cursor:node.parentId===null?'default':'pointer', opacity:node.parentId===null?0.5:1 }}>
          🏠 Documents (racine)
        </button>
        {folders.map(f=>(
          <button key={f.id} onClick={()=>onPick(f.id)} disabled={busy||node.parentId===f.id}
            style={{ textAlign:'left', padding:'10px 14px', borderRadius:10, border:'1.5px solid #ebebE6', background:node.parentId===f.id?'#fafaf8':'#fff', color:'#111827', fontSize:13, fontWeight:600, cursor:node.parentId===f.id?'default':'pointer', opacity:node.parentId===f.id?0.5:1 }}>
            📁 {pathLabel(f)}
          </button>
        ))}
        {folders.length===0 && (
          <div style={{ fontSize:13, color:'#9ca3af', padding:12, textAlign:'center' }}>Aucun autre dossier disponible.</div>
        )}
      </div>
    </div>
  )
}

// ── EmptyRoot ──────────────────────────────────────────────────────────────────
function EmptyRoot({ onCreate, onImport }) {
  return (
    <div style={{ background:'#fff', border:'1.5px solid #ebebE6', borderRadius:20, padding:'72px 24px', textAlign:'center' }}>
      <div style={{ width:88, height:88, borderRadius:22, background:'linear-gradient(135deg,#ede9fe,#ddd6fe)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:42, margin:'0 auto 22px' }}>📁</div>
      <div style={{ fontSize:22, fontWeight:800, color:'#111827', marginBottom:8, letterSpacing:'-0.3px' }}>Gestionnaire documentaire</div>
      <div style={{ fontSize:14, color:'#9ca3af', maxWidth:400, margin:'0 auto 28px', lineHeight:1.6 }}>
        Photos, vidéos, factures, certificats — organisés automatiquement par l'IA selon le type de document.
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
        <button onClick={onCreate}
          style={{ padding:'12px 24px', background:'#fff', color:'#5046e4', border:'2px solid #5046e4', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>
          + Créer un dossier
        </button>
      </div>
      <div style={{ marginTop:24, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, maxWidth:460, margin:'24px auto 0' }}>
        {[
          { icon:'🖼️', label:'Photos & Vidéos' },
          { icon:'🧾', label:'Factures' },
          { icon:'📜', label:'Certificats' },
          { icon:'🛒', label:'Amazon FBA' },
        ].map(f=>(
          <div key={f.label} style={{ padding:'14px 8px', borderRadius:14, background:'#fafal8', border:'1.5px solid #ebebE6', textAlign:'center' }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{f.icon}</div>
            <div style={{ fontSize:11, color:'#6b7280', fontWeight:600 }}>{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
