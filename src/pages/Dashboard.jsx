import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts, getAlerts } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatNumber } from '../lib/utils'
import KPICard from '../components/KPICard'
import Loading from '../components/Loading'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const DATA = {
  sales: {
    '7j': [
      { date: 'Lun', v: 7200 }, { date: 'Mar', v: 9100 }, { date: 'Mer', v: 8400 },
      { date: 'Jeu', v: 11200 }, { date: 'Ven', v: 13500 }, { date: 'Sam', v: 12100 }, { date: 'Dim', v: 10800 },
    ],
    '30j': [
      { date: '7 avr.', v: 8200 }, { date: '14 avr.', v: 10500 },
      { date: '21 avr.', v: 14200 }, { date: '28 avr.', v: 12800 },
      { date: '5 mai', v: 28500 }, { date: '12 mai', v: 32000 },
    ],
    '90j': [
      { date: 'Fev', v: 62000 }, { date: 'Mars', v: 95000 },
      { date: 'Avr', v: 118000 }, { date: 'Mai', v: 141000 },
      { date: 'Juin', v: 158000 }, { date: 'Juil', v: 174000 },
    ],
  },
  profit: {
    '7j': [
      { date: 'Lun', v: 1800 }, { date: 'Mar', v: 2300 }, { date: 'Mer', v: 2100 },
      { date: 'Jeu', v: 2800 }, { date: 'Ven', v: 3400 }, { date: 'Sam', v: 3100 }, { date: 'Dim', v: 2700 },
    ],
    '30j': [
      { date: '7 avr.', v: 1800 }, { date: '14 avr.', v: 2800 },
      { date: '21 avr.', v: 4100 }, { date: '28 avr.', v: 3200 },
      { date: '5 mai', v: 6800 }, { date: '12 mai', v: 7500 },
    ],
    '90j': [
      { date: 'Fev', v: 15600 }, { date: 'Mars', v: 23800 },
      { date: 'Avr', v: 29700 }, { date: 'Mai', v: 35300 },
      { date: 'Juin', v: 39700 }, { date: 'Juil', v: 43600 },
    ],
  },
}

const KPI_BY_PERIOD = {
  '7j':  { ca: '72 300 €', profit: '18 200 €', units: '82', acos: '27,1%', caChange: 8.4, profitChange: 6.2, unitsChange: 5.1, acosChange: -1.2 },
  '30j': { ca: '386 730 €', profit: '97 430 €', units: '356', acos: '24,6%', caChange: 22.8, profitChange: 16.7, unitsChange: 12.2, acosChange: -3.1 },
  '90j': { ca: '748 000 €', profit: '187 400 €', units: '1 240', acos: '22,3%', caChange: 31.5, profitChange: 24.1, unitsChange: 18.6, acosChange: -5.4 },
}

const PERIOD_LABELS = { '7j': '7 derniers jours', '30j': '30 derniers jours', '90j': '90 derniers jours' }

const tracked = [
  { asin: 'B08N5WRWNW', price: '27,99', chg: -0.50, rating: 4.3, rev: 1256 },
  { asin: 'B09X1ZZKZL', price: '29,90', chg: 1.20, rating: 4.1, rev: 842 },
  { asin: 'B0C1234567', price: '25,50', chg: -0.20, rating: 4.0, rev: 532 },
]

const alertsList = [
  { id: 1, msg: 'Stock faible sur 3 produits', icon: '⚠️', link: '/stock' },
  { id: 2, msg: 'Rupture de stock imminent (7 jours)', icon: '🔴', link: '/stock' },
  { id: 3, msg: 'Retour produit en hausse', icon: '📦', link: '/qualite-sav' },
  { id: 4, msg: 'Prix concurrent en baisse sur 2 ASIN', icon: '💰', link: '/concurrents' },
]

const pipe = [
  { label: 'Production', n: 3, color: '#6366f1', bg: '#6366f110', icon: '🏭' },
  { label: 'En transit', n: 2, color: '#3b82f6', bg: '#3b82f610', icon: '🚢' },
  { label: 'Douane', n: 1, color: '#ef4444', bg: '#ef444410', icon: '🛃' },
  { label: 'En entrepot', n: 1, color: '#f59e0b', bg: '#f59e0b10', icon: '📦' },
  { label: 'Amazon FBA', n: 2, color: '#10b981', bg: '#10b98110', icon: '📦' },
]

const MOCK_ANALYSIS = {
  'B08N5WRWNW': { score: 87, title: 'Kit ampoules H7 LED', price: '27,99 €', rating: '4.3/5', reviews: '1 256', bsr: '#342 Auto', opportunities: ['Optimiser le titre avec mots-clés longue traîne', 'Ajouter vidéo produit pour augmenter conversion', 'Améliorer les 2 premières bullet points'], risks: ['Concurrents agressifs sur le prix', 'Marché saisonnier (hiver)'] },
  'B09X1ZZKZL': { score: 72, title: 'Filtre à huile universel', price: '29,90 €', rating: '4.1/5', reviews: '842', bsr: '#891 Auto', opportunities: ['Images de qualité à améliorer', 'Cibler les mots-clés "compatible BMW"'], risks: ['Stock limité chez fournisseur', 'Prix instable'] },
}

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }
const ttp = { backgroundColor: '#fff', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 12, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }
const selStyle = { background: '#fafaf8', border: '1px solid #e8e8e3', color: '#6b7280', fontSize: 11, borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, setProducts, setAlerts: setStoreAlerts } = useStore()
  const [loading, setLoading] = useState(true)
  const [products, setP] = useState([])
  const [kpiPeriod, setKpiPeriod] = useState('30j')
  const [salesPeriod, setSalesPeriod] = useState('30j')
  const [profitPeriod, setProfitPeriod] = useState('30j')
  const [asinInput, setAsinInput] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  useEffect(() => { if (user) load() }, [user])
  const load = async () => {
    const [pr, al] = await Promise.all([getProducts(user.id), getAlerts(user.id)])
    setP(pr.data || [])
    setProducts(pr.data || [])
    setStoreAlerts(al.data || [])
    setLoading(false)
  }

  const stock = products.reduce((a, p) => a + (p.stock_fba || 0), 0) || 4782
  const kpi = KPI_BY_PERIOD[kpiPeriod]

  const handleAnalyse = async () => {
    if (!asinInput.trim()) return
    setAnalysisLoading(true)
    setAnalysisResult(null)
    await new Promise(r => setTimeout(r, 1200))
    const result = MOCK_ANALYSIS[asinInput.trim().toUpperCase()] || {
      score: Math.floor(Math.random() * 30) + 55,
      title: `Produit ASIN ${asinInput.trim()}`,
      price: 'N/A',
      rating: 'N/A',
      reviews: 'N/A',
      bsr: 'N/A',
      opportunities: ['Données en cours de collecte...'],
      risks: ['Analyse complète disponible sous 24h'],
    }
    setAnalysisResult(result)
    setAnalysisLoading(false)
  }

  if (loading) return <Loading />

  return (
    <div>
      {/* Title + period */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Bonjour Hugo 👋</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Voici la performance de votre activite Amazon.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e8e8e3', borderRadius: 10, padding: '6px 10px' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Periode KPI :</span>
          {['7j', '30j', '90j'].map(p => (
            <button
              key={p}
              onClick={() => setKpiPeriod(p)}
              style={{
                padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: kpiPeriod === p ? '#6366f1' : 'transparent',
                color: kpiPeriod === p ? '#fff' : '#6b7280',
                transition: 'all 0.15s',
              }}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        <KPICard title={`Chiffre d'affaires (${kpiPeriod})`} value={kpi.ca} change={kpi.caChange} icon="💰" color="#f59e0b" />
        <KPICard title={`Profit net (${kpiPeriod})`} value={kpi.profit} change={kpi.profitChange} icon="📊" color="#10b981" />
        <KPICard title={`Unites vendues (${kpiPeriod})`} value={kpi.units} change={kpi.unitsChange} icon="📦" color="#3b82f6" />
        <KPICard title="ACOS" value={kpi.acos} change={kpi.acosChange} icon="🎯" color="#ef4444" />
        <KPICard title="Stock total FBA" value={formatNumber(stock)} change={3.1} icon="🏭" color="#6366f1" />
      </div>

      {/* Charts + Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 14, marginBottom: 22 }}>
        {/* Sales Chart */}
        <div style={{ ...box, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>Ventes </span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>({PERIOD_LABELS[salesPeriod]})</span>
            </div>
            <select
              value={salesPeriod}
              onChange={e => setSalesPeriod(e.target.value)}
              style={selStyle}
            >
              <option value="7j">7 jours</option>
              <option value="30j">30 jours</option>
              <option value="90j">90 jours</option>
            </select>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>{KPI_BY_PERIOD[salesPeriod].ca}</div>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 14 }}>↑ {KPI_BY_PERIOD[salesPeriod].caChange}%</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={DATA.sales[salesPeriod]} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" vertical={false}/>
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={ttp}/>
              <Area type="monotone" dataKey="v" stroke="#6366f1" fill="url(#sg)" strokeWidth={2.5} dot={false} name="Ventes"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Chart */}
        <div style={{ ...box, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>Profit net </span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>({PERIOD_LABELS[profitPeriod]})</span>
            </div>
            <select
              value={profitPeriod}
              onChange={e => setProfitPeriod(e.target.value)}
              style={selStyle}
            >
              <option value="7j">7 jours</option>
              <option value="30j">30 jours</option>
              <option value="90j">90 jours</option>
            </select>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>{KPI_BY_PERIOD[profitPeriod].profit}</div>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 14 }}>↑ {KPI_BY_PERIOD[profitPeriod].profitChange}%</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={DATA.profit[profitPeriod]} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" vertical={false}/>
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={ttp}/>
              <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#pg)" strokeWidth={2.5} dot={false} name="Profit"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Competitors */}
          <div style={{ ...box, padding: 16, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>Suivi concurrents</span>
              <button
                onClick={() => navigate('/concurrents')}
                style={{ fontSize: 11, background: '#6366f110', color: '#6366f1', padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >+ Ajouter</button>
            </div>
            {tracked.map(p => (
              <div key={p.asin} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0f0eb' }}>
                <div style={{ width: 34, height: 34, background: '#f5f5f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>📦</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{p.asin}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#374151' }}>{p.price} €</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p.chg >= 0 ? '#10b981' : '#ef4444' }}>
                      {p.chg >= 0 ? '↑' : '↓'} {Math.abs(p.chg).toFixed(2)} €
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: '#374151' }}><span style={{ color: '#f59e0b' }}>★</span> {p.rating}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>({formatNumber(p.rev)})</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <span
                onClick={() => navigate('/concurrents')}
                style={{ fontSize: 12, color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}
              >Voir tous les suivis →</span>
            </div>
          </div>

          {/* Alerts */}
          <div style={{ ...box, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>🚨</span> Alertes
            </div>
            {alertsList.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                  <span style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{a.msg}</span>
                </div>
                <span
                  onClick={() => navigate(a.link)}
                  style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                >Voir</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {/* ASIN Analysis */}
        <div style={{ ...box, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Analyse IA d'un ASIN</div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14, lineHeight: 1.6 }}>Collez un ASIN et obtenez une analyse complete + recommandations.</p>
          <input
            placeholder="Ex: B08N5WRWNW"
            value={asinInput}
            onChange={e => { setAsinInput(e.target.value); setAnalysisResult(null) }}
            onKeyDown={e => e.key === 'Enter' && handleAnalyse()}
            style={{ width: '100%', padding: '8px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 12, marginBottom: 10, boxSizing: 'border-box' }}
          />
          <button
            onClick={handleAnalyse}
            disabled={analysisLoading || !asinInput.trim()}
            style={{ width: '100%', padding: '10px 0', background: analysisLoading || !asinInput.trim() ? '#a5b4fc' : '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: analysisLoading || !asinInput.trim() ? 'default' : 'pointer', transition: 'background 0.15s' }}
          >{analysisLoading ? '⏳ Analyse en cours...' : '✨ Analyser'}</button>
          {analysisResult && (
            <div style={{ marginTop: 12, background: '#fafaf8', borderRadius: 10, padding: 12, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{analysisResult.title}</span>
                <span style={{ background: analysisResult.score >= 80 ? '#10b98120' : analysisResult.score >= 65 ? '#f59e0b20' : '#ef444420', color: analysisResult.score >= 80 ? '#10b981' : analysisResult.score >= 65 ? '#f59e0b' : '#ef4444', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{analysisResult.score}/100</span>
              </div>
              <div style={{ color: '#6b7280', marginBottom: 6 }}>Prix: {analysisResult.price} · Note: {analysisResult.rating} · {analysisResult.reviews} avis</div>
              <div style={{ color: '#6b7280', marginBottom: 8 }}>BSR: {analysisResult.bsr}</div>
              <div style={{ fontWeight: 600, color: '#10b981', marginBottom: 4 }}>✓ Opportunités :</div>
              {analysisResult.opportunities.map((o, i) => <div key={i} style={{ color: '#6b7280', marginBottom: 3 }}>• {o}</div>)}
              <div style={{ fontWeight: 600, color: '#ef4444', margin: '8px 0 4px' }}>⚠ Risques :</div>
              {analysisResult.risks.map((r, i) => <div key={i} style={{ color: '#6b7280', marginBottom: 3 }}>• {r}</div>)}
              <button
                onClick={() => navigate('/analyse-ia')}
                style={{ marginTop: 8, width: '100%', padding: '7px 0', background: '#6366f110', color: '#6366f1', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >Analyse complète →</button>
            </div>
          )}
        </div>

        <div
          onClick={() => navigate('/concurrents')}
          style={{ ...box, padding: 18, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Suivi concurrentiel</div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14, lineHeight: 1.6 }}>Suivez vos concurrents : prix, avis, stock, evolution quotidienne.</p>
          <div style={{ height: 56, background: '#fafaf8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📊</div>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Acceder →</div>
        </div>

        <div
          onClick={() => navigate('/produits')}
          style={{ ...box, padding: 18, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Amelioration de listing</div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14, lineHeight: 1.6 }}>Obtenez des idees pour ameliorer votre fiche produit et booster vos ventes.</p>
          <div style={{ height: 56, background: '#fafaf8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📝</div>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Acceder →</div>
        </div>

        <div
          onClick={() => navigate('/analyse-ia')}
          style={{ ...box, padding: 18, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Idees produit</div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14, lineHeight: 1.6 }}>Trouvez des idees de produits rentables avec notre IA.</p>
          <div style={{ height: 56, background: '#fafaf8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💡</div>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Acceder →</div>
        </div>
      </div>

      {/* Pipeline + Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, marginBottom: 22 }}>
        <div style={{ ...box, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 16 }}>Pipeline reapprovisionnement</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {pipe.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: s.bg, borderRadius: 10, padding: '10px 12px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{s.n} cmd{s.n > 1 ? 's' : ''}</div>
                  </div>
                </div>
                {i < pipe.length - 1 && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <span
              onClick={() => navigate('/commandes')}
              style={{ fontSize: 12, color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}
            >Voir toutes les commandes →</span>
          </div>
        </div>

        <div style={{ ...box, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 12 }}>Raccourcis</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { l: 'Importer facture', i: '📄', to: '/documents' },
              { l: 'Ajouter un produit', i: '➕', to: '/produits' },
              { l: 'Nouvelle commande', i: '📋', to: '/commandes' },
              { l: 'Analyse IA', i: '🤖', to: '/analyse-ia' },
            ].map(s => (
              <button
                key={s.l}
                onClick={() => navigate(s.to)}
                style={{ background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 10, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', color: '#6b7280', transition: 'border-color 0.15s, background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#f5f5ff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e3'; e.currentTarget.style.background = '#fafaf8' }}
              >
                <span style={{ display: 'block', fontSize: 20, marginBottom: 4 }}>{s.i}</span>
                <span style={{ fontSize: 11 }}>{s.l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div style={{ ...box, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>⚠️</span> Derniers avis clients negatifs
          </div>
          <div style={{ background: '#fafaf8', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, flex: 1 }}>Produit conforme mais l'emballage etait abime.</span>
              <span style={{ fontSize: 10, background: '#10b98115', color: '#10b981', padding: '3px 10px', borderRadius: 20, marginLeft: 8, whiteSpace: 'nowrap', fontWeight: 600 }}>Qualite</span>
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>ASIN: B08N5WRWNW · Il y a 2h</span>
          </div>
          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <span
              onClick={() => navigate('/qualite-sav')}
              style={{ fontSize: 12, color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}
            >Voir tous les avis →</span>
          </div>
        </div>

        <div style={{ ...box, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⭐ Prochaines taches
          </div>
          {[
            { t: 'Commander reassort kit phare', d: '14 mai', done: false },
            { t: 'Demander certificat CE fournisseur', d: '15 mai', done: false },
            { t: 'Optimiser listing ASIN B08N5WRWNW', d: '16 mai', done: false },
          ].map((t, i) => (
            <div key={t.t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ color: '#10b981', fontSize: 13, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{t.t}</span>
              </div>
              <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, marginLeft: 8 }}>{t.d}</span>
            </div>
          ))}
        </div>

        <div style={{ ...box, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            📝 Notes rapides
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.7, marginBottom: 6 }}>Relancer usine pour ameliorer le packaging.</p>
          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.7 }}>Tester nouveau visuel principal la semaine prochaine.</p>
        </div>
      </div>
    </div>
  )
}
