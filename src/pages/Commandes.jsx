import { useEffect, useState } from 'react'
import { getOrders } from '../lib/supabase'
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

export default function Commandes() {
  const { user } = useStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const { data } = await getOrders(user.id)
    setOrders(data || [])
    setLoading(false)
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Commandes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#5a2d82] hover:bg-[#6b3d92] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          + Nouvelle commande
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Total commandes</p>
          <p className="text-2xl font-bold text-white mt-1">{orders.length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">En attente</p>
          <p className="text-2xl font-bold text-[#f59e0b] mt-1">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">En transit</p>
          <p className="text-2xl font-bold text-[#00d4ff] mt-1">{orders.filter(o => o.status === 'transit' || o.status === 'shipped').length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Montant total</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(orders.reduce((a, o) => a + (o.cost_total || 0), 0))}</p>
        </div>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl border border-[#2d3748] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f1419]">
            <tr>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">N° commande</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Fournisseur</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Produit</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Quantite</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Montant</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Statut</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Livraison prevue</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-[#2d3748] hover:bg-[#2d3748]/30">
                <td className="px-6 py-4 text-white text-sm font-mono">{order.order_number}</td>
                <td className="px-6 py-4 text-white text-sm">{order.supplier}</td>
                <td className="px-6 py-4 text-[#a0aec0] text-sm">{order.products?.name || '-'}</td>
                <td className="px-6 py-4 text-white text-sm">{order.quantity}</td>
                <td className="px-6 py-4 text-white text-sm">{formatCurrency(order.cost_total || 0)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(order.status)}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#a0aec0] text-sm">
                  {order.expected_delivery ? formatDate(order.expected_delivery) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-12 text-center text-[#a0aec0]">
            Aucune commande. Creez-en une pour commencer le suivi.
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouvelle commande">
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#a0aec0] text-sm mb-1">N° commande</label>
              <input type="text" className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm focus:border-[#5a2d82] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#a0aec0] text-sm mb-1">Fournisseur</label>
              <input type="text" className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm focus:border-[#5a2d82] focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#a0aec0] text-sm mb-1">Quantite</label>
              <input type="number" className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm focus:border-[#5a2d82] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#a0aec0] text-sm mb-1">Montant total</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm focus:border-[#5a2d82] focus:outline-none" />
            </div>
          </div>
          <button type="submit" className="w-full bg-[#5a2d82] hover:bg-[#6b3d92] text-white py-3 rounded-lg font-semibold transition-colors">
            Creer la commande
          </button>
        </form>
      </Modal>
    </div>
  )
}
