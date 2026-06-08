import { useState, useEffect } from 'react'
import { addProduct, getProducts, deleteProduct, updateProduct } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency, formatNumber } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }
const inp = { width: '100%', padding: '9px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }

const EMPTY_FORM = { asin: '', name: '', price_current: '', cost: '', stock_fba: '', stock_alerte: '20', rating: '', reviews_count: '', units_sold_30d: '', revenue_30d: '', profit_30d: '', acos: '', status: 'active' }

function MarginBadge({ price, cost }) {
  if (!price || !cost || price <= 0) return <span style={{ fontSize: 12, color: '#9ca3af' }}>-</span>
  const margin = ((price - cost) / price) * 100
  const color = margin >= 30 ? '#10b981' : margin >= 15 ? '#f59e0b' : '#ef4444'
  return <span style={{ fontSize: 12, fontWeight: 700, color }}>{margin.toFixed(0)}%</span>
}

function StockBar({ stock, alerte }) {
  const max = Math.max(alerte * 3, stock, 1)
  const pct = Math.min((stock / max) * 100, 100)
  const isLow = stock <= alerte
  const isOut = stock === 0
  const color = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 36 }}>{formatNumber(stock)}</span>
      <div style={{ flex: 1, height: 5, background: '#f0f0eb', borderRadius: 3, overflow: 'hidden', minWidth: 50 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function Produits() {
  const { user, setProducts: setStoreProducts } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const { data } = await getProducts(user.id)
    setProducts(data || [])
    setStoreProducts(data || [])
    setLoading(false)
  }

  const openAdd = () => { setEditProduct(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (p) => {
    setEditProduct(p)
    setForm({ asin: p.asin || '', name: p.name || '', price_current: p.price_current || '', cost: p.cost || '', stock_fba: p.stock_fba || '', stock_alerte: p.stock_alerte || 20, rating: p.rating || '', reviews_count: p.reviews_count || '', units_sold_30d: p.units_sold_30d || '', revenue_30d: p.revenue_30d || '', profit_30d: p.profit_30d || '', acos: p.acos || '', status: p.status || 'active' })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const d = {}
    for (const [k, v] of Object.entries(form)) {
      if (v !== '') d[k] = ['asin', 'name', 'status'].includes(k) ? v : Number(v)
    }
    if (editProduct) await updateProduct(editProduct.id, d)
    else await addProduct(user.id, d)
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return
    await deleteProduct(id)
    loadData()
  }

  const totalRevenue = products.reduce((a, p) => a + (p.revenue_30d || 0), 0)
  const totalProfit = products.reduce((a, p) => a + (p.profit_30d || 0), 0)
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0
  const criticalCount = products.filter(p => (p.stock_fba || 0) <= (p.stock_alerte || 20)).length

  let filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.asin?.toLowerCase().includes(search.toLowerCase())
  )
  if (filterTab === 'active') filtered = filtered.filter(p => p.status === 'active')
  if (filterTab === 'critical') filtered = filtered.filter(p => (p.stock_fba || 0) <= (p.stock_alerte || 20))
  if (filterTab === 'inactive') filtered = filtered.filter(p => p.status !== 'active')

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'revenue') return (b.revenue_30d || 0) - (a.revenue_30d || 0)
    if (sortBy === 'profit') return (b.profit_30d || 0) - (a.profit_30d || 0)
    if (sortBy === 'stock') return (a.stock_fba || 0) - (b.stock_fba || 0)
    if (sortBy === 'margin') {
      const ma = a.revenue_30d > 0 ? (a.profit_30d / a.revenue_30d) : 0
      const mb = b.revenue_30d > 0 ? (b.profit_30d / b.revenue_30d) : 0
      return mb - ma
    }
    return (a.name || '').localeCompare(b.name || '')
  })

  if (loading) return <Loading />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Produits</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>{products.length} produit{products.length !== 1 ? 's' : ''} suivis</p>
        </div>
        <button onClick={openAdd} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>+</span> Ajouter un produit
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Produits actifs', value: products.filter(p => p.status === 'active').length, icon: '📦', color: '#6366f1' },
          { label: 'CA total (30j)', value: formatCurrency(totalRevenue), icon: '💰', color: '#f59e0b', sub: totalRevenue > 0 ? null : 'Renseignez les CA dans vos produits' },
          { label: 'Profit net (30j)', value: formatCurrency(totalProfit), icon: '📈', color: '#10b981', sub: totalProfit > 0 ? `Marge: ${avgMargin}%` : null },
          { label: 'Stock critique', value: criticalCount, icon: '⚠️', color: criticalCount > 0 ? '#ef4444' : '#10b981', sub: criticalCount > 0 ? 'Reapprovisionnement urgent' : 'Tout est OK' },
        ].map(k => (
          <div key={k.label} style={{ ...box, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{k.value}</p>
                {k.sub && <p style={{ fontSize: 11, color: k.color, marginTop: 4, fontWeight: 500 }}>{k.sub}</p>}
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','Tous'], ['active','Actifs'], ['critical','⚠️ Stock critique'], ['inactive','Inactifs']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterTab(val)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filterTab === val ? '#6366f1' : '#e8e8e3'}`, background: filterTab === val ? '#6366f1' : '#fff', color: filterTab === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '7px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
            <option value="name">Trier : Nom</option>
            <option value="revenue">Trier : CA ↓</option>
            <option value="profit">Trier : Profit ↓</option>
            <option value="margin">Trier : Marge ↓</option>
            <option value="stock">Trier : Stock ↑</option>
          </select>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }}>🔍</span>
            <input placeholder="Rechercher ASIN ou nom..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, background: '#fff', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 12, width: 220, outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...box, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaf8' }}>
              {['Produit', 'Prix / Cout / Marge', 'Stock FBA', 'Ventes 30j', 'Profit 30j', 'ACOS', 'Note', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const dailySales = (p.units_sold_30d || 0) / 30
              const daysLeft = dailySales > 0 ? Math.round((p.stock_fba || 0) / dailySales) : null
              const isLow = (p.stock_fba || 0) <= (p.stock_alerte || 20)
              const margin = p.revenue_30d > 0 ? ((p.profit_30d / p.revenue_30d) * 100).toFixed(1) : null

              return (
                <tr key={p.id} style={{ borderTop: '1px solid #f0f0eb' }} onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{p.name}</div>
                    <a href={`https://amazon.fr/dp/${p.asin}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#6366f1', fontFamily: 'monospace', textDecoration: 'none' }}>{p.asin} ↗</a>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{formatCurrency(p.price_current || 0)}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Revient: {formatCurrency(p.cost || 0)}</div>
                    <MarginBadge price={p.price_current} cost={p.cost} />
                  </td>
                  <td style={{ padding: '12px 16px', minWidth: 120 }}>
                    <StockBar stock={p.stock_fba || 0} alerte={p.stock_alerte || 20} />
                    {daysLeft !== null && <div style={{ fontSize: 10, color: daysLeft < 14 ? '#ef4444' : '#9ca3af', marginTop: 3 }}>{daysLeft} jours restants</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{formatCurrency(p.revenue_30d || 0)}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{formatNumber(p.units_sold_30d || 0)} unites</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: (p.profit_30d || 0) >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(p.profit_30d || 0)}</div>
                    {margin !== null && <div style={{ fontSize: 11, color: '#9ca3af' }}>Marge: {margin}%</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {p.acos > 0 ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: p.acos < 20 ? '#10b981' : p.acos < 35 ? '#f59e0b' : '#ef4444' }}>{p.acos}%</span>
                    ) : <span style={{ fontSize: 12, color: '#9ca3af' }}>-</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: '#f59e0b', fontSize: 12 }}>★</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{p.rating || '-'}</span>
                      {p.reviews_count > 0 && <span style={{ fontSize: 10, color: '#9ca3af' }}>({formatNumber(p.reviews_count)})</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: p.status === 'active' ? '#10b98120' : '#9ca3af20', color: p.status === 'active' ? '#10b981' : '#9ca3af' }}>
                      {p.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(p)} style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, background: '#6366f110', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>Editer</button>
                      <button onClick={() => handleDelete(p.id)} style={{ fontSize: 12, color: '#ef4444', background: '#ef444410', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>Suppr.</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>{search ? 'Aucun produit trouve' : 'Aucun produit pour le moment'}</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>{search ? 'Essayez un autre terme de recherche' : 'Cliquez sur "+ Ajouter un produit" pour commencer'}</div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editProduct ? `Modifier : ${editProduct.name}` : 'Nouveau produit'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>ASIN *</label>
              <input style={inp} type="text" maxLength={10} value={form.asin} onChange={e => setForm({...form, asin: e.target.value.toUpperCase()})} placeholder="B08N5WRWNW" required />
            </div>
            <div>
              <label style={lbl}>Statut</label>
              <select style={inp} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Nom du produit *</label>
            <input style={inp} type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Kit ampoules H7 LED..." required />
          </div>
          <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Prix & Rentabilite</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Prix de vente (€)</label><input style={inp} type="number" step="0.01" value={form.price_current} onChange={e => setForm({...form, price_current: e.target.value})} placeholder="29.99" /></div>
              <div><label style={lbl}>Prix de revient (€)</label><input style={inp} type="number" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} placeholder="8.50" /></div>
              <div><label style={lbl}>ACOS (%)</label><input style={inp} type="number" step="0.1" value={form.acos} onChange={e => setForm({...form, acos: e.target.value})} placeholder="22" /></div>
            </div>
            {form.price_current && form.cost && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                Marge brute : {(((form.price_current - form.cost) / form.price_current) * 100).toFixed(1)}%
              </div>
            )}
          </div>
          <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Stock FBA</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Stock actuel</label><input style={inp} type="number" value={form.stock_fba} onChange={e => setForm({...form, stock_fba: e.target.value})} placeholder="150" /></div>
              <div><label style={lbl}>Seuil alerte</label><input style={inp} type="number" value={form.stock_alerte} onChange={e => setForm({...form, stock_alerte: e.target.value})} placeholder="20" /></div>
            </div>
          </div>
          <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Performances 30 jours</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Unites vendues</label><input style={inp} type="number" value={form.units_sold_30d} onChange={e => setForm({...form, units_sold_30d: e.target.value})} placeholder="120" /></div>
              <div><label style={lbl}>CA (€)</label><input style={inp} type="number" step="0.01" value={form.revenue_30d} onChange={e => setForm({...form, revenue_30d: e.target.value})} placeholder="3598" /></div>
              <div><label style={lbl}>Profit net (€)</label><input style={inp} type="number" step="0.01" value={form.profit_30d} onChange={e => setForm({...form, profit_30d: e.target.value})} placeholder="950" /></div>
              <div><label style={lbl}>Nb avis</label><input style={inp} type="number" value={form.reviews_count} onChange={e => setForm({...form, reviews_count: e.target.value})} placeholder="342" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div><label style={lbl}>Note (0-5)</label><input style={inp} type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => setForm({...form, rating: e.target.value})} placeholder="4.3" /></div>
            </div>
          </div>
          <button type="submit" disabled={saving} style={{ width: '100%', padding: '12px 0', background: saving ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Sauvegarde...' : editProduct ? 'Enregistrer les modifications' : 'Ajouter le produit'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
