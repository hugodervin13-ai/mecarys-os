import { useEffect, useState } from 'react'
import { getProducts, updateProduct } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatNumber } from '../lib/utils'
import Loading from '../components/Loading'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }

function DaysBar({ days }) {
  if (days === null) return <span style={{ fontSize: 12, color: '#9ca3af' }}>N/A</span>
  if (days === 0) return <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>RUPTURE</span>
  const max = 90
  const pct = Math.min((days / max) * 100, 100)
  const color = days < 7 ? '#ef4444' : days < 14 ? '#f59e0b' : days < 30 ? '#6366f1' : '#10b981'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 42 }}>{days}j</span>
      <div style={{ flex: 1, height: 6, background: '#f0f0eb', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  )
}

export default function Stock() {
  const { user } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('days')
  const [filterTab, setFilterTab] = useState('all')
  const [editingAlerte, setEditingAlerte] = useState(null)
  const [newAlerte, setNewAlerte] = useState('')

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const { data } = await getProducts(user.id)
    setProducts(data || [])
    setLoading(false)
  }

  const saveAlerte = async (id) => {
    if (!newAlerte || isNaN(newAlerte)) return
    await updateProduct(id, { stock_alerte: Number(newAlerte) })
    setEditingAlerte(null)
    loadData()
  }

  const enriched = products.map(p => {
    const dailySales = (p.units_sold_30d || 0) / 30
    const daysLeft = dailySales > 0 ? Math.round((p.stock_fba || 0) / dailySales) : null
    const isOut = (p.stock_fba || 0) === 0
    const isCritical = !isOut && daysLeft !== null && daysLeft < 7
    const isLow = !isOut && !isCritical && ((p.stock_fba || 0) <= (p.stock_alerte || 20) || (daysLeft !== null && daysLeft < 14))
    const restock = dailySales > 0 ? Math.ceil(dailySales * 60) : null
    return { ...p, dailySales, daysLeft, isOut, isCritical, isLow, restock }
  })

  let filtered = enriched
  if (filterTab === 'critical') filtered = enriched.filter(p => p.isOut || p.isCritical)
  if (filterTab === 'low') filtered = enriched.filter(p => p.isLow)
  if (filterTab === 'ok') filtered = enriched.filter(p => !p.isOut && !p.isCritical && !p.isLow)

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'days') {
      const da = a.isOut ? -1 : (a.daysLeft ?? 9999)
      const db = b.isOut ? -1 : (b.daysLeft ?? 9999)
      return da - db
    }
    if (sortBy === 'stock') return (a.stock_fba || 0) - (b.stock_fba || 0)
    if (sortBy === 'velocity') return b.dailySales - a.dailySales
    return (a.name || '').localeCompare(b.name || '')
  })

  const totalStock = products.reduce((a, p) => a + (p.stock_fba || 0), 0)
  const urgentCount = enriched.filter(p => p.isOut || p.isCritical).length
  const lowCount = enriched.filter(p => p.isLow).length
  const withDays = enriched.filter(p => p.daysLeft !== null)
  const avgDays = withDays.length > 0 ? Math.round(withDays.reduce((a, p) => a + p.daysLeft, 0) / withDays.length) : null

  if (loading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Gestion du Stock FBA</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Anticipez les ruptures et planifiez vos reapprovisionnements</p>
        </div>
      </div>

      {urgentCount > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{urgentCount} produit{urgentCount > 1 ? 's' : ''} en rupture ou critique (moins de 7 jours)</div>
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>Commandez maintenant pour eviter une perte de classement BSR</div>
          </div>
          <button onClick={() => setFilterTab('critical')} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Voir urgents</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Stock total FBA', value: formatNumber(totalStock), icon: '🏭', color: '#6366f1', sub: 'unites en entrepot Amazon' },
          { label: 'Jours de stock (moy.)', value: avgDays ? `${avgDays}j` : '-', icon: '📅', color: '#3b82f6', sub: avgDays && avgDays < 30 ? '⚠️ Niveau bas en moyenne' : 'Niveau satisfaisant' },
          { label: 'Urgents (< 7 jours)', value: urgentCount, icon: '🚨', color: '#ef4444', sub: urgentCount > 0 ? 'Commander immediatement' : 'Aucune urgence' },
          { label: 'Stock faible (7-14j)', value: lowCount, icon: '⚠️', color: '#f59e0b', sub: 'A surveiller de pres' },
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', `Tous (${products.length})`], ['critical', `🚨 Urgents (${urgentCount})`], ['low', `⚠️ Faibles (${lowCount})`], ['ok', '✅ OK']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterTab(val)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filterTab === val ? '#6366f1' : '#e8e8e3'}`, background: filterTab === val ? '#6366f1' : '#fff', color: filterTab === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '7px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
          <option value="days">Trier : Urgence</option>
          <option value="stock">Trier : Stock</option>
          <option value="velocity">Trier : Velocite</option>
          <option value="name">Trier : Nom</option>
        </select>
      </div>

      <div style={{ ...box, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaf8' }}>
              {['Produit', 'Stock FBA', 'Jours restants', 'Seuil alerte', 'Velocite / jour', 'Commander (60j)', 'Statut'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const statusColor = p.isOut ? '#ef4444' : p.isCritical ? '#ef4444' : p.isLow ? '#f59e0b' : '#10b981'
              const statusLabel = p.isOut ? 'Rupture' : p.isCritical ? 'Critique' : p.isLow ? 'Faible' : 'OK'
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #f0f0eb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{p.asin}</div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: statusColor }}>{formatNumber(p.stock_fba || 0)}</span>
                  </td>
                  <td style={{ padding: '13px 16px', minWidth: 160 }}>
                    <DaysBar days={p.isOut ? 0 : p.daysLeft} />
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    {editingAlerte === p.id ? (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <input type="number" value={newAlerte} onChange={e => setNewAlerte(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveAlerte(p.id)}
                          style={{ width: 64, padding: '4px 8px', border: '1px solid #6366f1', borderRadius: 6, fontSize: 12, outline: 'none' }} autoFocus />
                        <button onClick={() => saveAlerte(p.id)} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✓</button>
                        <button onClick={() => setEditingAlerte(null)} style={{ background: '#f0f0eb', color: '#6b7280', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{p.stock_alerte || 20}</span>
                        <button onClick={() => { setEditingAlerte(p.id); setNewAlerte(p.stock_alerte || 20) }} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>✏️</button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    {p.dailySales > 0 ? (
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{p.dailySales.toFixed(1)}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}> u/j</span>
                      </div>
                    ) : <span style={{ fontSize: 12, color: '#9ca3af' }}>-</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    {p.restock ? (
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#6366f1' }}>{formatNumber(p.restock)}</span>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>unites</div>
                      </div>
                    ) : <span style={{ fontSize: 12, color: '#9ca3af' }}>-</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Aucun produit</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Ajoutez des produits avec leur stock FBA pour les suivre ici</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[['#ef4444', 'Rupture / Critique (< 7 jours)'], ['#f59e0b', 'Faible (7-14 jours)'], ['#6366f1', '15-30 jours'], ['#10b981', 'Plus de 30 jours']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
