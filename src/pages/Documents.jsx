import { useEffect, useState } from 'react'
import { getDocuments, addDocument, deleteDocument, getProducts, uploadFile } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatDate } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }
const inp = { width: '100%', padding: '9px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, display: 'block' }

const CATEGORIES = {
  photo:       { label: 'Photos produit',    icon: '📸', color: '#6366f1' },
  video:       { label: 'Videos',            icon: '🎬', color: '#ec4899' },
  facture:     { label: 'Factures',          icon: '🧾', color: '#10b981' },
  certificat:  { label: 'Certificats',       icon: '📜', color: '#f59e0b' },
  commande:    { label: 'Bons de commande',  icon: '📋', color: '#3b82f6' },
  technique:   { label: 'Fiches techniques', icon: '🔧', color: '#8b5cf6' },
  packaging:   { label: 'Packaging / BAT',   icon: '📦', color: '#f97316' },
  listing:     { label: 'Listing Amazon',    icon: '📝', color: '#06b6d4' },
  autre:       { label: 'Autres',            icon: '📁', color: '#6b7280' },
}

const mockProducts = [
  { id: 'p1', name: 'Kit Phare LED H7', asin: 'B08N5WRWNW' },
  { id: 'p2', name: 'Ampoule LED H4', asin: 'B09X1ZZKZL' },
]

const mockDocuments = [
  { id: 'm1', name: 'Photo principale HD', type: 'photo', product_id: 'p1', created_at: '2024-05-10', notes: 'Photo packshot fond blanc' },
  { id: 'm2', name: 'Video demo installation', type: 'video', product_id: 'p1', created_at: '2024-05-08', notes: 'Video 30s pour listing' },
  { id: 'm3', name: 'Facture Shenzhen #042', type: 'facture', product_id: 'p1', created_at: '2024-04-28', notes: '500 unites' },
  { id: 'm4', name: 'Certificat CE', type: 'certificat', product_id: 'p1', created_at: '2024-04-15', notes: 'Valable 2026' },
  { id: 'm5', name: 'BAT packaging V3', type: 'packaging', product_id: 'p1', created_at: '2024-04-10', notes: 'Version finale approuvee' },
  { id: 'm6', name: 'Fiche technique H7', type: 'technique', product_id: 'p1', created_at: '2024-04-05', notes: 'Specs completes' },
  { id: 'm7', name: 'Photo lifestyle', type: 'photo', product_id: 'p2', created_at: '2024-05-02', notes: 'Sur vehicule' },
  { id: 'm8', name: 'Facture Guangzhou #018', type: 'facture', product_id: 'p2', created_at: '2024-04-20', notes: '300 unites' },
  { id: 'm9', name: 'Certificat FCC', type: 'certificat', product_id: 'p2', created_at: '2024-03-15', notes: '' },
]

export default function Documents() {
  const { user } = useStore()
  const [documents, setDocuments] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'photo', notes: '', product_id: '', file: null })
  const [folderForm, setFolderForm] = useState({ name: '', asin: '' })
  const [editingFolder, setEditingFolder] = useState(null)
  const [showEditFolder, setShowEditFolder] = useState(false)
  const [useMock, setUseMock] = useState(false)
  const [localProducts, setLocalProducts] = useState([])

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const [docRes, prodRes] = await Promise.all([getDocuments(user.id), getProducts(user.id)])
    const hasProducts = prodRes.data && prodRes.data.length > 0
    if (!hasProducts) {
      setProducts(mockProducts)
      setLocalProducts(mockProducts)
      setDocuments(mockDocuments)
      setUseMock(true)
    } else {
      setProducts(prodRes.data)
      setLocalProducts(prodRes.data)
      setDocuments(docRes.data || [])
      setUseMock(false)
    }
    setLoading(false)
  }

  const createFolder = (e) => {
    e.preventDefault()
    const newP = { id: `p${Date.now()}`, name: folderForm.name, asin: folderForm.asin || 'N/A' }
    setLocalProducts(prev => [...prev, newP])
    setProducts(prev => [...prev, newP])
    setFolderForm({ name: '', asin: '' })
    setShowFolderForm(false)
    setSelectedProduct(newP.id)
  }

  const openEditFolder = (p) => {
    setEditingFolder({ ...p })
    setShowEditFolder(true)
  }

  const saveEditFolder = (e) => {
    e.preventDefault()
    setLocalProducts(prev => prev.map(p => p.id === editingFolder.id ? editingFolder : p))
    setProducts(prev => prev.map(p => p.id === editingFolder.id ? editingFolder : p))
    setShowEditFolder(false)
    setEditingFolder(null)
  }

  const deleteFolder = (id) => {
    if (!confirm('Supprimer ce dossier et tous ses documents ?')) return
    setLocalProducts(prev => prev.filter(p => p.id !== id))
    setProducts(prev => prev.filter(p => p.id !== id))
    setDocuments(prev => prev.filter(d => d.product_id !== id))
    if (selectedProduct === id) setSelectedProduct(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    let fileUrl = ''
    let fileName = form.name

    if (form.file) {
      if (!fileName) fileName = form.file.name
      const uploadRes = await uploadFile(user.id, form.file)
      if (uploadRes.data?.url) fileUrl = uploadRes.data.url
    }

    const docData = { name: fileName, type: form.type, notes: form.notes, product_id: selectedProduct || form.product_id, file_url: fileUrl }
    if (useMock || !selectedProduct || String(selectedProduct).startsWith('p')) {
      setDocuments(prev => [{ ...docData, id: `m${Date.now()}`, created_at: new Date().toISOString() }, ...prev])
    } else {
      await addDocument(user.id, docData)
      await loadData()
    }
    setForm({ name: '', type: 'photo', notes: '', product_id: '', file: null })
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce document ?')) return
    if (useMock || String(id).startsWith('m')) {
      setDocuments(prev => prev.filter(d => d.id !== id))
    } else {
      await deleteDocument(id)
      loadData()
    }
  }

  const allProducts = localProducts
  const productDocs = selectedProduct ? documents.filter(d => d.product_id === selectedProduct) : []
  const filteredDocs = categoryFilter === 'all' ? productDocs : productDocs.filter(d => d.type === categoryFilter)

  if (loading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Documents produits</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Organisez tous vos fichiers par produit : photos, videos, factures, certificats...</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowFolderForm(true)}
            style={{ padding: '10px 18px', background: '#fff', color: '#6366f1', border: '1px solid #6366f1', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Creer un dossier
          </button>
          {selectedProduct && (
            <button onClick={() => { setForm({ ...form, product_id: selectedProduct }); setShowForm(true) }}
              style={{ padding: '10px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Ajouter un fichier
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18, minHeight: 500 }}>
        {/* Sidebar — product folders */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, padding: '0 4px' }}>
            Dossiers produits ({allProducts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allProducts.map(p => {
              const docCount = documents.filter(d => d.product_id === p.id).length
              const isActive = selectedProduct === p.id
              return (
                <div key={p.id} style={{ position: 'relative' }}>
                  <button onClick={() => { setSelectedProduct(p.id); setCategoryFilter('all') }}
                    style={{ ...box, padding: '14px 16px', cursor: 'pointer', border: isActive ? '2px solid #6366f1' : '1px solid #e8e8e3', background: isActive ? '#6366f108' : '#fff', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: isActive ? '#6366f115' : '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      📁
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#6366f1' : '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginTop: 1 }}>{p.asin}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: isActive ? '#6366f1' : '#1a1a2e' }}>{docCount}</span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>fichiers</span>
                    </div>
                  </button>
                  {isActive && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, paddingLeft: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); openEditFolder(p) }}
                        style={{ fontSize: 11, color: '#6366f1', background: '#6366f110', border: '1px solid #6366f125', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontWeight: 600 }}>
                        ✏️ Modifier
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteFolder(p.id) }}
                        style={{ fontSize: 11, color: '#ef4444', background: '#ef444410', border: '1px solid #ef444425', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontWeight: 600 }}>
                        🗑 Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {allProducts.length === 0 && (
              <div style={{ ...box, padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>Creez un dossier produit pour commencer</div>
              </div>
            )}
          </div>
        </div>

        {/* Main content — files inside selected folder */}
        <div>
          {!selectedProduct ? (
            <div style={{ ...box, padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>📂</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>Selectionnez un dossier produit</div>
              <div style={{ fontSize: 13, color: '#9ca3af', maxWidth: 380, margin: '0 auto' }}>
                Choisissez un produit dans la liste a gauche pour voir et gerer ses documents (photos, videos, factures, certificats, etc.)
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>
                  {allProducts.find(p => p.id === selectedProduct)?.name}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
                  {allProducts.find(p => p.id === selectedProduct)?.asin} · {productDocs.length} fichier{productDocs.length !== 1 ? 's' : ''}
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
                      {['Fichier', 'Categorie', 'Notes', 'Date', ''].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(doc => {
                      const cfg = CATEGORIES[doc.type] || CATEGORIES.autre
                      const hasFile = !!doc.file_url
                      return (
                        <tr key={doc.id} style={{ borderTop: '1px solid #f0f0eb', cursor: hasFile ? 'pointer' : 'default' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                          onClick={() => { if (hasFile) window.open(doc.file_url, '_blank') }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                {cfg.icon}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: hasFile ? '#6366f1' : '#1a1a2e', textDecoration: hasFile ? 'underline' : 'none' }}>{doc.name}</span>
                                  {hasFile && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>📎</span>}
                                </div>
                                {!hasFile && <div style={{ fontSize: 10, color: '#d1d5db', marginTop: 1 }}>Pas de fichier joint</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', maxWidth: 180 }}>
                            {doc.notes || <span style={{ color: '#d1d5db' }}>-</span>}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                            {doc.created_at ? formatDate(doc.created_at) : '-'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                              {hasFile && (
                                <a href={doc.file_url} download target="_blank" rel="noreferrer"
                                  style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}>
                                  Ouvrir
                                </a>
                              )}
                              <button onClick={() => handleDelete(doc.id)}
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
      <Modal isOpen={showFolderForm} onClose={() => setShowFolderForm(false)} title="Creer un dossier produit">
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
            Creer le dossier
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
            <button type="submit"
              style={{ width: '100%', padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Enregistrer
            </button>
          </form>
        )}
      </Modal>

      {/* Modal — add file */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Ajouter un fichier">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Fichier</label>
            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#6366f108' }}
              onDragLeave={e => { e.currentTarget.style.borderColor = '#e8e8e3'; e.currentTarget.style.background = '#fafaf8' }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#e8e8e3'; e.currentTarget.style.background = '#fafaf8'; const f = e.dataTransfer.files[0]; if (f) setForm({ ...form, file: f, name: form.name || f.name.replace(/\.[^.]+$/, '') }) }}
              style={{ border: '2px dashed #e8e8e3', borderRadius: 10, padding: '18px 14px', textAlign: 'center', background: '#fafaf8', cursor: 'pointer', transition: 'all 0.15s' }}
              onClick={() => document.getElementById('file-input').click()}
            >
              {form.file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📎</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{form.file.name}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>({(form.file.size / 1024 / 1024).toFixed(1)} Mo)</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setForm({ ...form, file: null }) }}
                    style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginLeft: 4 }}>✕</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>📤</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Glissez un fichier ici ou <span style={{ color: '#6366f1', fontWeight: 600 }}>parcourir</span></div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>PDF, images, videos, documents — max 50 Mo</div>
                </div>
              )}
              <input id="file-input" type="file" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) setForm({ ...form, file: f, name: form.name || f.name.replace(/\.[^.]+$/, '') }) }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Nom du fichier *</label>
            <input style={inp} type="text" placeholder="Ex: Photo principale HD" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Categorie *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {Object.entries(CATEGORIES).map(([type, cfg]) => (
                <button key={type} type="button" onClick={() => setForm({ ...form, type })}
                  style={{ padding: '10px 6px', borderRadius: 8, border: `1px solid ${form.type === type ? cfg.color : '#e8e8e3'}`, background: form.type === type ? `${cfg.color}15` : '#fafaf8', color: form.type === type ? cfg.color : '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                  <div style={{ marginTop: 2 }}>{cfg.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: 'none' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Description, details..." />
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: saving ? '#9ca3af' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Ajout...' : 'Ajouter le fichier'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
