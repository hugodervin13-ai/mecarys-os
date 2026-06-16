import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getProducts, getOrders, getShipments, getSuppliers, getDocuments, getAllCompetitors
} from '../lib/supabase'
import { computeAlerts, SEVERITY } from '../lib/alertsEngine'
import { useStore } from '../lib/store'
import { useData } from '../lib/useData'
import { formatNumber, formatCurrency, formatDate } from '../lib/utils'
import { box, colors } from '../lib/theme'
import Loading from '../components/Loading'

// ─── Notes (localStorage) ──────────────────────────────────────────────────
const NOTES_KEY = 'mecarys_notes'
function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]') } catch { return [] }
}
function saveNotes(notes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

// ─── Pipeline config ────────────────────────────────────────────────────────
const PIPELINE = [
  { key: 'production', label: 'Production',   icon: '🏭', color: '#6366f1', orderStatus: ['production'],                                      shipmentStatus: ['production'] },
  { key: 'transit',    label: 'En transit',   icon: '🚢', color: '#3b82f6', orderStatus: ['shipped', 'transit_boat', 'transit_truck', 'transit'], shipmentStatus: ['transit'] },
  { key: 'customs',    label: 'Douane',        icon: '🛃', color: '#ef4444', orderStatus: ['customs'],                                          shipmentStatus: ['customs'] },
  { key: 'warehouse',  label: 'Entrepôt',      icon: '📦', color: '#f59e0b', orderStatus: [],                                                   shipmentStatus: ['warehouse'] },
  { key: 'fba',        label: 'Amazon FBA',   icon: '🟡', color: '#10b981', orderStatus: [],                                                   shipmentStatus: ['fba'] },
]

// ─── Shortcut config ────────────────────────────────────────────────────────
const SHORTCUTS = [
  { label: 'Ajouter produit',    icon: '📦', color: '#6366f1', to: '/produits' },
  { label: 'Ajouter fournisseur',icon: '🏭', color: '#8b5cf6', to: '/fournisseurs' },
  { label: 'Créer commande',     icon: '📋', color: '#3b82f6', to: '/commandes' },
  { label: 'Créer expédition',   icon: '🚢', color: '#0891b2', to: '/expeditions' },
  { label: 'Ajouter document',   icon: '📄', color: '#10b981', to: '/documents' },
  { label: 'Voir ruptures',      icon: '⚠️', color: '#ef4444', to: '/stock' },
  { label: 'Voir le stock',      icon: '🗄️', color: '#f59e0b', to: '/stock' },
  { label: 'Voir expéditions',   icon: '🛳️', color: '#0891b2', to: '/expeditions' },
  { label: 'Voir commandes',     icon: '📊', color: '#6366f1', to: '/commandes' },
  { label: 'Voir fournisseurs',  icon: '🤝', color: '#10b981', to: '/fournisseurs' },
]

const ALERT_NAV = { stock: '/stock', marge: '/produits', acos: '/produits', avis: '/qualite-sav', expedition: '/expeditions', commande: '/commandes', produit: '/produits' }

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, setProducts } = useStore()

  // ─── Data ────────────────────────────────────────────────────────────────
  const { data: productsData, loading: lP } = useData('products',    () => getProducts(user.id),      [user])
  const { data: ordersData,   loading: lO } = useData('orders',      () => getOrders(user.id),        [user])
  const { data: shipmentsData,loading: lS } = useData('shipments',   () => getShipments(user.id),     [user])
  const { data: suppliersData,loading: lSu} = useData('suppliers',   () => getSuppliers(user.id),     [user])
  const { data: documentsData,loading: lD } = useData('documents',   () => getDocuments(user.id),     [user])
  const { data: competitorsData }            = useData('competitors', () => getAllCompetitors(user.id),[user])

  const products    = productsData   || []
  const orders      = ordersData     || []
  const shipments   = shipmentsData  || []
  const suppliers   = suppliersData  || []
  const documents   = documentsData  || []
  const competitors = competitorsData || []

  useEffect(() => { if (productsData) setProducts(productsData) }, [productsData, setProducts])

  // ─── Notes ───────────────────────────────────────────────────────────────
  const [notes,       setNotes]       = useState(loadNotes)
  const [newNote,     setNewNote]     = useState('')
  const [editId,      setEditId]      = useState(null)
  const [editContent, setEditContent] = useState('')
  const [showArch,    setShowArch]    = useState(false)

  useEffect(() => { saveNotes(notes) }, [notes])

  const addNote = () => {
    if (!newNote.trim()) return
    setNotes(p => [{ id: uid(), content: newNote.trim(), pinned: false, archived: false, createdAt: new Date().toISOString() }, ...p])
    setNewNote('')
  }
  const deleteNote    = id => setNotes(p => p.filter(n => n.id !== id))
  const togglePin     = id => setNotes(p => p.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))
  const toggleArchive = id => setNotes(p => p.map(n => n.id === id ? { ...n, archived: !n.archived } : n))
  const startEdit     = n  => { setEditId(n.id); setEditContent(n.content) }
  const saveEdit      = () => {
    if (!editContent.trim()) return
    setNotes(p => p.map(n => n.id === editId ? { ...n, content: editContent.trim() } : n))
    setEditId(null); setEditContent('')
  }

  const visibleNotes = notes
    .filter(n => showArch ? n.archived : !n.archived)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  // ─── Smart Alerts ────────────────────────────────────────────────────────
  const productAlerts = computeAlerts(products).map(a => ({ ...a, link: ALERT_NAV[a.type] || '/produits' }))

  const extraAlerts = []

  shipments.forEach(s => {
    if (s.status === 'customs') {
      const days = Math.floor((Date.now() - new Date(s.created_at || s.updated_at).getTime()) / 86400000)
      if (days >= 3) extraAlerts.push({ severity: 'warning', icon: '🛃', message: `Expédition ${s.reference || '#' + (s.id || '').slice(0, 6)} bloquée en douane depuis ${days} jours`, link: '/expeditions' })
    }
  })

  orders.forEach(o => {
    if (o.expected_delivery && !['delivered', 'cancelled'].includes(o.status)) {
      if (new Date(o.expected_delivery) < new Date()) {
        extraAlerts.push({ severity: 'warning', icon: '📋', message: `Commande ${o.order_number || '#' + (o.id || '').slice(0, 6)} en retard — livraison prévue le ${formatDate(o.expected_delivery)}`, link: '/commandes' })
      }
    }
  })

  const allAlerts = [...productAlerts, ...extraAlerts]

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const activeOrders    = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length
  const activeShipments = shipments.filter(s => !['fba', 'cancelled'].includes(s.status)).length
  const unitsInTransit  = shipments.filter(s => ['transit', 'customs'].includes(s.status))
    .reduce((sum, s) => sum + (Number(s.items) || 0), 0)
  const stockOutCount   = productAlerts.filter(a => a.type === 'stock' && a.severity !== 'info').length
  const totalStockVal   = products.reduce((s, p) => s + (Number(p.stock_fba) || 0) * (Number(p.price_current) || 0), 0)
  const totalStockUnits = products.reduce((s, p) => s + (Number(p.stock_fba) || 0), 0)
  const totalRevenue30d = products.reduce((s, p) => s + (Number(p.revenue_30d) || 0), 0)
  const totalProfit30d  = products.reduce((s, p) => s + (Number(p.profit_30d) || 0), 0)
  const totalUnits30d   = products.reduce((s, p) => s + (Number(p.units_sold_30d) || 0), 0)
  const marginPct       = totalRevenue30d > 0 ? (totalProfit30d / totalRevenue30d * 100) : 0

  // ─── Pipeline ────────────────────────────────────────────────────────────
  const pipelineData = PIPELINE.map(stage => {
    const stageOrders    = orders.filter(o => stage.orderStatus.includes(o.status))
    const stageShipments = shipments.filter(s => stage.shipmentStatus.includes(s.status))
    const count = stageOrders.length + stageShipments.length
    const qty   = stageOrders.reduce((s, o) => s + (Number(o.quantity) || 0), 0)
               + stageShipments.reduce((s, sh) => s + (Number(sh.items) || 0), 0)
    const value = stageOrders.reduce((s, o) => s + (Number(o.cost_total) || 0), 0)
    const navTo = ['fba', 'warehouse'].includes(stage.key) ? '/expeditions' : stage.orderStatus.length ? '/commandes' : '/expeditions'
    return { ...stage, count, qty, value, navTo }
  })

  // ─── Competitors dedup (latest per ASIN) ─────────────────────────────────
  const topCompetitors = Object.values(
    competitors.reduce((acc, c) => {
      if (!acc[c.asin] || new Date(c.tracked_date) > new Date(acc[c.asin].tracked_date)) acc[c.asin] = c
      return acc
    }, {})
  ).slice(0, 6)

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (lP && lO && lS && lSu) return <Loading />

  const now = new Date()
  const h   = now.getHours()
  const greeting = h < 18 ? 'Bonjour' : 'Bonsoir'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: 0 }}>{greeting} 👋</h1>
          <p style={{ fontSize: 12, color: colors.textFaint, marginTop: 3, marginBottom: 0 }}>
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' '}— données en temps réel
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/analyse-ia')}
            style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >✨ Analyse IA</button>
          <button
            onClick={() => navigate('/expeditions')}
            style={{ background: '#fff', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >+ Expédition</button>
          <button
            onClick={() => navigate('/commandes')}
            style={{ background: '#fff', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >+ Commande</button>
        </div>
      </div>

      {/* ── KPIs ligne 1 ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiTile icon="📦" label="Produits"           value={products.length}   color="#6366f1" to="/produits"     navigate={navigate} />
        <KpiTile icon="🏭" label="Fournisseurs"       value={suppliers.length}  color="#8b5cf6" to="/fournisseurs" navigate={navigate} />
        <KpiTile icon="📋" label="Commandes actives"  value={activeOrders}      color="#3b82f6" to="/commandes"    navigate={navigate} />
        <KpiTile icon="🚢" label="Expéditions en cours" value={activeShipments} color="#0891b2" to="/expeditions"  navigate={navigate} />
      </div>

      {/* ── KPIs ligne 2 ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiTile icon="🌊" label="Unités en transit"      value={formatNumber(unitsInTransit)} color="#3b82f6"                                  to="/expeditions" navigate={navigate} />
        <KpiTile icon="⚠️" label="Ruptures potentielles"  value={stockOutCount}                color={stockOutCount > 0 ? '#ef4444' : '#10b981'} to="/stock"       navigate={navigate} alert={stockOutCount > 0} />
        <KpiTile icon="💰" label="Valeur du stock"        value={formatCurrency(totalStockVal)} color="#10b981"                                  to="/stock"       navigate={navigate} small />
        <KpiTile icon="📄" label="Documents"              value={documents.length}              color="#f59e0b"                                  to="/documents"   navigate={navigate} />
      </div>

      {/* ── Performance 30 jours (si données réelles) ──────────────────────── */}
      {(totalRevenue30d > 0 || totalUnits30d > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <PerfCard icon="💰" color="#f59e0b" label="CA 30 jours"         main={formatCurrency(totalRevenue30d)} sub="Agrégé depuis les produits" />
          <PerfCard icon="📊" color="#10b981" label="Profit net 30 jours"  main={formatCurrency(totalProfit30d)}  sub={`Marge : ${marginPct.toFixed(1)}%`} subColor={marginPct >= 20 ? '#10b981' : marginPct >= 10 ? '#f59e0b' : '#ef4444'} />
          <PerfCard icon="📦" color="#3b82f6" label="Unités vendues 30 j"  main={formatNumber(totalUnits30d)}    sub={`Stock FBA : ${formatNumber(totalStockUnits)} unités`} />
        </div>
      )}

      {/* ── Pipeline logistique ─────────────────────────────────────────────── */}
      <div style={{ ...box, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Pipeline logistique</div>
            <div style={{ fontSize: 12, color: colors.textFaint, marginTop: 2 }}>Basé sur vos commandes et expéditions réelles</div>
          </div>
          <button
            onClick={() => navigate('/expeditions')}
            style={{ fontSize: 12, background: `${colors.primary}10`, color: colors.primary, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >Voir les expéditions →</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
          {pipelineData.map((stage, i) => (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <PipeCard stage={stage} navigate={navigate} />
              {i < pipelineData.length - 1 && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Alertes + Concurrents ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>

        {/* Alertes intelligentes */}
        <div style={{ ...box, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Alertes intelligentes</span>
            {allAlerts.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, minWidth: 20, textAlign: 'center' }}>
                {allAlerts.length}
              </span>
            )}
          </div>
          {allAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 4 }}>Tout est en ordre</div>
              <div style={{ fontSize: 12, color: colors.textFaint }}>Aucune alerte — continuez comme ça !</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {allAlerts.slice(0, 8).map((a, i) => {
                const sev = SEVERITY[a.severity] || SEVERITY.info
                return (
                  <div
                    key={i}
                    onClick={() => navigate(a.link || '/produits')}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: `${sev.color}08`, borderLeft: `3px solid ${sev.color}`, borderRadius: '0 8px 8px 0', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{a.icon || sev.icon}</span>
                    <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, flex: 1 }}>{a.message}</span>
                    <span style={{ fontSize: 11, color: sev.color, fontWeight: 600, flexShrink: 0 }}>Voir →</span>
                  </div>
                )
              })}
              {allAlerts.length > 8 && (
                <div style={{ textAlign: 'center', fontSize: 12, color: colors.textFaint, paddingTop: 6 }}>
                  + {allAlerts.length - 8} alerte(s) supplémentaire(s)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Concurrents */}
        <div style={{ ...box, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Concurrents suivis</span>
            <button
              onClick={() => navigate('/concurrents')}
              style={{ fontSize: 11, background: `${colors.primary}10`, color: colors.primary, padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >+ Ajouter</button>
          </div>
          {topCompetitors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 12, color: colors.textFaint, marginBottom: 12 }}>Aucun concurrent suivi</div>
              <button
                onClick={() => navigate('/concurrents')}
                style={{ fontSize: 11, background: colors.primary, color: '#fff', padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >Ajouter un concurrent</button>
            </div>
          ) : (
            <div>
              {topCompetitors.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < topCompetitors.length - 1 ? `1px solid ${colors.borderLight}` : 'none' }}>
                  <div style={{ width: 28, height: 28, background: '#f5f5f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#9ca3af', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>{c.asin}</div>
                    {(c.products?.name || c.product_name) && (
                      <div style={{ fontSize: 10, color: colors.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.products?.name || c.product_name}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {c.price != null && <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{c.price} €</div>}
                    {c.rating != null && <div style={{ fontSize: 10, color: '#f59e0b' }}>★ {c.rating}</div>}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, textAlign: 'right' }}>
                <span onClick={() => navigate('/concurrents')} style={{ fontSize: 11, color: colors.primary, cursor: 'pointer', fontWeight: 600 }}>
                  Voir tous →
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Raccourcis + Notes ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Raccourcis */}
        <div style={{ ...box, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 14 }}>Raccourcis métier</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {SHORTCUTS.map(s => (
              <button
                key={s.label}
                onClick={() => navigate(s.to)}
                title={s.label}
                style={{ background: '#fafaf8', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 6px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.background = `${s.color}08` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = '#fafaf8' }}
              >
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <span style={{ fontSize: 9, color: colors.textMuted, lineHeight: 1.3, fontWeight: 500, textAlign: 'center' }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes rapides */}
        <div style={{ ...box, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>📝 Notes rapides</span>
            <button
              onClick={() => setShowArch(v => !v)}
              style={{ fontSize: 11, color: colors.textFaint, background: showArch ? '#f5f5f0' : 'none', border: `1px solid ${showArch ? colors.border : 'transparent'}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
            >{showArch ? '← Actives' : 'Archives'}</button>
          </div>

          {!showArch && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                placeholder="Nouvelle note... (Entrée pour valider)"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
                style={{ flex: 1, padding: '8px 12px', background: '#fafaf8', border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 12, outline: 'none' }}
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim()}
                style={{ padding: '8px 14px', background: newNote.trim() ? colors.primary : '#e8e8e3', color: newNote.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: newNote.trim() ? 'pointer' : 'default', transition: 'all 0.15s' }}
              >+</button>
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 220 }}>
            {visibleNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: colors.textFaint, fontSize: 12 }}>
                {showArch ? 'Aucune note archivée' : 'Aucune note — créez-en une !'}
              </div>
            ) : visibleNotes.map(note => (
              <div
                key={note.id}
                style={{ background: note.pinned ? '#fef9c3' : '#fafaf8', border: `1px solid ${note.pinned ? '#fde68a' : colors.border}`, borderRadius: 8, padding: '8px 10px' }}
              >
                {editId === note.id ? (
                  <div>
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) saveEdit() }}
                      style={{ width: '100%', padding: '6px', background: '#fff', border: `1px solid ${colors.primary}`, borderRadius: 6, fontSize: 12, color: colors.text, resize: 'vertical', minHeight: 56, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={saveEdit} style={{ fontSize: 11, background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>Enregistrer</button>
                      <button onClick={() => { setEditId(null); setEditContent('') }} style={{ fontSize: 11, background: 'none', color: colors.textFaint, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {note.pinned && <span style={{ fontSize: 11, flexShrink: 0, marginTop: 2 }}>📌</span>}
                    <span style={{ fontSize: 12, color: '#374151', flex: 1, lineHeight: 1.5 }}>{note.content}</span>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <NoteBtn onClick={() => togglePin(note.id)}     title={note.pinned ? 'Désépingler' : 'Épingler'} active={note.pinned}>📌</NoteBtn>
                      <NoteBtn onClick={() => startEdit(note)}         title="Modifier">✏️</NoteBtn>
                      <NoteBtn onClick={() => toggleArchive(note.id)} title={note.archived ? 'Désarchiver' : 'Archiver'}>🗂️</NoteBtn>
                      <NoteBtn onClick={() => deleteNote(note.id)}    title="Supprimer" danger>🗑️</NoteBtn>
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiTile({ icon, label, value, color, to, navigate, alert: isAlert, small }) {
  return (
    <button
      onClick={() => navigate(to)}
      style={{ background: isAlert ? `${color}08` : '#fff', border: `1px solid ${isAlert ? color + '30' : colors.border}`, borderRadius: 14, padding: '16px 18px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 0 3px ${color}10` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isAlert ? color + '30' : colors.border; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: colors.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: small ? 16 : 24, fontWeight: 800, color: isAlert ? color : colors.text, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </button>
  )
}

function PerfCard({ icon, color, label, main, sub, subColor }) {
  return (
    <div style={{ ...box, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, color: colors.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: colors.text, lineHeight: 1.2 }}>{main}</div>
        <div style={{ fontSize: 11, color: subColor || colors.textFaint, marginTop: 3 }}>{sub}</div>
      </div>
    </div>
  )
}

function PipeCard({ stage, navigate }) {
  const active = stage.count > 0
  return (
    <button
      onClick={() => navigate(stage.navTo)}
      style={{ flex: 1, background: active ? `${stage.color}08` : '#fafaf8', border: `1px solid ${active ? stage.color + '30' : colors.border}`, borderRadius: 12, padding: '14px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', minHeight: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${stage.color}12`; e.currentTarget.style.borderColor = stage.color }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? `${stage.color}08` : '#fafaf8'; e.currentTarget.style.borderColor = active ? stage.color + '30' : colors.border }}
    >
      <div>
        <div style={{ fontSize: 16, marginBottom: 4 }}>{stage.icon}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: active ? stage.color : colors.textFaint }}>{stage.label}</div>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: active ? colors.text : '#e5e7eb', lineHeight: 1 }}>{stage.count}</div>
        {stage.qty > 0 && <div style={{ fontSize: 10, color: colors.textFaint, marginTop: 2 }}>{formatNumber(stage.qty)} unités</div>}
        {stage.value > 0 && <div style={{ fontSize: 10, color: colors.textFaint }}>{formatCurrency(stage.value)}</div>}
        {!active && <div style={{ fontSize: 10, color: '#d1d5db', marginTop: 2 }}>Vide</div>}
      </div>
    </button>
  )
}

function NoteBtn({ onClick, title, children, active, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', opacity: active ? 1 : danger ? 0.4 : 0.45, borderRadius: 4, transition: 'opacity 0.1s' }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = active ? '1' : danger ? '0.4' : '0.45' }}
    >{children}</button>
  )
}
