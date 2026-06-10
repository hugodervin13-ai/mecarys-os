import { useEffect, useState, useRef } from 'react'
import { getDocuments, addDocument, deleteDocument, getProducts, uploadFile } from '../lib/supabase'
import { useStore, toast } from '../lib/store'
import { useData, mutate } from '../lib/useData'
import { box, inp, lbl } from '../lib/theme'
import { formatDate } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const CATEGORIES = {
  photo:       { label: 'Photos produit',    icon: '📸', color: '#6366f1' },
  video:       { label: 'Vidéos',            icon: '🎬', color: '#ec4899' },
  facture:     { label: 'Factures',          icon: '🧾', color: '#10b981' },
  certificat:  { label: 'Certificats',       icon: '📜', color: '#f59e0b' },
  commande:    { label: 'Bons de commande',  icon: '📋', color: '#3b82f6' },
  technique:   { label: 'Fiches techniques', icon: '🔧', color: '#8b5cf6' },
  packaging:   { label: 'Packaging / BAT',   icon: '📦', color: '#f97316' },
  listing:     { label: 'Listing Amazon',    icon: '📝', color: '#06b6d4' },
  autre:       { label: 'Autres',            icon: '📁', color: '#6b7280' },
}

export default function Documents() {
  const { user } = useStore()
  const { data: docsData, loading: docsLoading, reload: reloadDocs } = useData('documents', () => getDocuments(user.id), [user])
  const { data: prodData, loading: prodLoading } = useData('products', () => getProducts(user.id), [user])
  const loading = docsLoading || prodLoading
  const [documents, setDocuments] = useState([])
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [showEditFolder, setShowEditFolder] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'photo', notes: '', file: null })
  const [folderForm, setFolderForm] = useState({ name: '', asin: '' })
  const [editingFolder, setEditingFolder] = useState(null)
  const fileInputRef = useRef(null)

  // Fusion Supabase + localStorage (système hybride conservé)
  useEffect(() => {
    if (!user) return
    const savedFolders = JSON.parse(localStorage.getItem(`mecarys_folders_${user.id}`) || '[]')
    const savedDocs = JSON.parse(localStorage.getItem(`mecarys_docs_${user.id}`) || '[]')

    const supaFolders = (prodData || []).map(p => ({ ...p, source: 'supabase' }))
    const localFolders = savedFolders.map(f => ({ ...f, source: 'local' }))
    setFolders([...supaFolders, ...localFolders])

    const supaDocs = (docsData || []).map(d => ({ ...d, source: 'supabase' }))
    const localDocs = savedDocs.map(d => ({ ...d, source: 'local' }))
    setDocuments([...supaDocs, ...localDocs])
  }, [user, prodData, docsData])

  const saveFoldersLocal = (newFolders) => {
    const localOnly = newFolders.filter(f => f.source === 'local')
    localStorage.setItem(`mecarys_folders_${user.id}`, JSON.stringify(localOnly))
  }

  const saveDocsLocal = (newDocs) => {
    const localOnly = newDocs.filter(d => d.source === 'local')
    localStorage.setItem(`mecarys_docs_${user.id}`, JSON.stringify(localOnly))
  }

  const createFolder = (e) => {
    e.preventDefault()
    const newFolder = { id: `folder_${Date.now()}`, name: folderForm.name, asin: folderForm.asin || '', source: 'local' }
    const updated = [...folders, newFolder]
    setFolders(updated)
    saveFoldersLocal(updated)
    setFolderForm({ name: '', asin: '' })
    setShowFolderForm(false)
    setSelectedFolder(newFolder.id)
  }

  const openEditFolder = (f) => {
    setEditingFolder({ ...f })
    setShowEditFolder(true)
  }

  const saveEditFolder = (e) => {
    e.preventDefault()
    const updated = folders.map(f => f.id === editingFolder.id ? { ...f, name: editingFolder.name, asin: editingFolder.asin } : f)
    setFolders(updated)
    saveFoldersLocal(updated)
    setShowEditFolder(false)
    setEditingFolder(null)
  }

  const handleDeleteFolder = (id) => {
    if (!confirm('Supprimer ce dossier et tous ses documents ?')) return
    const updatedFolders = folders.filter(f => f.id !== id)
    const updatedDocs = documents.filter(d => d.product_id !== id)
    setFolders(updatedFolders)
    setDocuments(updatedDocs)
    saveFoldersLocal(updatedFolders)
    saveDocsLocal(updatedDocs)
    if (selectedFolder === id) setSelectedFolder(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    let fileUrl = ''
    let fileName = form.name

    if (form.file) {
      if (!fileName) fileName = form.file.name.replace(/\.[^.]+$/, '')
      const uploadRes = await uploadFile(user.id, form.file)
      if (uploadRes.data?.url) {
        fileUrl = uploadRes.data.url
      } else if (uploadRes.error) {
        // Fallback : URL locale temporaire pour la prévisualisation
        fileUrl = URL.createObjectURL(form.file)
        toast('Upload Supabase échoué, fichier stocké temporairement en local', 'info')
      }
    }

    const docData = {
      name: fileName,
      type: form.type,
      notes: form.notes,
      product_id: selectedFolder,
      file_url: fileUrl,
    }

    const folder = folders.find(f => f.id === selectedFolder)
    if (folder?.source === 'supabase' && fileUrl && !fileUrl.startsWith('blob:')) {
      const ok = await mutate(() => addDocument(user.id, docData), 'documents', 'Fichier ajouté')
      if (ok) reloadDocs()
    } else {
      const newDoc = { ...docData, id: `doc_${Date.now()}`, created_at: new Date().toISOString(), source: 'local' }
      const updated = [newDoc, ...documents]
      setDocuments(updated)
      saveDocsLocal(updated)
    }

    setForm({ name: '', type: 'photo', notes: '', file: null })
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(false)
    setSaving(false)
  }

  const handleDeleteDoc = async (doc) => {
    if (!confirm('Supprimer ce document ?')) return
    if (doc.source === 'supabase') {
      const ok = await mutate(() => deleteDocument(doc.id), 'documents', 'Document supprimé')
      if (ok) reloadDocs()
    } else {
      const updated = documents.filter(d => d.id !== doc.id)
      setDocuments(updated)
      saveDocsLocal(updated)
    }
  }

  const productDocs = selectedFolder ? documents.filter(d => d.product_id === selectedFolder) : []
  const filteredDocs = categoryFilter === 'all' ? productDocs : productDocs.filter(d => d.type === categoryFilter)

  if (loading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Documents produits</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Organisez tous vos fichiers par produit : photos, vidéos, factures, certificats...</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowFolderForm(true)}
            style={{ padding: '10px 18px', background: '#fff', color: '#6366f1', border: '1px solid #6366f1', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Créer un dossier
          </button>
          {selectedFolder && (
            <button onClick={() => { setForm({ name: '', type: 'photo', notes: '', file: null }); setShowForm(true) }}
              style={{ padding: '10px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Ajouter un fichier
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18, minHeight: 500 }}>
        {/* Sidebar — product folders */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, padding: '0 4px' }}>
            Dossiers produits ({folders.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {folders.map(f => {
              const docCount = documents.filter(d => d.product_id === f.id).length
              const isActive = selectedFolder === f.id
              return (
                <div key={f.id}>
                  <div
                    onClick={() => { setSelectedFolder(f.id); setCategoryFilter('all') }}
                    style={{ ...box, padding: '12px 14px', cursor: 'pointer', border: isActive ? '2px solid #6366f1' : '1px solid #e8e8e3', background: isActive ? '#6366f108' : '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: isActive ? '#6366f115' : '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      📁
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#6366f1' : '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      {f.asin && <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginTop: 1 }}>{f.asin}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: isActive ? '#6366f1' : '#1a1a2e' }}>{docCount}</span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>fichiers</span>
                    </div>
                  </div>
                  {isActive && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 52 }}>
                      <button onClick={() => openEditFolder(f)}
                        style={{ fontSize: 11, color: '#6366f1', background: '#6366f110', border: '1px solid #6366f130', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>
                        ✏️ Modifier
                      </button>
                      <button onClick={() => handleDeleteFolder(f.id)}
                        style={{ fontSize: 11, color: '#ef4444', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>
                        🗑 Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {folders.length === 0 && (
              <div style={{ ...box, padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>Créez un dossier produit pour commencer</div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div>
          {!selectedFolder ? (
            <div style={{ ...box, padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>📂</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>Sélectionnez un dossier produit</div>
              <div style={{ fontSize: 13, color: '#9ca3af', maxWidth: 380, margin: '0 auto' }}>
                Choisissez un produit dans la liste à gauche pour voir et gérer ses documents (photos, vidéos, factures, certificats, etc.)
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>
                  {folders.find(f => f.id === selectedFolder)?.name}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
                  {folders.find(f => f.id === selectedFolder)?.asin || ''} · {productDocs.length} fichier{productDocs.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Category grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setCategoryFilter('all')}
                  style={{ padding: '10px 8px', borderRadius: 10, border: `1px solid ${categoryFilter === 'all' ? '#6366f1' : '#e8e8e3'}`, background: categoryFilter === 'all' ? '#6366f115' : '#fff', color: categoryFilter === 'all' ? '#6366f1' : '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                  Tous ({productDocs.length})
                </button>
                {Object.entries(CATEGORIES).map(([type, cfg]) => {
                  const count = productDocs.filter(d => d.type === type).length
                  return (
                    <button key={type} onClick={() => setCategoryFilter(type)}
                      style={{ padding: '10px 8px', borderRadius: 10, border: `1px solid ${categoryFilter === type ? cfg.color : '#e8e8e3'}`, background: categoryFilter === type ? `${cfg.color}15` : '#fff', color: categoryFilter === type ? cfg.color : '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                      <span style={{ fontSize: 14 }}>{cfg.icon}</span> {cfg.label.split(' ')[0]} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Documents list */}
              <div style={{ ...box, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafaf8' }}>
                      {['Fichier', 'Catégorie', 'Notes', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(doc => {
                      const cfg = CATEGORIES[doc.type] || CATEGORIES.autre
                      const hasFile = !!doc.file_url
                      return (
                        <tr key={doc.id} style={{ borderTop: '1px solid #f0f0eb' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                {cfg.icon}
                              </div>
                              <div>
                                {hasFile ? (
                                  <a href={doc.file_url} target="_blank" rel="noreferrer"
                                    style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}
                                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                                    {doc.name} 📎
                                  </a>
                                ) : (
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{doc.name}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', maxWidth: 180 }}>
                            {doc.notes || <span style={{ color: '#d1d5db' }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                            {doc.created_at ? formatDate(doc.created_at) : '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {hasFile && (
                                <a href={doc.file_url} target="_blank" rel="noreferrer"
                                  style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                                  Ouvrir
                                </a>
                              )}
                              <button onClick={() => handleDeleteDoc(doc)}
                                style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredDocs.length === 0 && (
                  <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>{categoryFilter !== 'all' ? (CATEGORIES[categoryFilter]?.icon || '📁') : '📂'}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
                      {categoryFilter !== 'all' ? `Aucun fichier "${CATEGORIES[categoryFilter]?.label}"` : 'Dossier vide'}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      Cliquez sur "+ Ajouter un fichier" pour commencer
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal — create folder */}
      <Modal isOpen={showFolderForm} onClose={() => setShowFolderForm(false)} title="Créer un dossier produit">
        <form onSubmit={createFolder}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Nom du produit *</label>
            <input style={inp} type="text" placeholder="Ex: Kit Phare LED H7" value={folderForm.name} onChange={e => setFolderForm({ ...folderForm, name: e.target.value })} required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>ASIN Amazon</label>
            <input style={{ ...inp, fontFamily: 'monospace', textTransform: 'uppercase' }} type="text" maxLength={10} placeholder="B0XXXXXXXXX" value={folderForm.asin} onChange={e => setFolderForm({ ...folderForm, asin: e.target.value })} />
          </div>
          <button type="submit"
            style={{ width: '100%', padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Créer le dossier
          </button>
        </form>
      </Modal>

      {/* Modal — edit folder */}
      <Modal isOpen={showEditFolder} onClose={() => setShowEditFolder(false)} title="Modifier le dossier">
        {editingFolder && (
          <form onSubmit={saveEditFolder}>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Nom du produit *</label>
              <input style={inp} type="text" value={editingFolder.name} onChange={e => setEditingFolder({ ...editingFolder, name: e.target.value })} required />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>ASIN Amazon</label>
              <input style={{ ...inp, fontFamily: 'monospace', textTransform: 'uppercase' }} type="text" maxLength={10} value={editingFolder.asin || ''} onChange={e => setEditingFolder({ ...editingFolder, asin: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit"
                style={{ flex: 1, padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Enregistrer
              </button>
              <button type="button" onClick={() => { handleDeleteFolder(editingFolder.id); setShowEditFolder(false) }}
                style={{ padding: '12px 20px', background: '#fff', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal — add file */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Ajouter un fichier">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Fichier (depuis votre Mac)</label>
            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#6366f108' }}
              onDragLeave={e => { e.currentTarget.style.borderColor = '#e8e8e3'; e.currentTarget.style.background = '#fafaf8' }}
              onDrop={e => {
                e.preventDefault()
                e.currentTarget.style.borderColor = '#e8e8e3'
                e.currentTarget.style.background = '#fafaf8'
                const f = e.dataTransfer.files[0]
                if (f) setForm(prev => ({ ...prev, file: f, name: prev.name || f.name.replace(/\.[^.]+$/, '') }))
              }}
              style={{ border: '2px dashed #e8e8e3', borderRadius: 10, padding: '20px 14px', textAlign: 'center', background: '#fafaf8', cursor: 'pointer', transition: 'all 0.15s' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {form.file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16 }}>📎</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{form.file.name}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>({(form.file.size / 1024 / 1024).toFixed(1)} Mo)</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, file: null })); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    style={{ fontSize: 12, color: '#ef4444', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>✕ Retirer</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📤</div>
                  <div style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 600 }}>Glissez un fichier ici</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>ou <span style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'underline' }}>cliquez pour parcourir</span></div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>PDF, images, vidéos, documents — max 50 Mo</div>
                </div>
              )}
              <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) setForm(prev => ({ ...prev, file: f, name: prev.name || f.name.replace(/\.[^.]+$/, '') }))
                }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Nom du fichier *</label>
            <input style={inp} type="text" placeholder="Ex: Photo principale HD" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Catégorie *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {Object.entries(CATEGORIES).map(([type, cfg]) => (
                <button key={type} type="button" onClick={() => setForm(prev => ({ ...prev, type }))}
                  style={{ padding: '10px 6px', borderRadius: 8, border: `1px solid ${form.type === type ? cfg.color : '#e8e8e3'}`, background: form.type === type ? `${cfg.color}15` : '#fafaf8', color: form.type === type ? cfg.color : '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                  <div style={{ marginTop: 2 }}>{cfg.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: 'none' }} value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="Description, détails..." />
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: saving ? '#9ca3af' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Upload en cours...' : 'Ajouter le fichier'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
