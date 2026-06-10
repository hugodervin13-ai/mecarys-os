import { useState } from 'react'
import { getProducts } from '../lib/supabase'
import { useStore } from '../lib/store'
import { useData } from '../lib/useData'
import { formatCurrency, formatNumber } from '../lib/utils'
import { box } from '../lib/theme'
import { DemoBadge } from '../components/ui'
import Loading from '../components/Loading'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const DATA = {
  '7j': {
    chart: [
      { label: 'Lun', ventes: 12400, profit: 3100 },
      { label: 'Mar', ventes: 14200, profit: 3600 },
      { label: 'Mer', ventes: 11800, profit: 2900 },
      { label: 'Jeu', ventes: 15600, profit: 4100 },
      { label: 'Ven', ventes: 18200, profit: 4800 },
      { label: 'Sam', ventes: 16500, profit: 4200 },
      { label: 'Dim', ventes: 13200, profit: 3400 },
    ],
    ca: 101900, profit: 26100, units: 89, panier: 1145,
  },
  '30j': {
    chart: [
      { label: 'S1', ventes: 82000, profit: 20500 },
      { label: 'S2', ventes: 91000, profit: 23200 },
      { label: 'S3', ventes: 105000, profit: 27300 },
      { label: 'S4', ventes: 108730, profit: 26430 },
    ],
    ca: 386730, profit: 97430, units: 356, panier: 1086,
  },
  '90j': {
    chart: [
      { label: 'Mar', ventes: 340000, profit: 88000 },
      { label: 'Avr', ventes: 365000, profit: 92000 },
      { label: 'Mai', ventes: 386730, profit: 97430 },
    ],
    ca: 1091730, profit: 277430, units: 1012, panier: 1079,
  },
}

const TOOLTIP_STYLE = { backgroundColor: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 12 }

export default function VentesProfit() {
  const { user } = useStore()
  const [period, setPeriod] = useState('30j')

  const { data: productsData, loading } = useData('products', () => getProducts(user.id), [user])
  const products = productsData || []

  const d = DATA[period]
  const totalCA = products.reduce((a, p) => a + (p.revenue_30d || 0), 0) || d.ca
  const totalProfit = products.reduce((a, p) => a + (p.profit_30d || 0), 0) || d.profit
  const totalUnits = products.reduce((a, p) => a + (p.units_sold_30d || 0), 0) || d.units
  const margin = totalCA > 0 ? ((totalProfit / totalCA) * 100).toFixed(1) : '25.2'
  const panier = totalUnits > 0 ? totalCA / totalUnits : d.panier

  if (loading) return <Loading />

  const kpis = [
    { label: `CA total (${period})`, value: formatCurrency(totalCA), change: +22.8, icon: '💰', color: '#6366f1', sub: `${formatNumber(totalUnits)} unités vendues` },
    { label: `Profit net (${period})`, value: formatCurrency(totalProfit), change: +16.7, icon: '📈', color: '#10b981', sub: `Marge ${margin}%` },
    { label: 'Marge nette', value: `${margin}%`, change: +2.4, icon: '📊', color: '#3b82f6', sub: margin >= 20 ? 'Bonne marge' : 'À optimiser' },
    { label: 'Panier moyen', value: formatCurrency(panier), change: +5.1, icon: '🛒', color: '#f59e0b', sub: `Sur ${formatNumber(totalUnits)} commandes` },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Ventes & Profit</h1>
            <DemoBadge />
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Analysez vos performances et votre rentabilité par période</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['7j', '30j', '90j'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '7px 18px', borderRadius: 8, border: `1px solid ${period === p ? '#6366f1' : '#e8e8e3'}`, background: period === p ? '#6366f1' : '#fff', color: period === p ? '#fff' : '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ ...box, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{k.value}</p>
                <p style={{ fontSize: 11, color: k.color, marginTop: 4, fontWeight: 500 }}>{k.sub}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{k.icon}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: k.change >= 0 ? '#10b981' : '#ef4444' }}>{k.change >= 0 ? '+' : ''}{k.change}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
        <div style={{ ...box, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Évolution Ventes & Profit</h3>
            <div style={{ display: 'flex', gap: 14 }}>
              <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} /> Ventes
              </span>
              <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, background: '#10b981', borderRadius: 2, display: 'inline-block' }} /> Profit
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={d.chart}>
              <defs>
                <linearGradient id="gVentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" />
              <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCurrency(v)} />
              <Area type="monotone" dataKey="ventes" stroke="#6366f1" fill="url(#gVentes)" strokeWidth={2} name="Ventes" />
              <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#gProfit)" strokeWidth={2} name="Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...box, padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 18 }}>Ventes vs Profit par période</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.chart} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" />
              <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="ventes" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ventes" />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...box, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #f0f0eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Détail par produit (30 derniers jours)</h3>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{products.length} produit{products.length !== 1 ? 's' : ''}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaf8' }}>
              {['Produit', 'CA (30j)', 'Profit (30j)', 'Marge', 'Unités', 'ACOS', 'Tendance'].map(h => (
                <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>Aucun produit</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>Ajoutez des produits dans l'onglet Produits pour voir les données ici</div>
                </td>
              </tr>
            ) : products.map(p => {
              const marge = p.revenue_30d > 0 ? ((p.profit_30d / p.revenue_30d) * 100) : 0
              const margeColor = marge >= 25 ? '#10b981' : marge >= 15 ? '#f59e0b' : '#ef4444'
              const acosColor = (p.acos || 0) <= 20 ? '#10b981' : (p.acos || 0) <= 35 ? '#f59e0b' : '#ef4444'
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #f0f0eb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{p.asin}</div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{formatCurrency(p.revenue_30d || 0)}</span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{formatCurrency(p.profit_30d || 0)}</span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: margeColor, padding: '3px 10px', background: `${margeColor}15`, borderRadius: 20 }}>{marge.toFixed(1)}%</span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{formatNumber(p.units_sold_30d || 0)}</span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: acosColor }}>{(p.acos || 0).toFixed(1)}%</span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 18 }}>{marge >= 20 ? '📈' : marge >= 10 ? '➡️' : '📉'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
