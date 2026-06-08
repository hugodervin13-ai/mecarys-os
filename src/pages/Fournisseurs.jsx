import { useEffect, useState } from 'react'
import { getSuppliers, addSupplier, deleteSupplier } from '../lib/supabase'
import { useStore } from '../lib/store'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function Fournisseurs() {
  const { user } = useStore()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', country: '', contact_email: '', phone: '', status: 'active' })
  const [useMock, setUseMock] = useState(false)

  const mockSuppliers = [
    { id: 'm1', name: 'Shenzhen Electronics Co.', country: 'Chine', contact_email: 'contact@shenzhen-elec.com', status: 'active', created_at: '2024-04-15' },
    { id: 'm2', name: 'Guangzhou Trading Ltd.', country: 'Chine', contact_email: 'sales@gz-trading.com', status: 'active', created_at: '2024-03-20' },
    { id: 'm3', name: 'Istanbul Packaging', country: 'Turquie', contact_email: 'info@ist-pack.com', status: 'inactive', created_at: '2024-01-10' },
  ]

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const { data, error } = await getSuppliers(user.id)
    if (error || !data || data.length === 0) {
      setSuppliers(mockSuppliers)
      setUseMock(true)
    } else {
      setSuppliers(data)
      setUseMock(false)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    if (useMock) {
      setSuppliers(prev => [...prev, { ...form, id: `m${Date.now()}`, created_at: new Date().toISOString() }])
    } else {
      await addSupplier(user.id, form)
      await loadData()
    }
    setForm({ name: '', country: '', contact_email: '', phone: '', status: 'active' })
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce fournisseur ?')) return
    if (useMock || String(id).startsWith('m')) {
      setSuppliers(prev => prev.filter(s => s.id !== id))
    } else {
      await deleteSupplier(id)
      loadData()
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">Fournisseurs</h1>
        <button onClick={() => setShowForm(true)} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          + Ajouter un fournisseur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Total fournisseurs</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{suppliers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Actifs</p>
          <p className="text-2xl font-bold text-[#10b981] mt-1">{suppliers.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Pays</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{new Set(suppliers.map(s => s.country)).size}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e3] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#fafaf8]">
            <tr>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Nom</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Pays</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Contact</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Statut</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-[#e8e8e3] hover:bg-[#f5f5f0]">
                <td className="px-6 py-4 text-[#1a1a2e] text-sm font-medium">{s.name}</td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{s.country}</td>
                <td className="px-6 py-4 text-[#3b82f6] text-sm">{s.contact_email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'active' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#9ca3af]/10 text-[#6b7280]'}`}>
                    {s.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(s.id)} className="text-[#ef4444] hover:text-red-300 text-sm">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && (
          <div className="p-12 text-center text-[#6b7280]">Aucun fournisseur. Ajoutez-en un pour commencer.</div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouveau fournisseur">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#6b7280] text-sm mb-1">Nom *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Pays *</label>
              <input type="text" value={form.country} onChange={(e) => setForm({...form, country: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Contact email *</label>
              <input type="email" value={form.contact_email} onChange={(e) => setForm({...form, contact_email: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Telephone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Statut</label>
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm">
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
