import { useEffect, useState } from 'react'
import { getOrders, addOrder, getProducts, deleteOrder, updateOrder } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const statusLabels = {
  pending: 'En attente',
  production: 'Production',
  shipped: 'Expediee',
  transit: 'En transit',
  delivered: 'Livree',
  cancelled: 'Annulee'
}

const emptyForm = { order_number: '', supplier: '', product_id: '', quantity: '', cost_total: '', expected_delivery: '', status: 'pending' }

export default function Commandes() {
  const { user } = useStore()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const [ordersRes, productsRes] = await Promise.all([
      getOrders(user.id),
      getProducts(user.id)
    ])
    setOrders(ordersRes.data || [])
    setProducts(productsRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const orderData = {
      order_number: form.order_number || `CMD-${Date.now().toString(36).toUpperCase()}`,
      supplier: form.supplier,
      quantity: Number(form.quantity),
      cost_total: Number(form.cost_total),
      status: form.status,
    }
    if (form.product_id) orderData.product_id = form.product_id
    if (form.expected_delivery) orderData.expected_delivery = form.expected_delivery

    await addOrder(user.id, orderData)
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const handleStatusChange = async (id, newStatus) => {
    await updateOrder(id, { status: newStatus })
    loadData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette commande ?')) return
    await deleteOrder(id)
    loadData()
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">Commandes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          + Nouvelle commande
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Total commandes</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">En attente</p>
          <p className="text-2xl font-bold text-[#f59e0b] mt-1">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">En transit</p>
          <p className="text-2xl font-bold text-[#3b82f6] mt-1">{orders.filter(o => o.status === 'transit' || o.status === 'shipped').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Montant total</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{formatCurrency(orders.reduce((a, o) => a + (o.cost_total || 0), 0))}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e3] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#fafaf8]">
            <tr>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">N° commande</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Fournisseur</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Produit</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Quantite</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Montant</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Statut</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Livraison prevue</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-[#e8e8e3] hover:bg-[#f5f5f0]">
                <td className="px-6 py-4 text-[#1a1a2e] text-sm font-mono">{order.order_number}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{order.supplier}</td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{order.products?.name || '-'}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{order.quantity}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{formatCurrency(order.cost_total || 0)}</td>
                <td className="px-6 py-4">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs border cursor-pointer ${getStatusColor(order.status)}`}
                  >
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">
                  {order.expected_delivery ? formatDate(order.expected_delivery) : '-'}
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(order.id)} className="text-[#ef4444] hover:text-red-300 text-sm">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-12 text-center text-[#6b7280]">
            Aucune commande. Creez-en une pour commencer le suivi.
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouvelle commande">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">N° commande</label>
              <input type="text" placeholder="Auto-genere si vide" value={form.order_number} onChange={(e) => setForm({...form, order_number: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Fournisseur *</label>
              <input type="text" value={form.supplier} onChange={(e) => setForm({...form, supplier: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
          </div>
          {products.length > 0 && (
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Produit</label>
              <select value={form.product_id} onChange={(e) => setForm({...form, product_id: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm">
                <option value="">-- Selectionner --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.asin})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Quantite *</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Montant total (€) *</label>
              <input type="number" step="0.01" value={form.cost_total} onChange={(e) => setForm({...form, cost_total: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-[#6b7280] text-sm mb-1">Livraison prevue</label>
            <input type="date" value={form.expected_delivery} onChange={(e) => setForm({...form, expected_delivery: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
            {saving ? 'Creation...' : 'Creer la commande'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
