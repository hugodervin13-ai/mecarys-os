import { useEffect, useState } from 'react'
import { getDocuments, addDocument, deleteDocument } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatDate } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }
const inp = { width: '100%', padding: '9px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, display: 'block' }

const TYPE_CONFIG = {
  facture:    { label: 'Facture',          icon: '🧾', color: '#6366f1' },
  certificat: { label: 'Certificat',       icon: '📜', color: '#10b981' },
  commande:   { label: 'Bon de commande',  icon: '📋', color: '#3b82f6' },
  rapport:    { label: 'Rapport',          icon: '📊', color: '#f59e0b' },
  contrat:    { label: 'Contrat',          icon: '📝', color: '#8b5cf6' },
}

const mockDocuments = [
  { id: 'm1', name: 'Facture fournisseur #2024-042', type: 'facture', created_at: '2024-05-10', notes: 'Shenzhen Electronics Co.' },
  { id: 'm2', name: 'Certificat CE - Kit Phare LED', type: 'certificat', created_at: '2024-04-28', notes: 'Valable jusqu\'en 2026' },
  { id: 'm3', name: 'Bon de commande #BC-2024-018', type: 'commande', created_at: '2024-04-15', notes: '500 unites commandees' },
  { id: 'm4', name: 'Rapport qualite Q1 2024', type: 'rapport', created_at: '2024-04-01', notes: '' },
  { id: 'm5', name: 'Contrat fournisseur Shenzhen', type: 'contrat', created_at: '2024-03-15', notes: 'Renouvelable annuellement' },
]

export default function Documents() {
  const { user } = useStore()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'facture', notes: '' })
  const [useMock, setUseMock] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const { data, error } = await getDocuments(user.id)
    if (error || !data || data.length === 0) {
      setDocuments(mockDocuments)
      setUseMock(true)
    } else {
      setDocuments(data)
      setUseMock(false)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    if (useMock) {
      setDocuments(prev => [{ ...form, id: `m${Date.now()}`, created_at: new Date().toISOString() }, ...prev])
    } else {
      await addDocument(user.id, form)
      await loadData()
    }
    setForm({ name: '', type: 'facture', notes: '' })
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

  const filtered = filter === 'all' ? documents : documents.filter(d => d.type === filter)

  if (loading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Documents</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Centralisez vos factures, certificats et documents fournisseurs</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter un document
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 22 }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const count = documents.filter(d => d.type === type).length
          return (
            <div key={type} style={{ ...box, padding: 16, cursor: 'pointer', border: filter === type ? `1px solid ${cfg.color}` : '1px solid #e8e8e3' }}
              onClick={() => setFilter(filter === type ? 'all' : type)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{cfg.label}s</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: filter === type ? cfg.color : '#1a1a2e' }}>{count}</p>
                </div>
                <span style={{ fontSize: 22 }}>{cfg.icon}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['all', `Tous (${documents.length})`], ...Object.entries(TYPE_CONFIG).map(([k, v]) => [k, `${v.icon} ${v.label}s`])].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filter === val ? '#6366f1' : '#e8e8e3'}`, background: filter === val ? '#6366f1' : '#fff', color: filter === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ ...box, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaf8' }}>
              {['Document', 'Type', 'Notes', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(doc => {
              const cfg = TYPE_CONFIG[doc.type] || { icon: '📄', color: '#6b7280', label: doc.type }
              return (
                <tr key={doc.id} style={{ borderTop: '1px solid #f0f0eb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {cfg.icon}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{doc.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 12, color: '#6b7280', maxWidth: 200 }}>
                    {doc.notes || <span style={{ color: '#d1d5db' }}>-</span>}
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 12, color: '#9ca3af' }}>
                    {doc.created_at ? formatDate(doc.created_at) : '-'}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <button onClick={() => handleDelete(doc.id)}
                      style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Aucun document</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Centralisez vos factures, certificats et contrats ici</div>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Ajouter un document">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Nom du document *</label>
            <input style={inp} type="text" placeholder="Ex: Facture fournisseur #2024-001" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                <button key={type} type="button" onClick={() => setForm({ ...form, type })}
                  style={{ padding: '10px 4px', borderRadius: 8, border: `1px solid ${form.type === type ? cfg.color : '#e8e8e3'}`, background: form.type === type ? `${cfg.color}15` : '#fafaf8', color: form.type === type ? cfg.color : '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{cfg.icon}</div>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: 'none' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Informations complementaires..." />
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: saving ? '#9ca3af' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Ajout...' : 'Ajouter le document'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
