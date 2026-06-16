import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts, getAlerts, getShipments } from '../lib/supabase'
import { computeAlerts, SEVERITY } from '../lib/alertsEngine'
import { useStore } from '../lib/store'
import { useData } from '../lib/useData'
import { formatNumber } from '../lib/utils'
import { box } from '../lib/theme'
import { DemoBadge } from '../components/ui'
import Loading from '../components/Loading'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// ─── Données mock ─────────────────────────────────────────────────────────────

const METRICS = {
  hier: { ca: '9 240 €', caChange: 12.3, profit: '2 310 €', profitChange: 8.1, units: '34', unitsChange: 5.2 },
  auj:  { ca: '3 180 €', caChange: 6.4,  profit: '795 €',   profitChange: 4.2, units: '11', unitsChange: 2.1 },
  '7j': { ca: '72 300 €', caChange: 8.4, profit: '18 200 €', profitChange: 6.2, units: '82', unitsChange: 5.1 },
  '30j':{ ca: '386 730 €',caChange: 22.8,profit: '97 430 €', profitChange: 16.7,units: '356',unitsChange: 12.2 },
}

const CHART_DATA = {
  hier: [
    { t: '06h', ca: 210, profit: 52 }, { t: '08h', ca: 480, profit: 120 },
    { t: '10h', ca: 1140, profit: 285 }, { t: '12h', ca: 1820, profit: 455 },
    { t: '14h', ca: 2650, profit: 662 }, { t: '16h', ca: 3410, profit: 852 },
    { t: '18h', ca: 4280, profit: 1070 }, { t: '20h', ca: 5540, profit: 1385 },
    { t: '22h', ca: 7120, profit: 1780 }, { t: '00h', ca: 9240, profit: 2310 },
  ],
  auj: [
    { t: '06h', ca: 80, profit: 20 }, { t: '08h', ca: 290, profit: 72 },
    { t: '10h', ca: 740, profit: 185 }, { t: '12h', ca: 1240, profit: 310 },
    { t: '14h', ca: 1880, profit: 470 }, { t: '16h', ca: 2450, profit: 612 },
    { t: '18h', ca: 3180, profit: 795 },
  ],
  '7j': [
    { t: 'Lun', ca: 7200, profit: 1800 }, { t: 'Mar', ca: 9100, profit: 2300 },
    { t: 'Mer', ca: 8400, profit: 2100 }, { t: 'Jeu', ca: 11200, profit: 2800 },
    { t: 'Ven', ca: 13500, profit: 3400 }, { t: 'Sam', ca: 12100, profit: 3100 },
    { t: 'Dim', ca: 10800, profit: 2700 },
  ],
  '30j': [
    { t: '7 avr', ca: 52000, profit: 13000 }, { t: '14 avr', ca: 74000, profit: 18500 },
    { t: '21 avr', ca: 98000, profit: 24500 }, { t: '28 avr', ca: 112000, profit: 28000 },
    { t: '5 mai', ca: 142000, profit: 35500 }, { t: '12 mai', ca: 174000, profit: 43500 },
    { t: '19 mai', ca: 198000, profit: 49500 }, { t: '26 mai', ca: 224000, profit: 56000 },
    { t: '2 juin', ca: 256000, profit: 64000 }, { t: '9 juin', ca: 298000, profit: 74500 },
    { t: '16 juin', ca: 386730, profit: 97430 },
  ],
}

const PERIOD_LABELS = { hier: 'Hier', auj: "Auj.", '7j': '7 jours', '30j': '30 jours' }

const STATUS_STYLE = {
  production: { label: 'Production', color: '#6366f1', bg: '#6366f115', icon: '🏭' },
  transit:    { label: 'En transit', color: '#3b82f6', bg: '#3b82f615', icon: '🚢' },
  customs:    { label: 'Douane',     color: '#f59e0b', bg: '#f59e0b15', icon: '🛃' },
  warehouse:  { label: 'Entrepot',   color: '#10b981', bg: '#10b98115', icon: '🏬' },
  fba:        { label: 'Amazon FBA', color: '#10b981', bg: '#10b98115', icon: '📦' },
  delivered:  { label: 'Livre',      color: '#6b7280', bg: '#6b728015', icon: '✅' },
}

const MOCK_SHIPMENTS = [
  { id: 'm1', reference: 'EXP-2026-001', status: 'transit',    carrier: 'DHL',     eta: '2026-06-22', items: 500, origin: 'Shenzhen' },
  { id: 'm2', reference: 'EXP-2026-002', status: 'customs',    carrier: 'FedEx',   eta: '2026-06-19', items: 300, origin: 'Guangzhou' },
  { id: 'm3', reference: 'EXP-2026-003', status: 'production', carrier: 'CMA CGM', eta: '2026-07-05', items: 750, origin: 'Shenzhen' },
]

const QUICK_LINKS = [
  { label: 'Ajouter un produit',   icon: '📦', to: '/produits',    color: '#f59e0b' },
  { label: 'Nouvelle expedition',  icon: '🚢', to: '/expeditions', color: '#3b82f6' },
  { label: 'Commande fournisseur', icon: '📋', to: '/commandes',   color: '#f97316' },
  { label: 'Analyse IA (ASIN)',    icon: '🤖', to: '/analyse-ia',  color: '#8b5cf6' },
  { label: 'Voir le stock',        icon: '📊', to: '/stock',       color: '#14b8a6' },
  { label: 'Mes documents',        icon: '📁', to: '/documents',   color: '#64748b' },
]

const QUICK_ACTIONS = [
  { icon: '📈', label: 'Ventes & profits',      sub: 'Performance globale',    to: '/ventes-profit', color: '#10b981' },
  { icon: '🥊', label: 'Suivi concurrents',     sub: 'Prix & avis temps reel', to: '/concurrents',   color: '#ef4444' },
  { icon: '⭐', label: 'Qualite & SAV clients', sub: 'Retours et avis',        to: '/qualite-sav',   color: '#f59e0b' },
  { icon: '📁', label: 'Documents',             sub: 'Factures & certificats', to: '/documents',     color: '#6b7280' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ttp = { backgroundColor: '#fff', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 12, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }

function MetricCard({ title, value, change, icon, color }) {
  const up = change >= 0
  return (
    <div style={{ ...box, padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.5px', marginBottom: 6 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: up ? '#10b981' : '#ef4444', fontSize: 11, fontWeight: 600 }}>
        {up ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs periode prec.
      </div>
    </div>
  )
}

function ShipmentRow({ s }) {
  const st = STATUS_STYLE[s.status] || STATUS_STYLE.transit
  const eta = s.eta ? new Date(s.eta).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '-'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f0' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        {st.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.reference}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{s.origin || ''} · {formatNumber(s.items)} unites</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 7px', borderRadius: 20, marginBottom: 2 }}>{st.label}</div>
        <div style={{ fontSize: 10, color: '#9ca3af' }}>ETA {eta}</div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, setProducts, setAlerts: setStoreAlerts } = useStore()
  const [period, setPeriod] = useState('30j')
  const [shipments, setShipments] = useState([])
  const [realAlerts, setRealAlerts] = useState([])
  const [note, setNote] = useState(() => {
    try { return localStorage.getItem('dashboard_note') || '' } catch { return '' }
  })
  const [noteSaved, setNoteSaved] = useState(false)

  const { data: products = [], loading } = useData(
    user ? `products-${user.id}` : null,
    () => getProducts(user.id),
    [user?.id]
  )

  useEffect(() => {
    if (!products) return
    setProducts(products)
    setRealAlerts(computeAlerts(products))
  }, [products, setProducts])

  useEffect(() => {
    if (!user) return
    getShipments(user.id)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) setShipments(data)
        else setShipments(MOCK_SHIPMENTS)
      })
      .catch(() => setShipments(MOCK_SHIPMENTS))
  }, [user])

  useEffect(() => {
    if (!user) return
    getAlerts(user.id)
      .then(({ data }) => { if (data) setStoreAlerts(data) })
      .catch(() => {})
  }, [user, setStoreAlerts])

  const saveNote = () => {
    try { localStorage.setItem('dashboard_note', note) } catch {}
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 1800)
  }

  const stock = (products || []).reduce((a, p) => a + (p.stock_fba || 0), 0) || 4782
  const m = METRICS[period]
  const chartData = CHART_DATA[period]
  const activeShipments = shipments.filter(s => s.status !== 'delivered')
  const usingMock = shipments.length > 0 && String(shipments[0]?.id).startsWith('m')

  if (loading) return <Loading />

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon apres-midi' : 'Bonsoir'
  const DAY = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const MON = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
  const dateStr = `${DAY[now.getDay()]} ${now.getDate()} ${MON[now.getMonth()]} ${now.getFullYear()}`

  return (
    <div style={{ maxWidth: 1400 }}>

      {/* En-tete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.4px' }}>
            {greeting}, Hugo 👋
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>{dateStr}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/expeditions')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🚢 + Expedition
          </button>
          <button onClick={() => navigate('/produits')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#fff', color: '#1a1a2e', border: '1px solid #e8e8e3', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            📦 + Produit
          </button>
        </div>
      </div>

      {/* Selecteur periode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, background: '#fff', border: '1px solid #e8e8e3', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {Object.entries(PERIOD_LABELS).map(([k, label]) => (
          <button key={k} onClick={() => setPeriod(k)} style={{
            padding: '6px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: period === k ? '#6366f1' : 'transparent',
            color: period === k ? '#fff' : '#6b7280',
          }}>{label}</button>
        ))}
      </div>

      {/* Cartes KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        <MetricCard title={`CA (${PERIOD_LABELS[period]})`}     value={m.ca}     change={m.caChange}     icon="💰" color="#f59e0b" />
        <MetricCard title={`Profit (${PERIOD_LABELS[period]})`} value={m.profit} change={m.profitChange} icon="📈" color="#10b981" />
        <MetricCard title={`Unites (${PERIOD_LABELS[period]})`} value={m.units}  change={m.unitsChange}  icon="📦" color="#3b82f6" />
        <MetricCard title="Stock total FBA" value={formatNumber(stock)} change={3.1} icon="🏭" color="#6366f1" />
      </div>

      {/* Graphiques + Expeditions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 14, marginBottom: 18 }}>

        {/* Graphique CA */}
        <div style={{ ...box, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Chiffre d'affaires</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{PERIOD_LABELS[period]}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.5px' }}>{m.ca}</div>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 12 }}>↑ {m.caChange}% vs periode prec.</div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
              <defs><linearGradient id="caG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.22}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" vertical={false}/>
              <XAxis dataKey="t" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
              <Tooltip contentStyle={ttp} formatter={v => [`${v.toLocaleString('fr-FR')} E`, 'CA']}/>
              <Area type="monotone" dataKey="ca" stroke="#6366f1" fill="url(#caG)" strokeWidth={2.5} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique Profit */}
        <div style={{ ...box, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Profit net</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{PERIOD_LABELS[period]}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.5px' }}>{m.profit}</div>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 12 }}>↑ {m.profitChange}% vs periode prec.</div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
              <defs><linearGradient id="profG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.22}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" vertical={false}/>
              <XAxis dataKey="t" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
              <Tooltip contentStyle={ttp} formatter={v => [`${v.toLocaleString('fr-FR')} E`, 'Profit']}/>
              <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#profG)" strokeWidth={2.5} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Panel expeditions */}
        <div style={{ ...box, padding: 18, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Expeditions en cours</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {usingMock && <DemoBadge />}
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#6366f115', padding: '3px 9px', borderRadius: 20 }}>{activeShipments.length}</span>
            </div>
          </div>

          {activeShipments.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>🚢</div>
              <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Aucune expedition active</div>
              <button onClick={() => navigate('/expeditions')}
                style={{ marginTop: 10, fontSize: 12, color: '#6366f1', background: '#6366f110', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}>
                + Creer une expedition
              </button>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              {activeShipments.slice(0, 4).map(s => <ShipmentRow key={s.id} s={s} />)}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <span onClick={() => navigate('/expeditions')} style={{ fontSize: 12, color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}>
              Voir toutes les expeditions →
            </span>
          </div>
        </div>
      </div>

      {/* Acces rapide */}
      <div style={{ ...box, padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>Acces rapide</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {QUICK_LINKS.map(q => (
            <button key={q.label} onClick={() => navigate(q.to)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '15px 8px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = q.color; e.currentTarget.style.background = `${q.color}08`; e.currentTarget.style.boxShadow = `0 4px 12px ${q.color}20` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e3'; e.currentTarget.style.background = '#fafaf8'; e.currentTarget.style.boxShadow = 'none' }}>
              <span style={{ fontSize: 20 }}>{q.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', lineHeight: 1.3 }}>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ligne bas : Notes + Alertes + Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

        {/* Notes rapides */}
        <div style={{ ...box, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 6 }}>📝 Notes rapides</div>
            {noteSaved && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>✓ Sauvegarde</span>}
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Vos notes ici... (idees, rappels, priorites)" style={{ width: '100%', minHeight: 108, padding: '10px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 10, color: '#374151', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }} />
          <button onClick={saveNote} style={{ marginTop: 10, width: '100%', padding: '9px 0', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Sauvegarder la note
          </button>
        </div>

        {/* Alertes issues du moteur (pas de Supabase errors) */}
        <div style={{ ...box, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            🚨 Alertes <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>({realAlerts.length})</span>
          </div>
          {realAlerts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 0', color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
              Aucune alerte — tout est nominal
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {realAlerts.slice(0, 5).map((a, i) => {
                const sev = SEVERITY[a.severity] || SEVERITY.info
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: `${sev.color}08`, borderRadius: 8, border: `1px solid ${sev.color}20` }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{sev.icon}</span>
                    <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>{a.message}</span>
                  </div>
                )
              })}
              {realAlerts.length > 5 && (
                <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/produits')}>
                  +{realAlerts.length - 5} autres alertes
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div style={{ ...box, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>⚡ Actions</div>
          {QUICK_ACTIONS.map(a => (
            <div key={a.label} onClick={() => navigate(a.to)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f0', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${a.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{a.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{a.label}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{a.sub}</div>
              </div>
              <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
