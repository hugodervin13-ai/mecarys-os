import { useEffect, useState } from 'react'
import { getAllCompetitors, addCompetitor, deleteCompetitor, getProducts } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }
const inp = { width: '100%', padding: '9px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, display: 'block' }

function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: 12, color: s <= Math.round(rating) ? '#f59e0b' : '#e5e7eb' }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>{rating ? rating.toFixed(1) : '0.0'}</span>
    </div>
  )
}

export default function Concurrents() {
  const { user } = useStore()
  const [competitors, setCompetitors] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterProduct, setFilterProduct] = useState('all')
  const [form, setForm] = useState({ product_id: '', competitor_asin: '', competitor_name: '', competitor_price: '', competitor_rating: '' })

  useEffect(() => { if (user) loadData() }, [user])

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

  const filtered = filterProduct === 'all' ? competitors : competitors.filter(c => c.product_id === filterProduct)
  const cheaper = competitors.filter(c => (c.price_difference || 0) < 0).length
  const avgPrice = competitors.length > 0 ? competitors.reduce((a, c) => a + (c.competitor_price || 0), 0) / competitors.length : 0
  const avgRating = competitors.length > 0 ? competitors.reduce((a, c) => a + (c.competitor_rating || 0), 0) / competitors.length : 0

  if (loading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Veille Concurrentielle</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Surveillez vos concurrents et ajustez votre strategie prix</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter un concurrent
        </button>
      </div>

      {cheaper > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{cheaper} concurrent{cheaper > 1 ? 's sont' : ' est'} moins cher que vous</div>
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>Analysez leurs prix et ajustez votre strategie tarifaire pour rester competitif</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Concurrents suivis', value: competitors.length, icon: '🎯', color: '#6366f1', sub: `${products.length} produit${products.length !== 1 ? 's' : ''} surveilles` },
          { label: 'Prix moyen concurrent', value: avgPrice > 0 ? formatCurrency(avgPrice) : '-', icon: '💰', color: '#3b82f6', sub: 'Moyenne du marche' },
          { label: 'Note moyenne', value: avgRating > 0 ? avgRating.toFixed(1) + ' ★' : '-', icon: '⭐', color: '#f59e0b', sub: 'Note concurrents' },
          { label: 'Plus bas que vous', value: cheaper, icon: '📉', color: cheaper > 0 ? '#ef4444' : '#10b981', sub: cheaper > 0 ? 'Menace prix' : 'Vous etes competitif' },
        ].map(k => (
          <div key={k.label} style={{ ...box, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{k.value}</p>
                <p style={{ fontSize: 11, color: k.color, marginTop: 4, fontWeight: 500 }}>{k.sub}</p>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {products.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterProduct('all')}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filterProduct === 'all' ? '#6366f1' : '#e8e8e3'}`, background: filterProduct === 'all' ? '#6366f1' : '#fff', color: filterProduct === 'all' ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Tous ({competitors.length})
          </button>
          {products.map(p => (
            <button key={p.id} onClick={() => setFilterProduct(p.id)}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filterProduct === p.id ? '#6366f1' : '#e8e8e3'}`, background: filterProduct === p.id ? '#6366f1' : '#fff', color: filterProduct === p.id ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {p.name} ({competitors.filter(c => c.product_id === p.id).length})
            </button>
          ))}
        </div>
      )}

      <div style={{ ...box, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaf8' }}>
              {['Concurrent (ASIN)', 'Nom du produit', 'Prix', 'Note', 'Ecart vs vous', 'Votre produit', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const diff = c.price_difference || 0
              const diffColor = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#9ca3af'
              return (
                <tr key={c.id} style={{ borderTop: '1px solid #f0f0eb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', fontFamily: 'monospace' }}>{c.competitor_asin}</span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#1a1a2e', maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.competitor_name}</div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{formatCurrency(c.competitor_price || 0)}</span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <Stars rating={c.competitor_rating || 0} />
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: diffColor, padding: '4px 10px', background: `${diffColor}15`, borderRadius: 20, border: `1px solid ${diffColor}30` }}>
                      {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{c.products?.name || '-'}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{c.products?.asin}</div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={`https://www.amazon.fr/dp/${c.competitor_asin}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Voir</a>
                      <button onClick={() => handleDelete(c.id)}
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
        {filtered.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Aucun concurrent suivi</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Ajoutez les ASINs de vos principaux concurrents pour surveiller leurs prix et notes</div>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Ajouter un concurrent">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Votre produit *</label>
            <select style={inp} value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} required>
              <option value="">-- Selectionner votre produit --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.asin})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>ASIN concurrent *</label>
              <input style={{ ...inp, fontFamily: 'monospace', textTransform: 'uppercase' }} type="text" maxLength={10} placeholder="B0XXXXXXXXX" value={form.competitor_asin} onChange={e => setForm({ ...form, competitor_asin: e.target.value })} required />
            </div>
            <div>
              <label style={lbl}>Nom du produit *</label>
              <input style={inp} type="text" value={form.competitor_name} onChange={e => setForm({ ...form, competitor_name: e.target.value })} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Prix concurrent (€) *</label>
              <input style={inp} type="number" step="0.01" min="0" value={form.competitor_price} onChange={e => setForm({ ...form, competitor_price: e.target.value })} required />
            </div>
            <div>
              <label style={lbl}>Note Amazon (0-5)</label>
              <input style={inp} type="number" step="0.1" min="0" max="5" placeholder="4.2" value={form.competitor_rating} onChange={e => setForm({ ...form, competitor_rating: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: saving ? '#9ca3af' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Ajout...' : 'Ajouter le concurrent'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
