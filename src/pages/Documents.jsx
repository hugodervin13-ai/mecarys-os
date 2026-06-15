import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useStore, toast } from '../lib/store'
import { colors, box, inp, lbl } from '../lib/theme'
import { formatDate } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import ContextMenu from '../components/ContextMenu'
import FilePreview from '../components/FilePreview'
import {
  listNodes, createFolder, updateFolder, uploadFiles, renameNode, moveNode, deleteNode,
  downloadFile, folderStats, descendantIds, kindOf, extOf, formatSize,
  ACCEPT_ATTR, ACCEPTED_EXT,
} from '../lib/fileStore'

// Sous-dossiers suggérés à l'intérieur d'un dossier produit (création en 1 clic).
const SUBFOLDER_SUGGESTIONS = ['Photos', 'Vidéos', 'Factures', 'Fiches de sécurité', 'Certificats', 'Packaging', 'Marketing', 'Amazon', 'Transport']

const fileIcon = (name) => {
  const k = kindOf(extOf(name))
  return k === 'image' ? '🖼️' : k === 'pdf' ? '📕' : k === 'video' ? '🎬' : k === 'doc' ? '📄' : '📎'
}
const fileColor = (name) => {
  const k = kindOf(extOf(name))
  return k === 'image' ? '#6366f1' : k === 'pdf' ? '#ef4444' : k === 'video' ? '#ec4899' : k === 'doc' ? '#10b981' : '#6b7280'
}

export default function Documents() {
  const { user } = useStore()
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [path, setPath] = useState([])           // pile de dossiers ouverts (breadcrumb)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')   // name | date | size
  const [view, setView] = useState('grid')       // grid | list
  const [preview, setPreview] = useState(null)
  const [menu, setMenu] = useState(null)         // { x, y, node }
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Modales
  const [folderModal, setFolderModal] = useState(false)
  const [folderForm, setFolderForm] = useState({ name: '', asin: '' })
  const [renameModal, setRenameModal] = useState(null) // node
  const [renameVal, setRenameVal] = useState('')
  const [moveModal, setMoveModal] = useState(null)     // node
  const [confirm, setConfirm] = useState(null)         // { node, count }

  const fileInputRef = useRef(null)
  const currentParentId = path.length ? path[path.length - 1].id : null
  const atRoot = path.length === 0

  // ── Chargement ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    try {
      const data = await listNodes(user.id)
      setNodes(data)
    } catch (e) {
      toast(`Erreur de chargement des documents : ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Si un dossier ouvert a été supprimé ailleurs, on remonte proprement.
  useEffect(() => {
    if (!path.length) return
    const ids = new Set(nodes.map((n) => n.id))
    const valid = []
    for (const p of path) { if (ids.has(p.id)) valid.push(p); else break }
    if (valid.length !== path.length) setPath(valid)
  }, [nodes]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => folderStats(nodes), [nodes])

  // ── Éléments du niveau courant (filtre + tri) ───────────────────────
  const items = useMemo(() => {
    let list = nodes.filter((n) => n.parentId === currentParentId)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((n) => n.name.toLowerCase().includes(q) || (n.asin || '').toLowerCase().includes(q))
    }
    const dir = sortBy === 'name' ? 1 : -1
    list.sort((a, b) => {
      // Dossiers toujours avant les fichiers
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'fr') * dir
      if (sortBy === 'size') return ((stats[b.id]?.size ?? b.size ?? 0) - (stats[a.id]?.size ?? a.size ?? 0))
      return new Date(b.createdAt) - new Date(a.createdAt) // date desc
    })
    return list
  }, [nodes, currentParentId, search, sortBy, stats])

  // ── Actions ─────────────────────────────────────────────────────────
  const openFolder = (folder) => { setPath((p) => [...p, folder]); setSearch('') }
  const goTo = (index) => { setPath((p) => p.slice(0, index)); setSearch('') }

  const submitFolder = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await createFolder(user.id, {
        name: folderForm.name,
        parentId: currentParentId,
        isProduct: atRoot,
        asin: atRoot ? folderForm.asin : '',
      })
      toast('Dossier créé', 'success')
      setFolderModal(false)
      setFolderForm({ name: '', asin: '' })
      await load()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  const quickSubfolder = async (name) => {
    setBusy(true)
    try {
      await createFolder(user.id, { name, parentId: currentParentId })
      toast(`Sous-dossier « ${name} » créé`, 'success')
      await load()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  const handleFiles = async (fileList) => {
    if (!fileList?.length) return
    if (atRoot) { toast('Ouvrez un dossier avant d’ajouter des fichiers'); return }
    setBusy(true)
    try {
      const created = await uploadFiles(user.id, fileList, currentParentId)
      toast(`${created.length} fichier${created.length > 1 ? 's' : ''} ajouté${created.length > 1 ? 's' : ''}`, 'success')
      await load()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  const submitRename = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await renameNode(renameModal.id, renameVal)
      if (renameModal.type === 'folder' && renameModal.isProduct) {
        await updateFolder(renameModal.id, { asin: renameModal.asin || '' })
      }
      toast(renameModal.type === 'folder' ? 'Dossier modifié' : 'Renommé', 'success')
      setRenameModal(null)
      await load()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  const doMove = async (destId) => {
    setBusy(true)
    try {
      await moveNode(moveModal.id, destId, nodes)
      toast('Déplacé', 'success')
      setMoveModal(null)
      await load()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  const doDelete = async () => {
    setBusy(true)
    try {
      await deleteNode(confirm.node.id)
      toast('Supprimé', 'success')
      setConfirm(null)
      await load()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  const openItem = (node) => {
    if (node.type === 'folder') openFolder(node)
    else setPreview(node)
  }

  const askDelete = (node) => {
    const s = node.type === 'folder' ? stats[node.id] : null
    setConfirm({ node, count: s ? s.files : 0 })
  }

  const openMenu = (e, node) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, node })
  }

  const menuItems = (node) => {
    const isFolder = node.type === 'folder'
    return [
      { icon: isFolder ? '📂' : '👁️', label: isFolder ? 'Ouvrir' : 'Aperçu', onClick: () => openItem(node) },
      { icon: '✏️', label: 'Renommer', onClick: () => { setRenameModal(node); setRenameVal(node.name) } },
      { icon: '↪️', label: 'Déplacer', onClick: () => setMoveModal(node) },
      !isFolder && { icon: '⬇️', label: 'Télécharger', onClick: () => downloadFile(node.id, node.name) },
      isFolder && { icon: '⚙️', label: 'Modifier', onClick: () => { setRenameModal(node); setRenameVal(node.name) } },
      { divider: true },
      { icon: '🗑️', label: 'Supprimer', danger: true, onClick: () => askDelete(node) },
    ].filter(Boolean)
  }

  if (loading) return <Loading />

  return (
    <div
      onDragOver={(e) => { if (!atRoot) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={(e) => { if (e.target === e.currentTarget) setDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
    >
      <style>{`
        @keyframes mecarysPop { from { opacity:0; transform: scale(0.96) } to { opacity:1; transform: scale(1) } }
        .mecarys-card:hover { border-color:#6366f1 !important; box-shadow:0 6px 20px rgba(99,102,241,0.12); transform: translateY(-2px); }
        .mecarys-card { transition: all .14s ease; }
        .mecarys-row:hover { background:#fafaf8; }
      `}</style>

      {/* En-tête + barre d'outils */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <Breadcrumb path={path} goTo={goTo} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { setFolderForm({ name: '', asin: '' }); setFolderModal(true) }}
            style={{ padding: '9px 16px', background: '#fff', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + {atRoot ? 'Dossier produit' : 'Sous-dossier'}
          </button>
          {!atRoot && (
            <button onClick={() => fileInputRef.current?.click()} disabled={busy}
              style={{ padding: '9px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}>
              ⬆ Ajouter un fichier
            </button>
          )}
        </div>
      </div>

      {/* Recherche + tri + vue */}
      {(nodes.length > 0) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: colors.textFaint }}>🔍</span>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={atRoot ? 'Rechercher un dossier produit ou un ASIN…' : 'Rechercher dans ce dossier…'}
              style={{ ...inp, paddingLeft: 34 }}
            />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ ...inp, width: 'auto', cursor: 'pointer' }}>
            <option value="name">Trier : Nom (A→Z)</option>
            <option value="date">Trier : Plus récent</option>
            <option value="size">Trier : Taille</option>
          </select>
          <div style={{ display: 'flex', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {['grid', 'list'].map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '8px 12px', border: 'none', background: view === v ? colors.primary : '#fff', color: view === v ? '#fff' : colors.textMuted, cursor: 'pointer', fontSize: 14 }}>
                {v === 'grid' ? '▦' : '☰'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions de sous-dossiers (dans un dossier vide non-racine) */}
      {!atRoot && items.length === 0 && !search && (
        <div style={{ ...box, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 10 }}>Créer rapidement un sous-dossier</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUBFOLDER_SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => quickSubfolder(s)} disabled={busy}
                style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                📁 {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zone de contenu */}
      {atRoot && nodes.length === 0 ? (
        <EmptyRoot onCreate={() => setFolderModal(true)} />
      ) : items.length === 0 ? (
        <div style={{ ...box, padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{search ? '🔍' : '📂'}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, marginBottom: 4 }}>
            {search ? 'Aucun résultat' : 'Dossier vide'}
          </div>
          <div style={{ fontSize: 13, color: colors.textFaint }}>
            {search ? 'Essayez un autre terme de recherche.' : atRoot ? 'Créez un dossier produit pour commencer.' : 'Ajoutez des fichiers ou créez un sous-dossier.'}
          </div>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
          {items.map((n) => (
            <GridItem key={n.id} node={n} stats={stats[n.id]} onOpen={() => openItem(n)} onMenu={(e) => openMenu(e, n)} />
          ))}
        </div>
      ) : (
        <div style={{ ...box, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.inputBg }}>
                {['Nom', 'Type', 'Taille', 'Éléments', 'Créé le', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((n) => {
                const s = stats[n.id]
                return (
                  <tr key={n.id} className="mecarys-row" style={{ borderTop: `1px solid ${colors.borderLight}`, cursor: 'pointer' }}
                    onClick={() => openItem(n)} onContextMenu={(e) => openMenu(e, n)}>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{n.type === 'folder' ? '📁' : fileIcon(n.name)}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{n.name}</div>
                          {n.asin && <div style={{ fontSize: 11, color: colors.textFaint, fontFamily: 'monospace' }}>{n.asin}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: colors.textMuted }}>{n.type === 'folder' ? 'Dossier' : (n.ext || '').toUpperCase()}</td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: colors.textMuted }}>{n.type === 'folder' ? formatSize(s?.size) : formatSize(n.size)}</td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: colors.textMuted }}>{n.type === 'folder' ? `${s?.files ?? 0} fichier${(s?.files ?? 0) > 1 ? 's' : ''}` : '—'}</td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: colors.textFaint, whiteSpace: 'nowrap' }}>{n.createdAt ? formatDate(n.createdAt) : '—'}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <button onClick={(e) => openMenu(e, n)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: colors.textMuted, padding: '0 6px' }}>⋯</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Zone de dépôt visuelle lors d'un drag */}
      {dragOver && !atRoot && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(99,102,241,0.12)', border: '3px dashed #6366f1', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: '#fff', padding: '20px 32px', borderRadius: 14, fontSize: 16, fontWeight: 700, color: colors.primary, boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
            ⬆ Déposez vos fichiers ici
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple accept={ACCEPT_ATTR} style={{ display: 'none' }}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />

      {/* Menu contextuel */}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.node)} onClose={() => setMenu(null)} />}

      {/* Aperçu fichier */}
      <FilePreview node={preview} onClose={() => setPreview(null)} />

      {/* Modale : créer dossier / sous-dossier */}
      <Modal isOpen={folderModal} onClose={() => setFolderModal(false)} title={atRoot ? 'Nouveau dossier produit' : 'Nouveau sous-dossier'}>
        <form onSubmit={submitFolder}>
          <div style={{ marginBottom: atRoot ? 12 : 20 }}>
            <label style={lbl}>Nom du dossier *</label>
            <input style={inp} autoFocus value={folderForm.name} onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
              placeholder={atRoot ? 'Ex : Kit Phare LED H7' : 'Ex : Photos'} required />
          </div>
          {atRoot && (
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>ASIN Amazon (optionnel)</label>
              <input style={{ ...inp, fontFamily: 'monospace', textTransform: 'uppercase' }} maxLength={10}
                value={folderForm.asin} onChange={(e) => setFolderForm({ ...folderForm, asin: e.target.value })} placeholder="B0XXXXXXXXX" />
            </div>
          )}
          <button type="submit" disabled={busy}
            style={{ width: '100%', padding: 12, background: busy ? colors.textFaint : colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Création…' : 'Créer le dossier'}
          </button>
        </form>
      </Modal>

      {/* Modale : renommer */}
      <Modal isOpen={!!renameModal} onClose={() => setRenameModal(null)} title={renameModal?.type === 'folder' ? 'Modifier le dossier' : 'Renommer le fichier'}>
        {renameModal && (
          <form onSubmit={submitRename}>
            <div style={{ marginBottom: renameModal.type === 'folder' && renameModal.isProduct ? 12 : 20 }}>
              <label style={lbl}>Nom *</label>
              <input style={inp} autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} required />
            </div>
            {renameModal.type === 'folder' && renameModal.isProduct && (
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>ASIN Amazon</label>
                <input style={{ ...inp, fontFamily: 'monospace', textTransform: 'uppercase' }} maxLength={10}
                  value={renameModal.asin || ''} onChange={(e) => setRenameModal({ ...renameModal, asin: e.target.value })} />
              </div>
            )}
            <button type="submit" disabled={busy}
              style={{ width: '100%', padding: 12, background: busy ? colors.textFaint : colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </Modal>

      {/* Modale : déplacer */}
      <Modal isOpen={!!moveModal} onClose={() => setMoveModal(null)} title="Déplacer vers…">
        {moveModal && (
          <MovePicker node={moveModal} nodes={nodes} busy={busy} onPick={doMove} />
        )}
      </Modal>

      {/* Modale : confirmation suppression */}
      <Modal isOpen={!!confirm} onClose={() => setConfirm(null)} title="Confirmer la suppression">
        {confirm && (
          <div>
            <p style={{ fontSize: 14, color: colors.text, lineHeight: 1.5, marginBottom: 8 }}>
              Supprimer définitivement <strong>{confirm.node.name}</strong> ?
            </p>
            {confirm.node.type === 'folder' && (
              <p style={{ fontSize: 13, color: colors.danger, background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                ⚠️ Ce dossier et tout son contenu ({confirm.count} fichier{confirm.count > 1 ? 's' : ''} + sous-dossiers) seront supprimés. Cette action est irréversible.
              </p>
            )}
            {confirm.node.type === 'file' && (
              <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>Cette action est irréversible.</p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirm(null)} disabled={busy}
                style={{ flex: 1, padding: 12, background: '#fff', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={doDelete} disabled={busy}
                style={{ flex: 1, padding: 12, background: colors.danger, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Sous-composants ───────────────────────────────────────────────────
function Breadcrumb({ path, goTo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>
      <button onClick={() => goTo(0)}
        style={{ fontSize: path.length ? 20 : 24, fontWeight: 700, color: path.length ? colors.textMuted : colors.text, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        Documents
      </button>
      {path.map((f, i) => (
        <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ color: colors.textFaint, fontSize: 18 }}>›</span>
          <button onClick={() => goTo(i + 1)}
            style={{ fontSize: 16, fontWeight: i === path.length - 1 ? 700 : 600, color: i === path.length - 1 ? colors.text : colors.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {f.name}
          </button>
        </span>
      ))}
    </div>
  )
}

function GridItem({ node, stats, onOpen, onMenu }) {
  const isFolder = node.type === 'folder'
  return (
    <div className="mecarys-card" onClick={onOpen} onContextMenu={onMenu}
      style={{ ...box, padding: 16, cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={onMenu}
        style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: colors.textFaint, lineHeight: 1, padding: 4 }}>⋯</button>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: isFolder ? '#6366f115' : `${fileColor(node.name)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
        {isFolder ? '📁' : fileIcon(node.name)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</div>
        {isFolder ? (
          <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 3 }}>
            {node.asin ? <span style={{ fontFamily: 'monospace' }}>{node.asin} · </span> : null}
            {stats?.files ?? 0} fichier{(stats?.files ?? 0) > 1 ? 's' : ''} · {formatSize(stats?.size)}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 3 }}>{(node.ext || '').toUpperCase()} · {formatSize(node.size)}</div>
        )}
        <div style={{ fontSize: 10, color: colors.textFaint, marginTop: 2 }}>{node.createdAt ? formatDate(node.createdAt) : ''}</div>
      </div>
    </div>
  )
}

function MovePicker({ node, nodes, busy, onPick }) {
  // Destinations : tous les dossiers sauf le node lui-même et ses descendants.
  const blocked = node.type === 'folder' ? descendantIds(node.id, nodes) : new Set()
  const folders = nodes.filter((n) => n.type === 'folder' && n.id !== node.id && !blocked.has(n.id))
  // Chemin lisible de chaque dossier
  const pathLabel = (f) => {
    const parts = []
    let cur = f
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
    while (cur) { parts.unshift(cur.name); cur = cur.parentId ? byId[cur.parentId] : null }
    return parts.join(' › ')
  }
  return (
    <div>
      <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
        Déplacer <strong>{node.name}</strong> vers :
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        <button onClick={() => onPick(null)} disabled={busy || node.parentId === null}
          style={{ textAlign: 'left', padding: '11px 14px', borderRadius: 10, border: `1px solid ${colors.border}`, background: node.parentId === null ? colors.inputBg : '#fff', color: colors.text, fontSize: 13, fontWeight: 600, cursor: node.parentId === null ? 'default' : 'pointer', opacity: node.parentId === null ? 0.5 : 1 }}>
          🏠 Documents (racine)
        </button>
        {folders.map((f) => (
          <button key={f.id} onClick={() => onPick(f.id)} disabled={busy || node.parentId === f.id}
            style={{ textAlign: 'left', padding: '11px 14px', borderRadius: 10, border: `1px solid ${colors.border}`, background: node.parentId === f.id ? colors.inputBg : '#fff', color: colors.text, fontSize: 13, fontWeight: 600, cursor: node.parentId === f.id ? 'default' : 'pointer', opacity: node.parentId === f.id ? 0.5 : 1 }}>
            📁 {pathLabel(f)}
          </button>
        ))}
        {folders.length === 0 && (
          <div style={{ fontSize: 13, color: colors.textFaint, padding: 12, textAlign: 'center' }}>Aucun autre dossier disponible.</div>
        )}
      </div>
    </div>
  )
}

function EmptyRoot({ onCreate }) {
  return (
    <div style={{ ...box, padding: '90px 24px', textAlign: 'center', background: 'linear-gradient(180deg,#ffffff,#fafaf8)' }}>
      <div style={{ width: 96, height: 96, borderRadius: 24, background: '#6366f110', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, margin: '0 auto 22px' }}>📁</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: colors.text, marginBottom: 8 }}>Documents</div>
      <div style={{ fontSize: 14, color: colors.textMuted, maxWidth: 380, margin: '0 auto 26px', lineHeight: 1.5 }}>
        Accédez à tous vos fichiers produits — photos, vidéos, factures, certificats — organisés comme dans un véritable explorateur.
      </div>
      <button onClick={onCreate}
        style={{ padding: '13px 28px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(99,102,241,0.3)' }}>
        Créer un dossier
      </button>
    </div>
  )
}
