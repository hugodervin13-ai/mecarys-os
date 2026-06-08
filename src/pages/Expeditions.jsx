import { useEffect, useState } from 'react'
import { getShipments, addShipment, deleteShipment, updateShipment } from '../lib/supabase'
import { useStore } from '../lib/store'
import { getStatusColor } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const statusLabels = {
  production: 'Production',
  transit: 'En transit',
  customs: 'Douane',
  warehouse: 'Entrepot',
  delivered: 'Livre',
  fba: 'Amazon FBA'
}

const emptyForm = { reference: '', origin: '', destination: '', carrier: '', items: '', status: 'transit', eta: '' }

export default function Expeditions() {
  const { user } = useStore()
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [useMock, setUseMock] = useState(false)

  const mockShipments = [
    { id: 'm1', reference: 'EXP-2024-001', origin: 'Shenzhen', destination: 'Amazon FBA FR', status: 'transit', carrier: 'DHL', eta: '2024-05-20', items: 500 },
    { id: 'm2', reference: 'EXP-2024-002', origin: 'Guangzhou', destination: 'Amazon FBA DE', status: 'customs', carrier: 'FedEx', eta: '2024-05-18', items: 300 },
    { id: 'm3', reference: 'EXP-2024-003', origin: 'Istanbul', destination: 'Amazon FBA FR', status: 'delivered', carrier: 'TNT', eta: '2024-05-10', items: 200 },
  ]

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const { data, error } = await getShipments(user.id)
    if (error || !data || data.length === 0) {
      setShipments(mockShipments)
      setUseMock(true)
    } else {
      setShipments(data)
      setUseMock(false)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const shipmentData = {
      reference: form.reference || `EXP-${Date.now().toString(36).toUpperCase()}`,
      origin: form.origin,
      destination: form.destination,
      carrier: form.carrier,
      items: Number(form.items),
      status: form.status,
      eta: form.eta || null,
    }
    if (useMock) {
      setShipments(prev => [...prev, { ...shipmentData, id: `m${Date.now()}` }])
    } else {
      await addShipment(user.id, shipmentData)
      await loadData()
    }
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
  }

  const handleStatusChange = async (id, newStatus) => {
    if (useMock || String(id).startsWith('m')) {
      setShipments(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
    } else {
      await updateShipment(id, { status: newStatus })
      loadData()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette expedition ?')) return
    if (useMock || String(id).startsWith('m')) {
      setShipments(prev => prev.filter(s => s.id !== id))
    } else {
      await deleteShipment(id)
      loadData()
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">Expeditions</h1>
        <button onClick={() => setShowForm(true)} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          + Nouvelle expedition
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">En transit</p>
          <p className="text-2xl font-bold text-[#3b82f6] mt-1">{shipments.filter(s => s.status === 'transit').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">En douane</p>
          <p className="text-2xl font-bold text-[#f59e0b] mt-1">{shipments.filter(s => s.status === 'customs').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Livrees</p>
          <p className="text-2xl font-bold text-[#10b981] mt-1">{shipments.filter(s => s.status === 'delivered' || s.status === 'fba').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Unites en cours</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{shipments.filter(s => s.status !== 'delivered' && s.status !== 'fba').reduce((a, s) => a + (s.items || 0), 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e3] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#fafaf8]">
            <tr>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Reference</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Origine</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Destination</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Transporteur</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Unites</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Statut</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">ETA</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="border-t border-[#e8e8e3] hover:bg-[#f5f5f0]">
                <td className="px-6 py-4 text-[#1a1a2e] text-sm font-mono">{s.reference}</td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{s.origin}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{s.destination}</td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{s.carrier}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{s.items}</td>
                <td className="px-6 py-4">
                  <select
                    value={s.status}
                    onChange={(e) => handleStatusChange(s.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs border cursor-pointer ${getStatusColor(s.status)}`}
                  >
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{s.eta || '-'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(s.id)} className="text-[#ef4444] hover:text-red-300 text-sm">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shipments.length === 0 && (
          <div className="p-12 text-center text-[#6b7280]">Aucune expedition.</div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouvelle expedition">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Reference</label>
              <input type="text" placeholder="Auto-genere si vide" value={form.reference} onChange={(e) => setForm({...form, reference: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Transporteur *</label>
              <input type="text" value={form.carrier} onChange={(e) => setForm({...form, carrier: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Origine *</label>
              <input type="text" value={form.origin} onChange={(e) => setForm({...form, origin: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Destination *</label>
              <input type="text" value={form.destination} onChange={(e) => setForm({...form, destination: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Unites *</label>
              <input type="number" value={form.items} onChange={(e) => setForm({...form, items: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Statut</label>
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm">
                {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">ETA</label>
              <input type="date" value={form.eta} onChange={(e) => setForm({...form, eta: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
            {saving ? 'Creation...' : 'Creer l\'expedition'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
