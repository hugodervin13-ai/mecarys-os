import { useState, useEffect } from 'react'
import { addProduct, getProducts, deleteProduct } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency, formatNumber } from '../lib/utils'
import Modal from '../components/Modal'
import Loading from '../components/Loading'

export default function Produits() {
  const { user, setProducts } = useStore()
  const [products, setLocalProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    asin: '', name: '', price_current: '', cost: '',
    stock_fba: '', stock_alerte: '20', rating: '', reviews_count: '',
    units_sold_30d: '', revenue_30d: '', profit_30d: '', acos: ''
  })

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const { data } = await getProducts(user.id)
    setLocalProducts(data || [])
    setProducts(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const productData = {}
    for (const [key, val] of Object.entries(form)) {
      if (val !== '') {
        productData[key] = ['asin', 'name'].includes(key) ? val : Number(val)
      }
    }
    await addProduct(user.id, productData)
    setForm({ asin: '', name: '', price_current: '', cost: '', stock_fba: '', stock_alerte: '20', rating: '', reviews_count: '', units_sold_30d: '', revenue_30d: '', profit_30d: '', acos: '' })
    setShowForm(false)
    loadData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return
    await deleteProduct(id)
    loadData()
  }

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.asin?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">Produits</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          + Ajouter un produit
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher par nom ou ASIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 bg-white border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none"
        />
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e3] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#fafaf8]">
            <tr>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">ASIN</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Nom</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Prix</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Cout</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Stock FBA</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Note</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Statut</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-t border-[#e8e8e3] hover:bg-[#f5f5f0]">
                <td className="px-6 py-4 text-[#1a1a2e] text-sm font-mono">{product.asin}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{product.name}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{formatCurrency(product.price_current || 0)}</td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{formatCurrency(product.cost || 0)}</td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${(product.stock_fba || 0) <= (product.stock_alerte || 20) ? 'text-[#ef4444]' : 'text-[#1a1a2e]'}`}>
                    {formatNumber(product.stock_fba || 0)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-1 rounded-full text-xs">
                    ★ {product.rating || 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${product.status === 'active' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#9ca3af]/10 text-[#6b7280]'}`}>
                    {product.status || 'active'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-[#ef4444] hover:text-red-300 text-sm"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-[#6b7280]">
            {search ? 'Aucun produit trouve.' : 'Aucun produit. Ajoutez-en un pour commencer !'}
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouveau produit">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">ASIN</label>
              <input type="text" value={form.asin} onChange={(e) => setForm({...form, asin: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Prix actuel</label>
              <input type="number" step="0.01" value={form.price_current} onChange={(e) => setForm({...form, price_current: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[#6b7280] text-sm mb-1">Nom du produit</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Cout unitaire</label>
              <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({...form, cost: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Stock FBA</label>
              <input type="number" value={form.stock_fba} onChange={(e) => setForm({...form, stock_fba: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Note</label>
              <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({...form, rating: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Nombre d'avis</label>
              <input type="number" value={form.reviews_count} onChange={(e) => setForm({...form, reviews_count: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Unites 30j</label>
              <input type="number" value={form.units_sold_30d} onChange={(e) => setForm({...form, units_sold_30d: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">CA 30j</label>
              <input type="number" step="0.01" value={form.revenue_30d} onChange={(e) => setForm({...form, revenue_30d: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">ACOS %</label>
              <input type="number" step="0.1" value={form.acos} onChange={(e) => setForm({...form, acos: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
          </div>
          <button type="submit" className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white py-3 rounded-lg font-semibold transition-colors">
            Ajouter le produit
          </button>
        </form>
      </Modal>
    </div>
  )
}
