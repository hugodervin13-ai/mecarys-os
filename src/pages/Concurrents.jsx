import { useEffect, useState } from 'react'
import { getAllCompetitors, addCompetitor, deleteCompetitor, getProducts } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function Concurrents() {
  const { user } = useStore()
  const [competitors, setCompetitors] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ product_id: '', competitor_asin: '', competitor_name: '', competitor_price: '', competitor_rating: '' })

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const [compRes, prodRes] = await Promise.all([getAllCompetitors(user.id), getProducts(user.id)])
    setCompetitors(compRes.data || [])
    setProducts(prodRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const product = products.find(p => p.id === form.product_id)
    const competitorPrice = Number(form.competitor_price)
    await addCompetitor({
      product_id: form.product_id,
      competitor_asin: form.competitor_asin.toUpperCase(),
      competitor_name: form.competitor_name,
      competitor_price: competitorPrice,
      competitor_rating: Number(form.competitor_rating) || 0,
      price_difference: product ? Math.round(((product.price_current || 0) - competitorPrice) * 100) / 100 : 0,
      tracked_date: new Date().toISOString(),
    })
    setForm({ product_id: '', competitor_asin: '', competitor_name: '', competitor_price: '', competitor_rating: '' })
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce concurrent ?')) return
    await deleteCompetitor(id)
    loadData()
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">Concurrents</h1>
        <button onClick={() => setShowForm(true)} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          + Ajouter un concurrent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Concurrents suivis</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{competitors.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Prix moyen concurrents</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{competitors.length > 0 ? formatCurrency(competitors.reduce((a, c) => a + (c.competitor_price || 0), 0) / competitors.length) : '-'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Moins chers que vous</p>
          <p className="text-2xl font-bold text-[#ef4444] mt-1">{competitors.filter(c => (c.price_difference || 0) > 0).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e3] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#fafaf8]">
            <tr>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">ASIN concurrent</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Nom</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Prix</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Note</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Ecart prix</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Votre produit</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((c) => (
              <tr key={c.id} className="border-t border-[#e8e8e3] hover:bg-[#f5f5f0]">
                <td className="px-6 py-4 text-[#1a1a2e] text-sm font-mono">{c.competitor_asin}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{c.competitor_name}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{formatCurrency(c.competitor_price || 0)}</td>
                <td className="px-6 py-4">
                  <span className="bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-1 rounded-full text-xs">★ {c.competitor_rating || 0}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${(c.price_difference || 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {(c.price_difference || 0) >= 0 ? '+' : ''}{formatCurrency(c.price_difference || 0)}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{c.products?.name} ({c.products?.asin})</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(c.id)} className="text-[#ef4444] hover:text-red-300 text-sm">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {competitors.length === 0 && (
          <div className="p-12 text-center text-[#6b7280]">
            Aucun concurrent suivi. Ajoutez des concurrents a vos produits pour les suivre.
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Ajouter un concurrent">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#6b7280] text-sm mb-1">Votre produit *</label>
            <select value={form.product_id} onChange={(e) => setForm({...form, product_id: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm" required>
              <option value="">-- Selectionner --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.asin})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">ASIN concurrent *</label>
              <input type="text" maxLength={10} value={form.competitor_asin} onChange={(e) => setForm({...form, competitor_asin: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm font-mono focus:border-[#6366f1] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Nom *</label>
              <input type="text" value={form.competitor_name} onChange={(e) => setForm({...form, competitor_name: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Prix (€) *</label>
              <input type="number" step="0.01" value={form.competitor_price} onChange={(e) => setForm({...form, competitor_price: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Note (0-5)</label>
              <input type="number" step="0.1" min="0" max="5" value={form.competitor_rating} onChange={(e) => setForm({...form, competitor_rating: e.target.value})} className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
            {saving ? 'Ajout...' : 'Ajouter le concurrent'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
