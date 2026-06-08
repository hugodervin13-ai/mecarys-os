import { useEffect, useState } from 'react'
import { getDocuments, addDocument, deleteDocument } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatDate } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const typeIcons = { facture: '🧾', certificat: '📜', commande: '📋', rapport: '📊', contrat: '📝' }

export default function Documents() {
  const { user } = useStore()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'facture', notes: '' })
  const [useMock, setUseMock] = useState(false)

  const mockDocuments = [
    { id: 'm1', name: 'Facture fournisseur #2024-042', type: 'facture', created_at: '2024-05-10', notes: '' },
    { id: 'm2', name: 'Certificat CE - Kit Phare LED', type: 'certificat', created_at: '2024-04-28', notes: '' },
    { id: 'm3', name: 'Bon de commande #BC-2024-018', type: 'commande', created_at: '2024-04-15', notes: '' },
    { id: 'm4', name: 'Rapport qualite Q1 2024', type: 'rapport', created_at: '2024-04-01', notes: '' },
    { id: 'm5', name: 'Contrat fournisseur Shenzhen', type: 'contrat', created_at: '2024-03-15', notes: '' },
  ]

  useEffect(() => {
    if (user) loadData()
  }, [user])

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">Documents</h1>
        <button onClick={() => setShowForm(true)} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          + Ajouter un document
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        {['all', 'facture', 'certificat', 'commande', 'rapport', 'contrat'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === type ? 'bg-[#6366f1] text-white' : 'bg-white text-[#6b7280] hover:text-[#1a1a2e] border border-[#e8e8e3]'}`}
          >
            {type === 'all' ? 'Tous' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e3] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#fafaf8]">
            <tr>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Document</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Type</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Date</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr key={doc.id} className="border-t border-[#e8e8e3] hover:bg-[#f5f5f0]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeIcons[doc.type] || '📄'}</span>
                    <span className="text-[#1a1a2e] text-sm">{doc.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-[#6366f1]/20 text-[#6366f1] px-2 py-1 rounded-full text-xs capitalize">{doc.type}</span>
                </td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{doc.created_at ? formatDate(doc.created_at) : '-'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(doc.id)} className="text-[#ef4444] hover:text-red-300 text-sm">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-[#6b7280]">Aucun document.</div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Ajouter un document">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#6b7280] text-sm mb-1">Nom du document *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
          </div>
          <div>
            <label className="block text-[#6b7280] text-sm mb-1">Type *</label>
            <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm">
              <option value="facture">Facture</option>
              <option value="certificat">Certificat</option>
              <option value="commande">Bon de commande</option>
              <option value="rapport">Rapport</option>
              <option value="contrat">Contrat</option>
            </select>
          </div>
          <div>
            <label className="block text-[#6b7280] text-sm mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none resize-none" />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
