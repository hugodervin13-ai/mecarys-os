import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getProducts, getAlerts, getOrders, getShipments,
  getSuppliers, getDocuments, getAllCompetitors,
} from '../lib/supabase'
import { computeAlerts, SEVERITY } from '../lib/alertsEngine'
import { useStore } from '../lib/store'
import { useData } from '../lib/useData'
import { formatNumber, formatCurrency, formatDate } from '../lib/utils'
import { box, colors } from '../lib/theme'
import { KpiCard } from '../components/ui'
import Loading from '../components/Loading'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// ─── Métriques mock par période (à brancher sur Amazon SP-API quand dispo) ───
const PERIOD_METRICS = {
  hier: { ca: '9 240 €', caChange: 12.3, profit: '2 310 €', profitChange: 8.1, units: '34', unitsChange: 5.2 },
  auj:  { ca: '3 180 €', caChange: 6.4,  profit: '795 €',   profitChange: 4.2, units: '11', unitsChange: 2.1 },
  '7j': { ca: '72 300 €', caChange: 8.4, profit: '18 200 €', profitChange: 6.2, units: '82', unitsChange: 5.1 },
  '30j':{ ca: '386 730 €',caChange: 22.8,profit: '97 430 €', profitChange: 16.7,units: '356',unitsChange: 12.2 },
}
const PERIOD_CHART = {
  hier: [
    { t: '06h', ca: 210, p: 52 }, { t: '09h', ca: 1140, p: 285 }, { t: '12h', ca: 2650, p: 662 },
    { t: '15h', ca: 4280, p: 1070 }, { t: '18h', ca: 5540, p: 1385 }, { t: '21h', ca: 7120, p: 1780 },
    { t: '00h', ca: 9240, p: 2310 },
  ],
  auj: [
    { t: '06h', ca: 80, p: 20 }, { t: '08h', ca: 290, p: 72 }, { t: '10h', ca: 740, p: 185 },
    { t: '12h', ca: 1240, p: 310 }, { t: '14h', ca: 1880, p: 470 }, { t: '16h', ca: 2450, p: 612 },
    { t: '18h', ca: 3180, p: 795 },
  ],
  '7j': [
    { t: 'Lun', ca: 7200, p: 1800 }, { t: 'Mar', ca: 9100, p: 2300 }, { t: 'Mer', ca: 8400, p: 2100 },
    { t: 'Jeu', ca: 11200, p: 2800 }, { t: 'Ven', ca: 13500, p: 3400 }, { t: 'Sam', ca: 12100, p: 3100 },
    { t: 'Dim', ca: 10800, p: 2700 },
  ],
  '30j': [
    { t: '7 avr', ca: 52000, p: 13000 }, { t: '14 avr', ca: 74000, p: 18500 },
    { t: '21 avr', ca: 98000, p: 24500 }, { t: '28 avr', ca: 112000, p: 28000 },
    { t: '5 mai', ca: 142000, p: 35500 }, { t: '12 mai', ca: 174000, p: 43500 },
    { t: '19 mai', ca: 198000, p: 49500 }, { t: '26 mai', ca: 224000, p: 56000 },
    { t: '2 juin', ca: 256000, p: 64000 }, { t: '9 juin', ca: 298000, p: 74500 },
    { t: '16 juin', ca: 386730, p: 97430 },
  ],
}
const PERIOD_LABELS = { hier: 'Hier', auj: "Auj.", '7j': '7 jours', '30j': '30 jours' }
const ttp = { backgroundColor: '#fff', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 12, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }

// ─── Pipeline stages (mapped to real shipment statuses from Expeditions.jsx) ───
const PIPELINE_STAGES = [
  { key: 'production', label: 'Production', icon: '🏭', color: '#6366f1', bg: '#6366f110' },
  { key: 'transit',    label: 'En transit', icon: '🚢', color: '#3b82f6', bg: '#3b82f610' },
  { key: 'customs',    label: 'Douane',     icon: '🛃', color: '#f59e0b', bg: '#f59e0b10' },
  { key: 'warehouse',  label: 'Entrepôt',   icon: '🏬', color: '#8b5cf6', bg: '#8b5cf610' },
  { key: 'fba',        label: 'Amazon FBA', icon: '📦', color: '#10b981', bg: '#10b98110' },
]

// Statuses considered "active" for orders and shipments
const ACTIVE_ORDER_STATUSES = ['pending', 'production', 'shipped', 'transit_boat', 'transit_truck', 'transit', 'customs']
const ACTIVE_SHIPMENT_STATUSES = ['production', 'transit', 'customs', 'warehouse']
const IN_TRANSIT_STATUSES = ['transit', 'customs', 'warehouse']

// ─── Shortcuts ───
const SHORTCUTS = [
  { label: 'Ajouter un produit',     icon: '📦', to: '/produits',     color: '#6366f1' },
  { label: 'Ajouter un fournisseur', icon: '🏭', to: '/fournisseurs', color: '#8b5cf6' },
  { label: 'Créer une commande',     icon: '📋', to: '/commandes',    color: '#3b82f6' },
  { label: 'Créer une expédition',   icon: '🚢', to: '/expeditions',  color: '#0ea5e9' },
  { label: 'Ajouter un document',    icon: '📄', to: '/documents',    color: '#f59e0b' },
  { label: 'Analyse IA produit',     icon: '🤖', to: '/analyse-ia',   color: '#ec4899' },
  { label: 'Voir le stock',          icon: '📊', to: '/stock',        color: '#10b981' },
  { label: 'Ruptures de stock',      icon: '⚠️', to: '/stock',        color: '#ef4444' },
  { label: 'Voir les expéditions',   icon: '✈️', to: '/expeditions',  color: '#0ea5e9' },
  { label: 'Voir les fournisseurs',  icon: '🤝', to: '/fournisseurs', color: '#8b5cf6' },
]

// ─── localStorage Notes ───
function loadNotes() {
  try { return JSON.parse(localStorage.getItem('mecarys_notes') || '[]') } catch { return [] }
}
function persistNotes(notes) {
  try { localStorage.setItem('mecarys_notes', JSON.stringify(notes)) } catch {}
}

// ─── Extract first name from email ───
function firstName(email) {
  if (!email) return 'vous'
  const raw = email.split('@')[0].split('.')[0].replace(/[^a-zA-ZÀ-ÿ]/g, '')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

// ─── Editable note field ───
function EditNoteField({ initialText, onSave, onCancel }) {
  const [val, setVal] = useState(initialText)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <textarea
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(val) } if (e.key === 'Escape') onCancel() }}
        style={{ width: '100%', minHeight: 56, padding: '6px 8px', background: '#fff', border: '1px solid #6366f150', borderRadius: 6, fontSize: 12, color: colors.text, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onSave(val)} style={{ flex: 1, padding: '5px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Sauvegarder</button>
        <button onClick={onCancel} style={{ padding: '5px 10px', background: '#f0f0eb', color: colors.textMuted, border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Annuler</button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───
export default function Dashboard() {
  const navigate = useNavigate()
  const { user, setProducts, setAlerts: setStoreAlerts, setOrders } = useStore()

  // ── Data hooks — all from real Supabase tables ──
  const { data: productsData, loading: loadingP } = useData('products',     () => getProducts(user.id),        [user])
  const { data: ordersData,   loading: loadingO } = useData('orders',       () => getOrders(user.id),          [user])
  const { data: shipmentsData,loading: loadingS } = useData('shipments',    () => getShipments(user.id),       [user])
  const { data: suppliersData,loading: loadingSu } = useData('suppliers',   () => getSuppliers(user.id),       [user])
  const { data: documentsData,loading: loadingD } = useData('documents',    () => getDocuments(user.id),       [user])
  const { data: competitorsData }                  = useData('competitors',  () => getAllCompetitors(user.id),  [user])
  const { data: alertsDbData }                     = useData('db-alerts',    () => getAlerts(user.id),         [user])

  const loading = loadingP || loadingO || loadingS || loadingSu || loadingD

  // ── Sync to global store so other components stay in sync ──
  useEffect(() => { if (productsData) setProducts(productsData) },   [productsData, setProducts])
  useEffect(() => { if (alertsDbData) setStoreAlerts(alertsDbData) }, [alertsDbData, setStoreAlerts])
  useEffect(() => { if (ordersData)   setOrders(ordersData) },        [ordersData, setOrders])

  // ── Normalize arrays (never null) ──
  const products    = productsData   || []
  const orders      = ordersData     || []
  const shipments   = shipmentsData  || []
  const suppliers   = suppliersData  || []
  const documents   = documentsData  || []
  const competitors = competitorsData || []

  // ── KPI calculations ──
  const activeOrders    = orders.filter(o => ACTIVE_ORDER_STATUSES.includes(o.status))
  const activeShipments = shipments.filter(s => ACTIVE_SHIPMENT_STATUSES.includes(s.status))
  const unitsInTransit  = shipments
    .filter(s => IN_TRANSIT_STATUSES.includes(s.status))
    .reduce((a, s) => a + (Number(s.items) || 0), 0)
  const stockValue = products.reduce((a, p) => a + (Number(p.stock_fba) || 0) * (Number(p.cost) || 0), 0)

  // ── Real alerts from products ──
  const productAlerts = computeAlerts(products)
  const criticalStock = productAlerts.filter(a => a.type === 'stock' && a.severity === 'critical').length

  // ── Extra smart alerts from other modules ──
  const today = new Date().toISOString().split('T')[0]
  const customsBlocked = shipments.filter(s => s.status === 'customs')
  const lateOrders = orders.filter(o =>
    o.expected_delivery && o.expected_delivery < today &&
    !['delivered', 'cancelled'].includes(o.status)
  )

  const allAlerts = [
    ...productAlerts,
    ...customsBlocked.map(s => ({
      severity: 'warning',
      type: 'customs',
      message: `Expédition ${s.reference || s.id} bloquée en douane — vérifiez votre transitaire`,
    })),
    ...lateOrders.map(o => ({
      severity: 'warning',
      type: 'order_late',
      message: `Commande ${o.order_number || o.id} en retard (ETA: ${o.expected_delivery})`,
    })),
  ]
  const sortOrder = { critical: 0, warning: 1, info: 2 }
  const sortedAlerts = allAlerts
    .sort((a, b) => (sortOrder[a.severity] ?? 1) - (sortOrder[b.severity] ?? 1))
    .slice(0, 10)

  // ── Pipeline from real shipments ──
  const pipeline = PIPELINE_STAGES.map(stage => {
    const matched = shipments.filter(s =>
      stage.key === 'fba'
        ? s.status === 'fba' || s.status === 'delivered'
        : s.status === stage.key
    )
    return {
      ...stage,
      count: matched.length,
      items: matched.reduce((a, s) => a + (Number(s.items) || 0), 0),
    }
  })

  // ── Recent competitors (real) ──
  const recentCompetitors = competitors.slice(0, 4)

  // ── Notes (localStorage) ──
  const [period, setPeriod]       = useState('30j')
  const [notes, setNotes]         = useState(loadNotes)
  const [noteText, setNoteText]   = useState('')
  const [editingNote, setEditingNote] = useState(null)

  const addNote = () => {
    if (!noteText.trim()) return
    const updated = [
      { id: Date.now(), text: noteText.trim(), pinned: false, createdAt: new Date().toISOString() },
      ...notes,
    ]
    setNotes(updated)
    persistNotes(updated)
    setNoteText('')
  }

  const deleteNote = id => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    persistNotes(updated)
  }

  const togglePin = id => {
    const updated = notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n)
    setNotes(updated)
    persistNotes(updated)
  }

  const saveEdit = (id, text) => {
    if (!text.trim()) return
    const updated = notes.map(n => n.id === id ? { ...n, text: text.trim() } : n)
    setNotes(updated)
    persistNotes(updated)
    setEditingNote(null)
  }

  const sortedNotes = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  // ── Greeting ──
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const name  = firstName(user?.email)

  if (loading) return <Loading />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ══════════════ HEADER ══════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: 0 }}>
            {greet}, {name} 👋
          </h1>
          <p style={{ fontSize: 13, color: colors.textFaint, marginTop: 4, margin: 0 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {products.length > 0 && ` · ${products.length} produit${products.length > 1 ? 's' : ''} dans votre catalogue`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/expeditions')}
            style={{ padding: '9px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >+ Expédition</button>
          <button
            onClick={() => navigate('/produits')}
            style={{ padding: '9px 18px', background: '#fff', color: colors.primary, border: `1px solid ${colors.primary}20`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >+ Produit</button>
        </div>
      </div>

      {/* ══════════════ KPI ROW 1 ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <ClickableKPI onClick={() => navigate('/produits')}>
          <KpiCard label="Produits" value={products.length} icon="📦" color={colors.primary} sub={products.length === 0 ? 'Ajoutez votre premier produit' : 'dans votre catalogue'} />
        </ClickableKPI>
        <ClickableKPI onClick={() => navigate('/fournisseurs')}>
          <KpiCard label="Fournisseurs" value={suppliers.length} icon="🏭" color="#8b5cf6" sub={suppliers.length === 0 ? 'Aucun fournisseur' : 'partenaires référencés'} />
        </ClickableKPI>
        <ClickableKPI onClick={() => navigate('/expeditions')}>
          <KpiCard label="Expéditions actives" value={activeShipments.length} icon="🚢" color="#3b82f6" sub={activeShipments.length === 0 ? 'Aucune en cours' : 'en route vers FBA'} />
        </ClickableKPI>
        <ClickableKPI onClick={() => navigate('/commandes')}>
          <KpiCard label="Commandes actives" value={activeOrders.length} icon="📋" color="#0ea5e9" sub={activeOrders.length === 0 ? 'Aucune en cours' : 'en traitement fournisseur'} />
        </ClickableKPI>
      </div>

      {/* ══════════════ KPI ROW 2 ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label="Unités en transit" value={formatNumber(unitsInTransit)} icon="✈️" color="#f59e0b" sub={unitsInTransit === 0 ? 'Aucune unité en route' : 'vers vos entrepôts'} />
        <ClickableKPI onClick={() => navigate('/stock')}>
          <KpiCard
            label="Ruptures critiques"
            value={criticalStock}
            icon="⚠️"
            color={criticalStock > 0 ? '#ef4444' : '#10b981'}
            sub={criticalStock > 0 ? 'action immédiate requise' : 'aucune rupture imminente'}
          />
        </ClickableKPI>
        <KpiCard label="Valeur du stock" value={stockValue > 0 ? formatCurrency(stockValue) : '—'} icon="💰" color="#10b981" sub={stockValue > 0 ? 'au prix de revient' : 'renseignez vos coûts'} />
        <ClickableKPI onClick={() => navigate('/documents')}>
          <KpiCard label="Documents" value={documents.length} icon="📄" color="#6b7280" sub={documents.length === 0 ? 'Aucun document' : 'enregistrés'} />
        </ClickableKPI>
      </div>

      {/* ══════════════ CA / PROFIT PAR PERIODE ══════════════ */}
      <div style={{ ...box, padding: 20 }}>
        {/* Tabs période */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Chiffre d'affaires & Profit</div>
          <div style={{ display: 'flex', gap: 4, background: '#f5f5f0', borderRadius: 9, padding: 3 }}>
            {Object.entries(PERIOD_LABELS).map(([k, label]) => (
              <button key={k} onClick={() => setPeriod(k)} style={{
                padding: '5px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                background: period === k ? '#fff' : 'transparent',
                color: period === k ? colors.primary : colors.textMuted,
                boxShadow: period === k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        </div>
        {/* Métriques + graphiques */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr 1fr', gap: 16, alignItems: 'start' }}>
          {/* CA */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>CA ({PERIOD_LABELS[period]})</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: colors.text, letterSpacing: '-0.5px' }}>{PERIOD_METRICS[period].ca}</div>
            <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 3 }}>↑ {PERIOD_METRICS[period].caChange}% vs préc.</div>
          </div>
          {/* Profit */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Profit ({PERIOD_LABELS[period]})</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981', letterSpacing: '-0.5px' }}>{PERIOD_METRICS[period].profit}</div>
            <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 3 }}>↑ {PERIOD_METRICS[period].profitChange}% vs préc.</div>
          </div>
          {/* Graph CA */}
          <div>
            <div style={{ fontSize: 11, color: colors.textFaint, marginBottom: 6 }}>Évolution CA</div>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={PERIOD_CHART[period]} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                <defs><linearGradient id="caDG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="t" stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false}/>
                <YAxis hide/>
                <Tooltip contentStyle={ttp} formatter={v => [`${v.toLocaleString('fr-FR')} €`, 'CA']}/>
                <Area type="monotone" dataKey="ca" stroke="#6366f1" fill="url(#caDG)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Graph Profit */}
          <div>
            <div style={{ fontSize: 11, color: colors.textFaint, marginBottom: 6 }}>Évolution Profit</div>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={PERIOD_CHART[period]} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                <defs><linearGradient id="profDG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="t" stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false}/>
                <YAxis hide/>
                <Tooltip contentStyle={ttp} formatter={v => [`${v.toLocaleString('fr-FR')} €`, 'Profit']}/>
                <Area type="monotone" dataKey="p" stroke="#10b981" fill="url(#profDG)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ══════════════ PIPELINE + ALERTES ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>

        {/* Pipeline logistique — 100% dynamique depuis shipments */}
        <div style={{ ...box, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Pipeline logistique</div>
              <div style={{ fontSize: 12, color: colors.textFaint, marginTop: 3 }}>
                {shipments.length === 0
                  ? 'Aucune expédition — créez-en une pour démarrer'
                  : `${shipments.length} expédition${shipments.length > 1 ? 's' : ''} · ${formatNumber(shipments.reduce((a, s) => a + (Number(s.items) || 0), 0))} unités total`}
              </div>
            </div>
            <button
              onClick={() => navigate('/expeditions')}
              style={{ fontSize: 12, color: colors.primary, background: '#6366f110', padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >Gérer les expéditions →</button>
          </div>

          {shipments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: colors.textFaint }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🚢</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Aucune expédition en cours</div>
              <div style={{ fontSize: 12, marginBottom: 16 }}>Créez une expédition pour suivre votre pipeline fournisseur → Amazon FBA</div>
              <button
                onClick={() => navigate('/expeditions')}
                style={{ padding: '9px 20px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >+ Créer une expédition</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
              {pipeline.map((stage, i) => (
                <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <button
                    onClick={() => navigate('/expeditions')}
                    title={`${stage.label} : ${stage.count} expédition${stage.count > 1 ? 's' : ''}`}
                    style={{
                      flex: 1, background: stage.count > 0 ? stage.bg : '#fafaf8',
                      border: `1px solid ${stage.count > 0 ? stage.color + '35' : '#e8e8e3'}`,
                      borderRadius: 12, padding: '16px 8px', cursor: 'pointer',
                      textAlign: 'center', transition: 'all 0.15s', outline: 'none',
                      opacity: stage.count === 0 ? 0.5 : 1,
                    }}
                    onMouseEnter={e => stage.count > 0 && (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{stage.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: stage.count > 0 ? stage.color : colors.textFaint, marginBottom: 4 }}>
                      {stage.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: stage.count > 0 ? stage.color : colors.textFaint, lineHeight: 1 }}>
                      {stage.count}
                    </div>
                    {stage.items > 0 && (
                      <div style={{ fontSize: 10, color: colors.textFaint, marginTop: 4 }}>
                        {formatNumber(stage.items)} unités
                      </div>
                    )}
                  </button>
                  {i < pipeline.length - 1 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" style={{ flexShrink: 0, margin: '0 4px' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertes intelligentes */}
        <div style={{ ...box, padding: 18, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>🚨 Alertes</div>
            {sortedAlerts.length > 0 && (
              <span style={{
                fontSize: 11, background: sortedAlerts.some(a => a.severity === 'critical') ? '#ef444415' : '#f59e0b15',
                color: sortedAlerts.some(a => a.severity === 'critical') ? '#ef4444' : '#f59e0b',
                padding: '3px 8px', borderRadius: 20, fontWeight: 700,
              }}>
                {sortedAlerts.length}
              </span>
            )}
          </div>

          {sortedAlerts.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>Tout va bien</div>
              <div style={{ fontSize: 12, color: colors.textFaint, marginTop: 4, textAlign: 'center' }}>Aucune alerte active</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
              {sortedAlerts.map((a, i) => {
                const isCritical = a.severity === 'critical'
                const isWarning  = a.severity === 'warning'
                return (
                  <div
                    key={i}
                    onClick={() => navigate(a.type === 'stock' ? '/stock' : a.type === 'marge' || a.type === 'acos' ? '/produits' : a.type === 'customs' ? '/expeditions' : a.type === 'order_late' ? '/commandes' : '/produits')}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: isCritical ? '#ef444408' : isWarning ? '#f59e0b08' : '#3b82f608',
                      border: `1px solid ${isCritical ? '#ef444422' : isWarning ? '#f59e0b22' : '#3b82f622'}`,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <span style={{ fontSize: 12, flexShrink: 0 }}>
                      {SEVERITY[a.severity]?.icon || (isCritical ? '🔴' : isWarning ? '🟠' : '🔵')}
                    </span>
                    <span style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.5, flex: 1 }}>{a.message}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ RACCOURCIS ══════════════ */}
      <div style={{ ...box, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 16 }}>Raccourcis</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {SHORTCUTS.map(s => (
            <button
              key={s.label}
              onClick={() => navigate(s.to)}
              style={{
                background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 12,
                padding: '14px 8px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s', outline: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = s.color
                e.currentTarget.style.background  = s.color + '0d'
                e.currentTarget.style.transform   = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e8e8e3'
                e.currentTarget.style.background  = '#fafaf8'
                e.currentTarget.style.transform   = 'none'
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: s.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{s.icon}</div>
              <span style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.4 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ CONCURRENTS + NOTES ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Suivi concurrents — données réelles */}
        <div style={{ ...box, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Suivi concurrents</div>
            <button
              onClick={() => navigate('/concurrents')}
              style={{ fontSize: 12, color: colors.primary, background: '#6366f110', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >Gérer →</button>
          </div>

          {recentCompetitors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: colors.textFaint }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Aucun concurrent suivi</div>
              <div style={{ fontSize: 12, marginBottom: 14 }}>Ajoutez des concurrents depuis la fiche produit</div>
              <button
                onClick={() => navigate('/concurrents')}
                style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >Ouvrir le suivi →</button>
            </div>
          ) : (
            <>
              {recentCompetitors.map((c, i) => (
                <div
                  key={c.id || i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < recentCompetitors.length - 1 ? '1px solid #f0f0eb' : 'none',
                  }}
                >
                  <div style={{ width: 36, height: 36, background: '#f0f0eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.competitor_name || 'Concurrent'}
                    </div>
                    {(c.products?.name || c.products?.asin) && (
                      <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.products?.name || c.products?.asin}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {c.price != null && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{Number(c.price).toFixed(2)} €</div>
                    )}
                    {c.rating != null && (
                      <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 1 }}>★ {c.rating}</div>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <span
                  onClick={() => navigate('/concurrents')}
                  style={{ fontSize: 12, color: colors.primary, cursor: 'pointer', fontWeight: 500 }}
                >Voir tous les suivis →</span>
              </div>
            </>
          )}
        </div>

        {/* Notes rapides — localStorage, entièrement fonctionnel */}
        <div style={{ ...box, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 14 }}>📝 Notes rapides</div>

          {/* Ajout de note */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Nouvelle note (Entrée pour valider)..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              style={{
                flex: 1, padding: '9px 12px', background: '#fafaf8', border: '1px solid #e8e8e3',
                borderRadius: 8, color: colors.text, fontSize: 12, outline: 'none',
              }}
            />
            <button
              onClick={addNote}
              disabled={!noteText.trim()}
              style={{
                padding: '9px 16px', background: noteText.trim() ? colors.primary : '#e8e8e3',
                color: noteText.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700, cursor: noteText.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s', flexShrink: 0,
              }}
            >+</button>
          </div>

          {/* Liste des notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
            {sortedNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: colors.textFaint, fontSize: 12 }}>
                Aucune note. Écrivez quelque chose ci-dessus.
              </div>
            ) : sortedNotes.map(note => (
              <div
                key={note.id}
                style={{
                  background: note.pinned ? '#fffbeb' : '#fafaf8',
                  border: `1px solid ${note.pinned ? '#fde68a' : '#e8e8e3'}`,
                  borderRadius: 8, padding: '10px 12px',
                }}
              >
                {editingNote === note.id ? (
                  <EditNoteField
                    initialText={note.text}
                    onSave={text => saveEdit(note.id, text)}
                    onCancel={() => setEditingNote(null)}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 12, color: colors.textMuted, flex: 1, lineHeight: 1.5 }}>
                      {note.pinned && <span style={{ marginRight: 4 }}>📌</span>}
                      {note.text}
                    </span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 1 }}>
                      <NoteBtn title={note.pinned ? 'Désépingler' : 'Épingler'} onClick={() => togglePin(note.id)} color={note.pinned ? '#f59e0b' : colors.textFaint}>📌</NoteBtn>
                      <NoteBtn title="Modifier" onClick={() => setEditingNote(note.id)} color={colors.textFaint}>✏️</NoteBtn>
                      <NoteBtn title="Supprimer" onClick={() => deleteNote(note.id)} color="#ef4444">🗑</NoteBtn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tiny helpers ───

function ClickableKPI({ onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
    >
      {children}
    </div>
  )
}

function NoteBtn({ onClick, color, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color, padding: '1px', lineHeight: 1 }}
    >{children}</button>
  )
}
