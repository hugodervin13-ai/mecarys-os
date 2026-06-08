import { useState } from 'react'
import { formatCurrency } from '../lib/utils'
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }
const TOOLTIP_STYLE = { backgroundColor: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 12 }

const MONTHS = [
  { label: 'Jan', revenus: 285000, depenses: 213000, profit: 72000 },
  { label: 'Fev', revenus: 310000, depenses: 229000, profit: 81000 },
  { label: 'Mar', revenus: 340000, depenses: 252000, profit: 88000 },
  { label: 'Avr', revenus: 365000, depenses: 273000, profit: 92000 },
  { label: 'Mai', revenus: 386730, depenses: 289300, profit: 97430 },
]

const EXPENSES = [
  { category: 'Cout produit (COGS)', amount: 145000, percent: 50.1, icon: '🏭', color: '#6366f1' },
  { category: 'Frais Amazon FBA', amount: 78000, percent: 27.0, icon: '📦', color: '#3b82f6' },
  { category: 'PPC / Publicite', amount: 35000, percent: 12.1, icon: '📣', color: '#f59e0b' },
  { category: 'Expedition / Import', amount: 18000, percent: 6.2, icon: '🚢', color: '#10b981' },
  { category: 'Divers & imprevu', amount: 13300, percent: 4.6, icon: '🗂️', color: '#9ca3af' },
]

export default function Comptabilite() {
  const [view, setView] = useState('ytd')

  const months = view === 'ytd' ? MONTHS : view === 'q2' ? MONTHS.slice(2) : MONTHS.slice(-1)
  const totalRevenus = months.reduce((a, m) => a + m.revenus, 0)
  const totalDepenses = months.reduce((a, m) => a + m.depenses, 0)
  const totalProfit = months.reduce((a, m) => a + m.profit, 0)
  const marge = ((totalProfit / totalRevenus) * 100).toFixed(1)

  const plLines = [
    { label: 'Chiffre d\'affaires brut', value: totalRevenus, type: 'header' },
    { label: '(-) Cout des marchandises', value: -145000, type: 'expense' },
    { label: 'Marge brute', value: totalRevenus - 145000, type: 'subtotal' },
    { label: '(-) Frais Amazon FBA', value: -78000, type: 'expense' },
    { label: '(-) PPC / Publicite', value: -35000, type: 'expense' },
    { label: '(-) Expedition / Import', value: -18000, type: 'expense' },
    { label: '(-) Divers', value: -13300, type: 'expense' },
    { label: 'Profit net', value: totalProfit, type: 'total' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Comptabilite</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Suivi P&L, repartition des depenses et rentabilite globale</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['ytd', 'YTD (2024)'], ['q2', 'T2 2024'], ['mai', 'Mai 2024']].map(([val, label]) => (
            <button key={val} onClick={() => setView(val)}
              style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${view === val ? '#6366f1' : '#e8e8e3'}`, background: view === val ? '#6366f1' : '#fff', color: view === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Revenus', value: formatCurrency(totalRevenus), icon: '💰', color: '#6366f1', sub: `${months.length} mois` },
          { label: 'Depenses', value: formatCurrency(totalDepenses), icon: '💸', color: '#ef4444', sub: `${(totalDepenses/totalRevenus*100).toFixed(0)}% du CA` },
          { label: 'Profit net', value: formatCurrency(totalProfit), icon: '📈', color: '#10b981', sub: `Marge ${marge}%` },
          { label: 'Marge nette', value: `${marge}%`, icon: '📊', color: marge >= 20 ? '#10b981' : marge >= 10 ? '#f59e0b' : '#ef4444', sub: marge >= 20 ? 'Excellent' : marge >= 10 ? 'Acceptable' : 'A optimiser' },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 22 }}>
        <div style={{ ...box, padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 18 }}>Revenus vs Depenses vs Profit</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={months} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" />
              <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="revenus" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenus" />
              <Bar dataKey="depenses" fill="#ef444480" radius={[4, 4, 0, 0]} name="Depenses" />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...box, padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 18 }}>Repartition des depenses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {EXPENSES.map(exp => (
              <div key={exp.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{exp.icon}</span> {exp.category}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{exp.percent}%</span>
                </div>
                <div style={{ height: 6, background: '#f0f0eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${exp.percent}%`, background: exp.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...box, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #f0f0eb' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Compte de resultat (P&L)</h3>
        </div>
        <div style={{ padding: '6px 0' }}>
          {plLines.map((line, i) => {
            const isTotal = line.type === 'total'
            const isSubtotal = line.type === 'subtotal'
            const isHeader = line.type === 'header'
            const isExpense = line.type === 'expense'
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: isTotal ? '14px 22px' : '10px 22px',
                background: isTotal ? '#1a1a2e' : isSubtotal ? '#fafaf8' : 'transparent',
                borderTop: isTotal || isSubtotal ? '1px solid #e8e8e3' : 'none',
                marginTop: isSubtotal ? 4 : 0,
              }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: isTotal || isHeader ? 700 : 400,
                  color: isTotal ? '#ffffff' : isHeader ? '#1a1a2e' : isExpense ? '#6b7280' : '#1a1a2e',
                  paddingLeft: isExpense ? 16 : 0,
                }}>
                  {line.label}
                </span>
                <span style={{
                  fontSize: 14,
                  fontWeight: isTotal || isSubtotal ? 700 : 500,
                  color: isTotal ? '#10b981' : line.value >= 0 ? '#1a1a2e' : '#ef4444',
                }}>
                  {line.value < 0 ? `- ${formatCurrency(Math.abs(line.value))}` : formatCurrency(line.value)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 14, padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>💡 Conseil FBA expert</div>
        <div style={{ fontSize: 12, color: '#15803d' }}>
          Pour un business FBA sain, visez : COGS {'<'} 40%, frais Amazon {'<'} 30%, PPC {'<'} 15%, marge nette {'>'} 20%. Si votre ACOS depasse 35%, revisez vos mots-cles ou augmentez votre prix de vente.
        </div>
      </div>
    </div>
  )
}
