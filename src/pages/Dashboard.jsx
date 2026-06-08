import { useEffect, useState } from 'react'
import { getProducts, getAlerts, getOrders } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency, formatNumber } from '../lib/utils'
import KPICard from '../components/KPICard'
import Loading from '../components/Loading'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts'

const mockSalesData = [
  { date: '14 avr.', ventes: 10500, profit: 2800 },
  { date: '21 avr.', ventes: 15200, profit: 4100 },
  { date: '28 avr.', ventes: 12800, profit: 3500 },
  { date: '5 mai', ventes: 28500, profit: 7200 },
  { date: '12 mai', ventes: 32000, profit: 8400 }
]

const mockProfitData = [
  { date: '14 avr.', profit: 2800 },
  { date: '21 avr.', profit: 4100 },
  { date: '28 avr.', profit: 3200 },
  { date: '5 mai', profit: 6800 },
  { date: '12 mai', profit: 7500 }
]

const defaultAlerts = [
  { id: '1', type: 'stock', message: 'Stock faible sur 3 produits', severity: 'high' },
  { id: '2', type: 'stock', message: 'Rupture de stock imminent (7 jours)', severity: 'high' },
  { id: '3', type: 'quality', message: 'Retour produit en hausse', severity: 'medium' },
  { id: '4', type: 'competitor', message: 'Prix concurrent en baisse sur 2 ASIN', severity: 'medium' }
]

const mockTrackedProducts = [
  { asin: 'B08N5WRWNW', price: '27,99', priceChange: -0.50, rating: 4.3, reviews: 1256 },
  { asin: 'B09X1ZZKZL', price: '29,90', priceChange: 1.20, rating: 4.1, reviews: 842 },
  { asin: 'B0C1234567', price: '25,50', priceChange: -0.20, rating: 4.0, reviews: 532 }
]

const pipelineStages = [
  { label: 'Production', count: 3, color: '#5a2d82', icon: '🏭' },
  { label: 'En transit', count: 2, color: '#00d4ff', icon: '🚢' },
  { label: 'Douane', count: 1, color: '#ef4444', icon: '📋' },
  { label: 'En entrepot', count: 1, color: '#f59e0b', icon: '📦' },
  { label: 'Amazon FBA', count: 2, color: '#10b981', icon: '📦' }
]

export default function Dashboard() {
  const { user, setProducts, setAlerts } = useStore()
  const [loading, setLoading] = useState(true)
  const [products, setLocalProducts] = useState([])
  const [alerts, setLocalAlerts] = useState([])
  const [salesPeriod, setSalesPeriod] = useState('30 jours')
  const [profitPeriod, setProfitPeriod] = useState('30 jours')

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const [productsRes, alertsRes] = await Promise.all([
      getProducts(user.id),
      getAlerts(user.id)
    ])

    setLocalProducts(productsRes.data || [])
    setLocalAlerts(alertsRes.data?.length ? alertsRes.data : [])
    setProducts(productsRes.data || [])
    setAlerts(alertsRes.data || [])
    setLoading(false)
  }

  const totalRevenue = products.reduce((acc, p) => acc + (p.revenue_30d || 0), 0) || 386730
  const totalProfit = products.reduce((acc, p) => acc + (p.profit_30d || 0), 0) || 97430
  const totalUnits = products.reduce((acc, p) => acc + (p.units_sold_30d || 0), 0) || 356
  const avgAcos = products.length > 0
    ? (products.reduce((acc, p) => acc + (p.acos || 0), 0) / products.length).toFixed(1)
    : '24.6'
  const totalStock = products.reduce((acc, p) => acc + (p.stock_fba || 0), 0) || 4782

  const displayAlerts = alerts.length > 0 ? alerts : defaultAlerts

  if (loading) return <Loading />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">Bonjour Hugo</h1>
        <p className="text-[#a0aec0]">Voici la performance de votre activite Amazon.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <KPICard title="Chiffre d'affaires" value={formatCurrency(totalRevenue)} change={18.6} icon="💰" />
        <KPICard title="Profit net (Sellerboard)" value={formatCurrency(totalProfit)} change={15.3} icon="📊" />
        <KPICard title="Unites vendues" value={formatNumber(totalUnits)} change={12.2} icon="📦" />
        <KPICard title="ACOS" value={`${avgAcos}%`} change={-3.1} icon="🎯" />
        <KPICard title="Stock total FBA" value={formatNumber(totalStock)} change={3.1} icon="🏭" />
      </div>

      {/* Main Grid: Charts + Competitor Tracking */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        {/* Charts - 3 columns */}
        <div className="xl:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3748]">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-white font-bold">Ventes <span className="text-[#a0aec0] font-normal text-sm">(30 derniers jours)</span></h3>
              <select
                value={salesPeriod}
                onChange={(e) => setSalesPeriod(e.target.value)}
                className="bg-[#0f1419] border border-[#2d3748] text-[#a0aec0] text-xs rounded-lg px-2 py-1"
              >
                <option>7 jours</option>
                <option>30 jours</option>
                <option>90 jours</option>
              </select>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-[#10b981] mb-4">↑ 22.8%</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mockSalesData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5a2d82" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5a2d82" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="date" stroke="#a0aec0" fontSize={12} />
                <YAxis stroke="#a0aec0" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="ventes" stroke="#5a2d82" fill="url(#salesGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Profit Chart */}
          <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3748]">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-white font-bold">Profit net <span className="text-[#a0aec0] font-normal text-sm">(30 derniers jours)</span></h3>
              <select
                value={profitPeriod}
                onChange={(e) => setProfitPeriod(e.target.value)}
                className="bg-[#0f1419] border border-[#2d3748] text-[#a0aec0] text-xs rounded-lg px-2 py-1"
              >
                <option>7 jours</option>
                <option>30 jours</option>
                <option>90 jours</option>
              </select>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{formatCurrency(totalProfit)}</p>
            <p className="text-sm text-[#10b981] mb-4">↑ 16.7%</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mockProfitData}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="date" stroke="#a0aec0" fontSize={12} />
                <YAxis stroke="#a0aec0" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#profitGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Competitor Tracking - 1 column */}
        <div className="space-y-6">
          <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-sm">Suivi concurrents</h3>
              <button className="text-xs bg-[#5a2d82] hover:bg-[#6b3d92] text-white px-3 py-1.5 rounded-lg transition-colors">
                + Ajouter un ASIN
              </button>
            </div>
            <div className="space-y-4">
              {mockTrackedProducts.map((p) => (
                <div key={p.asin} className="flex items-center gap-3 pb-3 border-b border-[#2d3748] last:border-0 last:pb-0">
                  <div className="w-10 h-10 bg-[#2d3748] rounded-lg flex items-center justify-center">
                    <span className="text-xs text-[#a0aec0]">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.asin}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-white text-sm font-semibold">{p.price} &euro;</span>
                      <span className={`text-xs ${p.priceChange >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {p.priceChange >= 0 ? '↑' : '↓'} {Math.abs(p.priceChange).toFixed(2)} &euro;
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-[#f59e0b] text-xs">★</span>
                      <span className="text-white text-sm">{p.rating}</span>
                    </div>
                    <p className="text-[#a0aec0] text-xs">({formatNumber(p.reviews)})</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 text-[#5a2d82] hover:text-[#6b3d92] text-sm font-medium w-full text-right transition-colors">
              Voir tous les suivis →
            </button>
          </div>

          {/* Alerts */}
          <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <span className="text-[#ef4444]">🚨</span> Alertes
            </h3>
            <div className="space-y-3">
              {displayAlerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-sm mt-0.5">
                      {alert.severity === 'high' ? '⚠️' : '🔔'}
                    </span>
                    <p className="text-[#a0aec0] text-sm leading-snug">{alert.message}</p>
                  </div>
                  <button className="text-[#5a2d82] text-xs font-medium shrink-0 hover:text-[#6b3d92]">
                    Voir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <h3 className="text-white font-bold mb-2">Analyse IA d'un ASIN</h3>
          <p className="text-[#a0aec0] text-sm mb-4">Collez un ASIN et obtenez une analyse complete + recommandations.</p>
          <input
            type="text"
            placeholder="Ex: B08N5WRWNW"
            className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm mb-3 focus:border-[#5a2d82] focus:outline-none"
          />
          <button className="w-full bg-[#5a2d82] hover:bg-[#6b3d92] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">
            ✨ Analyser
          </button>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <h3 className="text-white font-bold mb-2">Suivi concurrentiel</h3>
          <p className="text-[#a0aec0] text-sm mb-4">Suivez vos concurrents : prix, avis, stock, evolution quotidienne.</p>
          <div className="h-16 bg-[#0f1419] rounded-lg flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <h3 className="text-white font-bold mb-2">Amelioration de listing</h3>
          <p className="text-[#a0aec0] text-sm mb-4">Obtenez des idees pour ameliorer votre fiche produit et booster vos ventes.</p>
          <div className="h-16 bg-[#0f1419] rounded-lg flex items-center justify-center">
            <span className="text-2xl">📝</span>
          </div>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <h3 className="text-white font-bold mb-2">Idees produit</h3>
          <p className="text-[#a0aec0] text-sm mb-4">Trouvez des idees de produits rentables avec notre IA.</p>
          <div className="h-16 bg-[#0f1419] rounded-lg flex items-center justify-center">
            <span className="text-2xl">💡</span>
          </div>
        </div>
      </div>

      {/* Pipeline + Shortcuts */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        <div className="xl:col-span-3">
          {/* Pipeline */}
          <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3748]">
            <h3 className="text-white font-bold mb-5">Pipeline reapprovisionnement</h3>
            <div className="flex items-center justify-between gap-2">
              {pipelineStages.map((stage, i) => (
                <div key={stage.label} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-3 bg-[#0f1419] rounded-lg px-4 py-3 flex-1">
                    <span className="text-lg">{stage.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium" style={{ color: stage.color }}>{stage.label}</p>
                      <p className="text-[#a0aec0] text-xs">{stage.count} commande{stage.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {i < pipelineStages.length - 1 && (
                    <svg className="w-5 h-5 text-[#2d3748] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <button className="mt-4 text-[#5a2d82] hover:text-[#6b3d92] text-sm font-medium transition-colors">
              Voir toutes les commandes →
            </button>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <h3 className="text-white font-bold text-sm mb-4">Raccourcis</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Importer facture', icon: '📄' },
              { label: 'Ajouter un produit', icon: '➕' },
              { label: 'Nouvelle commande', icon: '📋' },
              { label: 'Analyse IA', icon: '🤖' }
            ].map((shortcut) => (
              <button
                key={shortcut.label}
                className="bg-[#0f1419] border border-[#2d3748] rounded-lg p-3 text-center hover:border-[#5a2d82] transition-colors"
              >
                <span className="text-lg block mb-1">{shortcut.icon}</span>
                <span className="text-[#a0aec0] text-xs">{shortcut.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Reviews + Tasks + Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-[#ef4444]">⚠️</span> Derniers avis clients negatifs
          </h3>
          <div className="space-y-3">
            <div className="bg-[#0f1419] rounded-lg p-3">
              <div className="flex justify-between items-start mb-1">
                <p className="text-white text-sm">Produit conforme mais l'emballage etait abime.</p>
                <span className="text-xs bg-[#10b981]/20 text-[#10b981] px-2 py-0.5 rounded-full shrink-0 ml-2">Qualite</span>
              </div>
              <p className="text-[#a0aec0] text-xs">ASIN: B08N5WRWNW &middot; Il y a 2h</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-[#f59e0b]">⭐</span> Prochaines taches
          </h3>
          <div className="space-y-3">
            {[
              { task: 'Commander reassort kit phare', date: '14 mai' },
              { task: 'Demander certificat CE fournisseur', date: '15 mai' },
              { task: 'Optimiser listing ASIN B08N5WRWNW', date: '16 mai' }
            ].map((t) => (
              <div key={t.task} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#10b981]">✓</span>
                  <p className="text-[#a0aec0] text-sm">{t.task}</p>
                </div>
                <p className="text-[#a0aec0] text-xs shrink-0">{t.date}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <span>📝</span> Notes rapides
          </h3>
          <div className="text-[#a0aec0] text-sm space-y-2">
            <p>Relancer usine pour ameliorer le packaging.</p>
            <p>Tester nouveau visuel principal la semaine prochaine.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
