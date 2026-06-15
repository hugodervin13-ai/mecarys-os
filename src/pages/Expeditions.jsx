import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { box, inp, lbl, colors } from '../lib/theme'
import { KpiCard, EmptyState, PageHeader } from '../components/ui'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import {
  TRANSPORT_TYPES, STATUS, STATUS_FLOW, TIMELINE_STEPS, CARRIERS, trackingUrl,
  emptyShipment, transportDuration, delayDays, unitCost, computeStats,
  computeShipmentAlerts, computeAllAlerts, loadShipments, saveShipments,
  newId, autoReference, demoShipments,
} from '../lib/shipments'
import { toast } from '../lib/store'

const SEVERITY_STYLE = {
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
  warning:  { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
  info:     { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
}

// ---------- Timeline automatique ----------
function ProgressSteps({ status }) {
  // Si le statut courant n'est pas une étape de timeline (draft/closed),
  // on rattache l'index logique : draft → avant tout, closed → tout validé.
  const flowIdx = STATUS_FLOW.indexOf(status)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 14, overflowX: 'auto' }}>
      {TIMELINE_STEPS.map((step, i) => {
        const s = STATUS[step]
        const stepFlowIdx = STATUS_FLOW.indexOf(step)
        const done = flowIdx >= stepFlowIdx
        const isCurrent = status === step
        const fill = done ? (isCurrent ? s.color : colors.success) : '#f0f0eb'
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < TIMELINE_STEPS.length - 1 ? 1 : 0, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 54 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: fill, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: `2px solid ${done ? fill : '#e8e8e3'}`, boxShadow: isCurrent ? `0 0 0 4px ${s.color}22` : 'none' }}>
                {done ? (isCurrent ? s.icon : '✓') : ''}
              </div>
              <span style={{ fontSize: 9, color: done ? (isCurrent ? s.color : colors.success) : '#9ca3af', marginTop: 4, whiteSpace: 'nowrap', fontWeight: isCurrent ? 700 : 400 }}>
                {s.label}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: flowIdx > stepFlowIdx ? colors.success : '#f0f0eb', margin: '0 2px', marginBottom: 16, minWidth: 12 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function TrackingBadge({ carrier, tracking }) {
  if (!tracking) return <span style={{ fontSize: 12, color: '#9ca3af' }}>Aucun suivi</span>
  const c = CARRIERS[carrier] || CARRIERS.other
  return (
    <a href={trackingUrl(carrier, tracking)} target="_blank" rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 8, textDecoration: 'none' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace' }}>{tracking}</span>
      <span style={{ fontSize: 10, color: '#6b7280' }}>({c.name})</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </a>
  )
}

function Metric({ label, value, color = colors.text }) {
  return (
    <div style={{ flex: '1 1 110px', minWidth: 110, padding: '8px 12px', background: '#fafaf8', borderRadius: 8, border: '1px solid #f0f0eb' }}>
      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

export default function Expeditions() {
  const { user } = useStore()
  const uid = user?.id
  const [shipments, setShipments] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyShipment())
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: '', carrier: '', transport_type: '', country: '' })
  const [showArchived, setShowArchived] = useState(false)

  // Chargement initial depuis localStorage (persistant).
  useEffect(() => {
    setShipments(loadShipments(uid))
    setLoaded(true)
  }, [uid])

  // Persistance automatique à chaque changement (après le chargement initial).
  useEffect(() => {
    if (loaded) saveShipments(uid, shipments)
  }, [shipments, loaded, uid])

  // ---------- CRUD ----------
  const openCreate = () => { setForm(emptyShipment()); setEditingId(null); setShowForm(true) }
  const openEdit = (s) => { setForm({ ...emptyShipment(), ...s }); setEditingId(s.id); setShowForm(true) }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      reference: form.reference?.trim() || autoReference(),
      quantity: form.quantity === '' ? '' : Number(form.quantity),
      transport_cost: form.transport_cost === '' ? '' : Number(form.transport_cost),
    }
    if (editingId) {
      setShipments(prev => prev.map(s => s.id === editingId ? { ...s, ...data } : s))
      toast('Expédition mise à jour', 'success')
    } else {
      setShipments(prev => [{ id: newId(), archived: false, ...data }, ...prev])
      toast('Expédition créée', 'success')
    }
    setShowForm(false)
    setEditingId(null)
    setForm(emptyShipment())
  }

  const handleStatusChange = (id, status) =>
    setShipments(prev => prev.map(s => s.id === id ? { ...s, status } : s))

  const handleDuplicate = (s) => {
    setShipments(prev => [{ ...s, id: newId(), reference: `${s.reference}-COPIE`, status: 'draft', actual_arrival: '' }, ...prev])
    toast('Expédition dupliquée', 'success')
  }

  const handleArchive = (id) =>
    setShipments(prev => prev.map(s => s.id === id ? { ...s, archived: !s.archived } : s))

  const handleDelete = (id) => {
    if (!confirm('Supprimer définitivement cette expédition ?')) return
    setShipments(prev => prev.filter(s => s.id !== id))
    toast('Expédition supprimée', 'success')
  }

  const loadDemo = () => { setShipments(demoShipments()); toast('Données de démonstration chargées', 'info') }

  // ---------- Stats, alertes, filtres ----------
  const stats = useMemo(() => computeStats(shipments), [shipments])
  const alerts = useMemo(() => computeAllAlerts(shipments.filter(s => !s.archived)), [shipments])

  const countries = useMemo(() => {
    const set = new Set()
    shipments.forEach(s => { if (s.country_from) set.add(s.country_from); if (s.country_to) set.add(s.country_to) })
    return [...set].sort()
  }, [shipments])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return shipments.filter(s => {
      if (!showArchived && s.archived) return false
      if (showArchived && !s.archived) return false
      if (q && ![s.reference, s.supplier, s.product].some(v => (v || '').toLowerCase().includes(q))) return false
      if (filters.status && s.status !== filters.status) return false
      if (filters.carrier && s.carrier !== filters.carrier) return false
      if (filters.transport_type && s.transport_type !== filters.transport_type) return false
      if (filters.country && s.country_from !== filters.country && s.country_to !== filters.country) return false
      return true
    })
  }, [shipments, search, filters, showArchived])

  const archivedCount = shipments.filter(s => s.archived).length

  if (!loaded) return <Loading />

  return (
    <div>
      <PageHeader title="Expéditions" subtitle="Pilotez vos importations fournisseurs jusqu'aux entrepôts Amazon FBA">
        <button onClick={openCreate} style={{ padding: '10px 20px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Nouvelle expédition
        </button>
      </PageHeader>

      {/* Alertes dynamiques */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {alerts.slice(0, 5).map((a, i) => {
            const st = SEVERITY_STYLE[a.severity]
            return (
              <div key={i} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <span style={{ fontSize: 13, color: st.color, fontWeight: 600 }}>{a.message}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* KPIs dynamiques (responsive) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        <KpiCard label="En cours" value={stats.active} icon="🚢" color={colors.info} sub="En route vers FBA" />
        <KpiCard label="En douane" value={stats.customs} icon="🛃" color={stats.customs > 0 ? colors.warning : colors.success} sub={stats.customs > 0 ? 'Attention requise' : 'Aucun blocage'} />
        <KpiCard label="Livrées" value={stats.delivered} icon="✅" color={colors.success} sub="Reçues / clôturées" />
        <KpiCard label="Unités en transit" value={stats.unitsInTransit.toLocaleString('fr-FR')} icon="📦" color={colors.primary} sub={`${stats.withTracking} avec suivi`} />
      </div>

      {/* Recherche + filtres (responsive) */}
      <div style={{ ...box, padding: 14, marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input style={{ ...inp, flex: '2 1 220px' }} placeholder="🔍 Référence, fournisseur, produit…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inp, flex: '1 1 140px' }} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Tous les statuts</option>
          {STATUS_FLOW.map(k => <option key={k} value={k}>{STATUS[k].icon} {STATUS[k].label}</option>)}
        </select>
        <select style={{ ...inp, flex: '1 1 130px' }} value={filters.transport_type} onChange={e => setFilters({ ...filters, transport_type: e.target.value })}>
          <option value="">Tous transports</option>
          {Object.entries(TRANSPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select style={{ ...inp, flex: '1 1 130px' }} value={filters.carrier} onChange={e => setFilters({ ...filters, carrier: e.target.value })}>
          <option value="">Tous transporteurs</option>
          {Object.entries(CARRIERS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <select style={{ ...inp, flex: '1 1 120px' }} value={filters.country} onChange={e => setFilters({ ...filters, country: e.target.value })}>
          <option value="">Tous pays</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || filters.status || filters.carrier || filters.transport_type || filters.country) && (
          <button onClick={() => { setSearch(''); setFilters({ status: '', carrier: '', transport_type: '', country: '' }) }}
            style={{ padding: '9px 14px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, fontSize: 12, color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>
            Réinitialiser
          </button>
        )}
      </div>

      {archivedCount > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setShowArchived(v => !v)}
            style={{ padding: '7px 14px', background: showArchived ? colors.primary : '#fff', color: showArchived ? '#fff' : colors.textMuted, border: `1px solid ${showArchived ? colors.primary : colors.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🗄️ {showArchived ? 'Voir les expéditions actives' : `Voir les archivées (${archivedCount})`}
          </button>
        </div>
      )}

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {visible.map(s => {
          const st = STATUS[s.status] || STATUS.draft
          const tt = TRANSPORT_TYPES[s.transport_type] || TRANSPORT_TYPES.bateau
          const carrierInfo = CARRIERS[s.carrier] || CARRIERS.other
          const dur = transportDuration(s)
          const delay = delayDays(s)
          const uc = unitCost(s)
          const cardAlerts = computeShipmentAlerts(s)
          return (
            <div key={s.id} style={{ ...box, padding: 20, opacity: s.archived ? 0.7 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${tt.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{tt.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>{s.reference}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: `${tt.color}15`, color: tt.color }}>{tt.label} · ~{tt.days}j</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                      {s.supplier && <strong>{s.supplier}</strong>}{s.supplier && ' · '}{s.product || 'Produit non renseigné'}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      {(s.country_from || '?')} → {(s.country_to || '?')} · {carrierInfo.name} · <strong>{Number(s.quantity) || 0} unités</strong>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <select value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)}
                    style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${st.color}40`, background: `${st.color}15`, color: st.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                    {STATUS_FLOW.map(k => <option key={k} value={k}>{STATUS[k].icon} {STATUS[k].label}</option>)}
                  </select>
                  <button onClick={() => openEdit(s)} title="Modifier" style={iconBtn}>✏️</button>
                  <button onClick={() => handleDuplicate(s)} title="Dupliquer" style={iconBtn}>⧉</button>
                  <button onClick={() => handleArchive(s.id)} title={s.archived ? 'Désarchiver' : 'Archiver'} style={iconBtn}>🗄️</button>
                  <button onClick={() => handleDelete(s.id)} title="Supprimer" style={{ ...iconBtn, color: colors.danger }}>🗑️</button>
                </div>
              </div>

              {/* Alertes spécifiques à la carte */}
              {cardAlerts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {cardAlerts.map((a, i) => {
                    const ss = SEVERITY_STYLE[a.severity]
                    return <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color }}>{a.icon} {a.message.split(' : ')[1] || a.message}</span>
                  })}
                </div>
              )}

              {/* Calculs automatiques */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <Metric label="Coût transport" value={s.transport_cost ? `${Number(s.transport_cost).toLocaleString('fr-FR')} €` : '—'} />
                <Metric label="Coût / unité" value={uc != null ? `${uc.toFixed(2)} €` : '—'} />
                <Metric label="Durée transit" value={dur != null ? `${dur} j` : '—'} />
                <Metric label="Retard" value={delay == null ? '—' : delay > 0 ? `+${delay} j` : `${delay} j`} color={delay > 7 ? colors.danger : delay > 0 ? colors.warning : delay != null ? colors.success : colors.text} />
                <Metric label="ETA" value={s.eta || '—'} />
                <Metric label="Arrivée réelle" value={s.actual_arrival || '—'} />
              </div>

              {/* Suivi */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 14px', background: '#fafaf8', borderRadius: 8, border: '1px solid #f0f0eb', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>N° suivi :</span>
                <TrackingBadge carrier={s.carrier} tracking={s.tracking_number} />
              </div>

              {s.notes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10, fontStyle: 'italic' }}>📝 {s.notes}</div>}

              <ProgressSteps status={s.status} />
            </div>
          )
        })}

        {visible.length === 0 && (
          <div style={box}>
            <EmptyState
              icon="🚢"
              title={shipments.length === 0 ? 'Aucune expédition' : 'Aucun résultat'}
              subtitle={shipments.length === 0 ? 'Créez votre première expédition pour suivre vos importations FBA.' : 'Aucune expédition ne correspond à votre recherche / filtres.'}
              action={shipments.length === 0 ? (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={openCreate} style={{ padding: '10px 20px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nouvelle expédition</button>
                  <button onClick={loadDemo} style={{ padding: '10px 20px', background: '#fff', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Charger un exemple</button>
                </div>
              ) : null}
            />
          </div>
        )}
      </div>

      {/* Formulaire création / édition */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? "Modifier l'expédition" : 'Nouvelle expédition'}>
        <form onSubmit={handleSubmit}>
          <Row>
            <Field label="Référence"><input style={inp} value={form.reference} placeholder="Auto si vide" onChange={e => setForm({ ...form, reference: e.target.value })} /></Field>
            <Field label="Fournisseur"><input style={inp} value={form.supplier} placeholder="Shenzhen Tech Co" onChange={e => setForm({ ...form, supplier: e.target.value })} /></Field>
          </Row>
          <Row>
            <Field label="Produit"><input style={inp} value={form.product} placeholder="Câble USB-C 2m" onChange={e => setForm({ ...form, product: e.target.value })} /></Field>
            <Field label="Quantité *"><input style={inp} type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required /></Field>
          </Row>
          <Row>
            <Field label="Pays de départ"><input style={inp} value={form.country_from} placeholder="Chine" onChange={e => setForm({ ...form, country_from: e.target.value })} /></Field>
            <Field label="Pays d'arrivée"><input style={inp} value={form.country_to} placeholder="France" onChange={e => setForm({ ...form, country_to: e.target.value })} /></Field>
          </Row>
          <Row>
            <Field label="Type de transport">
              <select style={inp} value={form.transport_type} onChange={e => setForm({ ...form, transport_type: e.target.value })}>
                {Object.entries(TRANSPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label} (~{v.days}j)</option>)}
              </select>
            </Field>
            <Field label="Transporteur">
              <select style={inp} value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })}>
                {Object.entries(CARRIERS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Numéro de suivi"><input style={{ ...inp, fontFamily: 'monospace' }} value={form.tracking_number} placeholder="CMAU1234567" onChange={e => setForm({ ...form, tracking_number: e.target.value })} /></Field>
            <Field label="Coût transport (€)"><input style={inp} type="number" min="0" step="0.01" value={form.transport_cost} onChange={e => setForm({ ...form, transport_cost: e.target.value })} /></Field>
          </Row>
          <Field label="Statut">
            <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUS_FLOW.map(k => <option key={k} value={k}>{STATUS[k].icon} {STATUS[k].label}</option>)}
            </select>
          </Field>
          <Row>
            <Field label="Date commande"><input style={inp} type="date" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} /></Field>
            <Field label="Date départ"><input style={inp} type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })} /></Field>
          </Row>
          <Row>
            <Field label="Arrivée estimée"><input style={inp} type="date" value={form.eta} onChange={e => setForm({ ...form, eta: e.target.value })} /></Field>
            <Field label="Arrivée réelle"><input style={inp} type="date" value={form.actual_arrival} onChange={e => setForm({ ...form, actual_arrival: e.target.value })} /></Field>
          </Row>
          <Field label="Notes"><textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <button type="submit" style={{ width: '100%', padding: 12, marginTop: 8, background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {editingId ? 'Enregistrer les modifications' : "Créer l'expédition"}
          </button>
        </form>
      </Modal>
    </div>
  )
}

const iconBtn = { width: 30, height: 30, borderRadius: 8, border: '1px solid #e8e8e3', background: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>{children}</div>
}
function Field({ label, children }) {
  return <div><label style={lbl}>{label}</label>{children}</div>
}
