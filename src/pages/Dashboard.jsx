import { useEffect, useState } from 'react'
import { getProducts, getAlerts } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency, formatNumber } from '../lib/utils'
import KPICard from '../components/KPICard'
import Loading from '../components/Loading'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const salesData = [
  { date: '7 avr.', value: 8200 },
  { date: '14 avr.', value: 10500 },
  { date: '21 avr.', value: 14200 },
  { date: '28 avr.', value: 12800 },
  { date: '5 mai', value: 28500 },
  { date: '12 mai', value: 32000 }
]

const profitData = [
  { date: '7 avr.', value: 1800 },
  { date: '14 avr.', value: 2800 },
  { date: '21 avr.', value: 4100 },
  { date: '28 avr.', value: 3200 },
  { date: '5 mai', value: 6800 },
  { date: '12 mai', value: 7500 }
]

const trackedProducts = [
  { asin: 'B08N5WRWNW', price: '27,99', change: -0.50, rating: 4.3, reviews: 1256 },
  { asin: 'B09X1ZZKZL', price: '29,90', change: 1.20, rating: 4.1, reviews: 842 },
  { asin: 'B0C1234567', price: '25,50', change: -0.20, rating: 4.0, reviews: 532 }
]

const defaultAlerts = [
  { id: '1', message: 'Stock faible sur 3 produits', severity: 'high', icon: '⚠️' },
  { id: '2', message: 'Rupture de stock imminent (7 jours)', severity: 'high', icon: '🔴' },
  { id: '3', message: 'Retour produit en hausse', severity: 'medium', icon: '📦' },
  { id: '4', message: 'Prix concurrent en baisse sur 2 ASIN', severity: 'medium', icon: '💰' }
]

const pipeline = [
  { label: 'Production', count: 3, color: '#5a2d82', icon: '🏭' },
  { label: 'En transit', count: 2, color: '#00d4ff', icon: '🚢' },
  { label: 'Douane', count: 1, color: '#ef4444', icon: '🛃' },
  { label: 'En entrepot', count: 1, color: '#f59e0b', icon: '📦' },
  { label: 'Amazon FBA', count: 2, color: '#10b981', icon: '📦' }
]

const tooltipStyle = {
  backgroundColor: '#1a1f2e',
  border: '1px solid #2d3748',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
  padding: '8px 12px'
}

export default function Dashboard() {
  const { user, setProducts, setAlerts } = useStore()
  const [loading, setLoading] = useState(true)
  const [products, setLocalProducts] = useState([])
  const [alerts, setLocalAlerts] = useState([])

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const [productsRes, alertsRes] = await Promise.all([
      getProducts(user.id),
      getAlerts(user.id)
    ])
    setLocalProducts(productsRes.data || [])
    setLocalAlerts(alertsRes.data || [])
    setProducts(productsRes.data || [])
    setAlerts(alertsRes.data || [])
    setLoading(false)
  }

  const totalRevenue = products.reduce((a, p) => a + (p.revenue_30d || 0), 0) || 386730
  const totalProfit = products.reduce((a, p) => a + (p.profit_30d || 0), 0) || 97430
  const totalUnits = products.reduce((a, p) => a + (p.units_sold_30d || 0), 0) || 356
  const avgAcos = products.length > 0
    ? (products.reduce((a, p) => a + (p.acos || 0), 0) / products.length).toFixed(1)
    : '24.6'
  const totalStock = products.reduce((a, p) => a + (p.stock_fba || 0), 0) || 4782
  const displayAlerts = alerts.length > 0 ? alerts : defaultAlerts

  if (loading) return <Loading />

  return (
    <div className="max-w-[1600px]">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[24px] font-bold text-white">Bonjour Hugo 👋</h1>
        <p className="text-text-secondary text-[13px] mt-0.5">Voici la performance de votre activite Amazon.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KPICard title="Chiffre d'affaires" value="12 450 €" change={18.6} icon="💰" color="purple" />
        <KPICard title="Profit net (Sellerboard)" value="3 124 €" change={15.3} icon="📊" color="green" />
        <KPICard title="Unites vendues" value="356" change={12.2} icon="📦" color="orange" />
        <KPICard title="ACOS" value="24,6%" change={-3.1} icon="🎯" color="red" />
        <KPICard title="Stock total FBA" value={formatNumber(totalStock)} change={3.1} icon="🏭" color="blue" />
      </div>

      {/* Charts + Right Panel */}
      <div className="grid grid-cols-[1fr_300px] gap-4 mb-5">
        {/* Left: Charts */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sales Chart */}
          <div className="bg-surface rounded-xl p-5 border border-border">
            <div className="flex justify-between items-start mb-1">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white text-[14px] font-semibold">Ventes</h3>
                  <span className="text-text-muted text-[12px]">(30 derniers jours)</span>
                </div>
                <p className="text-[26px] font-bold text-white mt-1">{formatCurrency(totalRevenue)}</p>
                <p className="text-success text-[12px] font-medium">↑ 22.8%</p>
              </div>
              <select className="bg-bg border border-border text-text-secondary text-[11px] rounded-md px-2 py-1">
                <option>30 jours</option>
                <option>7 jours</option>
                <option>90 jours</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={salesData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5a2d82" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5a2d82" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                <XAxis dataKey="date" stroke="#636d7e" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#636d7e" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${formatCurrency(v)}`, 'Ventes']} />
                <Area type="monotone" dataKey="value" stroke="#5a2d82" fill="url(#salesG)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Profit Chart */}
          <div className="bg-surface rounded-xl p-5 border border-border">
            <div className="flex justify-between items-start mb-1">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white text-[14px] font-semibold">Profit net</h3>
                  <span className="text-text-muted text-[12px]">(30 derniers jours)</span>
                </div>
                <p className="text-[26px] font-bold text-white mt-1">{formatCurrency(totalProfit)}</p>
                <p className="text-success text-[12px] font-medium">↑ 16.7%</p>
              </div>
              <select className="bg-bg border border-border text-text-secondary text-[11px] rounded-md px-2 py-1">
                <option>30 jours</option>
                <option>7 jours</option>
                <option>90 jours</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={profitData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                <XAxis dataKey="date" stroke="#636d7e" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#636d7e" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${formatCurrency(v)}`, 'Profit']} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#profitG)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Competitor Tracking */}
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white text-[13px] font-semibold">Suivi concurrents</h3>
              <button className="text-[11px] bg-primary/15 text-primary-light px-2.5 py-1 rounded-md hover:bg-primary/25 transition-colors font-medium">
                + Ajouter un ASIN
              </button>
            </div>
            <div className="space-y-3">
              {trackedProducts.map((p) => (
                <div key={p.asin} className="flex items-center gap-2.5 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="w-9 h-9 bg-bg rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-[11px]">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[12px] font-semibold">{p.asin}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-white text-[12px]">{p.price} €</span>
                      <span className={`text-[11px] font-medium ${p.change >= 0 ? 'text-success' : 'text-danger'}`}>
                        {p.change >= 0 ? '↑' : '↓'} {Math.abs(p.change).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-0.5">
                      <span className="text-warning text-[11px]">★</span>
                      <span className="text-white text-[12px] font-medium">{p.rating}</span>
                    </div>
                    <p className="text-text-muted text-[11px]">({formatNumber(p.reviews)})</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-primary-light text-[12px] font-medium text-right cursor-pointer hover:text-primary transition-colors">
              Voir tous les suivis →
            </p>
          </div>

          {/* Alerts */}
          <div className="bg-surface rounded-xl p-4 border border-border">
            <h3 className="text-white text-[13px] font-semibold mb-3 flex items-center gap-1.5">
              <span className="text-danger text-[14px]">🚨</span> Alertes
            </h3>
            <div className="space-y-2.5">
              {displayAlerts.slice(0, 4).map((alert, i) => (
                <div key={alert.id || i} className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-[12px] mt-0.5 shrink-0">{alert.icon || '⚠️'}</span>
                    <p className="text-text-secondary text-[12px] leading-relaxed">{alert.message}</p>
                  </div>
                  <button className="text-primary-light text-[11px] font-medium shrink-0 hover:text-white transition-colors">
                    Voir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-surface rounded-xl p-4 border border-border group hover:border-primary/40 transition-colors">
          <h3 className="text-white text-[13px] font-semibold mb-1.5">Analyse IA d'un ASIN</h3>
          <p className="text-text-muted text-[12px] mb-3 leading-relaxed">Collez un ASIN et obtenez une analyse complete + recommandations.</p>
          <input
            type="text"
            placeholder="Ex: B08N5WRWNW"
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-white text-[12px] mb-2.5 focus:border-primary transition-colors"
          />
          <button className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-lg text-[12px] font-semibold transition-colors">
            ✨ Analyser
          </button>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-border group hover:border-primary/40 transition-colors">
          <h3 className="text-white text-[13px] font-semibold mb-1.5">Suivi concurrentiel</h3>
          <p className="text-text-muted text-[12px] mb-3 leading-relaxed">Suivez vos concurrents : prix, avis, stock, evolution quotidienne.</p>
          <div className="h-14 bg-bg rounded-lg flex items-center justify-center">
            <span className="text-[24px]">📊</span>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-border group hover:border-primary/40 transition-colors">
          <h3 className="text-white text-[13px] font-semibold mb-1.5">Amelioration de listing</h3>
          <p className="text-text-muted text-[12px] mb-3 leading-relaxed">Obtenez des idees pour ameliorer votre fiche produit et booster vos ventes.</p>
          <div className="h-14 bg-bg rounded-lg flex items-center justify-center">
            <span className="text-[24px]">📝</span>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-border group hover:border-primary/40 transition-colors">
          <h3 className="text-white text-[13px] font-semibold mb-1.5">Idees produit</h3>
          <p className="text-text-muted text-[12px] mb-3 leading-relaxed">Trouvez des idees de produits rentables avec notre IA.</p>
          <div className="h-14 bg-bg rounded-lg flex items-center justify-center">
            <span className="text-[24px]">💡</span>
          </div>
        </div>
      </div>

      {/* Pipeline + Shortcuts */}
      <div className="grid grid-cols-[1fr_300px] gap-4 mb-5">
        <div className="bg-surface rounded-xl p-5 border border-border">
          <h3 className="text-white text-[14px] font-semibold mb-4">Pipeline reapprovisionnement</h3>
          <div className="flex items-center gap-1.5">
            {pipeline.map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-1.5 flex-1">
                <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2.5 flex-1 min-w-0">
                  <span className="text-[16px] shrink-0">{stage.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: stage.color }}>{stage.label}</p>
                    <p className="text-text-muted text-[11px]">{stage.count} cmd{stage.count > 1 ? 's' : ''}</p>
                  </div>
                </div>
                {i < pipeline.length - 1 && (
                  <svg className="w-4 h-4 text-border shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-primary-light text-[12px] font-medium cursor-pointer hover:text-white transition-colors">
            Voir toutes les commandes →
          </p>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-border">
          <h3 className="text-white text-[13px] font-semibold mb-3">Raccourcis</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Importer facture', icon: '📄' },
              { label: 'Ajouter un produit', icon: '➕' },
              { label: 'Nouvelle commande', icon: '📋' },
              { label: 'Analyse IA', icon: '🤖' }
            ].map((s) => (
              <button key={s.label} className="bg-bg border border-border rounded-lg p-2.5 text-center hover:border-primary/40 transition-colors group">
                <span className="text-[18px] block mb-1">{s.icon}</span>
                <span className="text-text-muted text-[11px] group-hover:text-white transition-colors">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Reviews + Tasks + Notes */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-4 border border-border">
          <h3 className="text-white text-[13px] font-semibold mb-3 flex items-center gap-1.5">
            <span className="text-danger">⚠️</span> Derniers avis clients negatifs
          </h3>
          <div className="bg-bg rounded-lg p-3">
            <div className="flex justify-between items-start mb-1.5">
              <p className="text-white text-[12px] leading-relaxed flex-1">Produit conforme mais l'emballage etait abime.</p>
              <span className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full shrink-0 ml-2 font-medium">Qualite</span>
            </div>
            <p className="text-text-muted text-[11px]">ASIN: B08N5WRWNW · Il y a 2h</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-border">
          <h3 className="text-white text-[13px] font-semibold mb-3 flex items-center gap-1.5">
            <span className="text-warning">⭐</span> Prochaines taches
          </h3>
          <div className="space-y-2.5">
            {[
              { task: 'Commander reassort kit phare', date: '14 mai' },
              { task: 'Demander certificat CE fournisseur', date: '15 mai' },
              { task: 'Optimiser listing ASIN B08N5WRWNW', date: '16 mai' }
            ].map((t) => (
              <div key={t.task} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-success text-[12px] shrink-0">✓</span>
                  <p className="text-text-secondary text-[12px] truncate">{t.task}</p>
                </div>
                <p className="text-text-muted text-[11px] shrink-0 ml-2">{t.date}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-border">
          <h3 className="text-white text-[13px] font-semibold mb-3 flex items-center gap-1.5">
            <span>📝</span> Notes rapides
          </h3>
          <div className="text-text-secondary text-[12px] space-y-2 leading-relaxed">
            <p>Relancer usine pour ameliorer le packaging.</p>
            <p>Tester nouveau visuel principal la semaine prochaine.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
