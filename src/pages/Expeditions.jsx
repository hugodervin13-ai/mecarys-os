import { useEffect, useState } from 'react'
import { getShipments, addShipment, deleteShipment, updateShipment } from '../lib/supabase'
import { useStore, toast } from '../lib/store'
import { mutate } from '../lib/useData'
import { box, inp, lbl } from '../lib/theme'
import { DemoBadge, KpiCard, EmptyState } from '../components/ui'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const STATUS = {
  production: { label: 'Production',   color: '#6366f1', icon: '🏭' },
  transit:    { label: 'En transit',   color: '#3b82f6', icon: '🚢' },
  customs:    { label: 'En douane',    color: '#f59e0b', icon: '🛃' },
  warehouse:  { label: 'Entrepôt',     color: '#10b981', icon: '🏬' },
  delivered:  { label: 'Livré',        color: '#10b981', icon: '✅' },
  fba:        { label: 'Amazon FBA',   color: '#10b981', icon: '📦' },
}

const STEPS = ['production', 'transit', 'customs', 'warehouse', 'fba']

const CARRIERS = {
  dhl:      { name: 'DHL',       url: 'https://www.dhl.com/fr-fr/home/suivi.html?tracking-id=', color: '#FFCC00' },
  fedex:    { name: 'FedEx',     url: 'https://www.fedex.com/fedextrack/?trknbr=', color: '#4D148C' },
  ups:      { name: 'UPS',       url: 'https://www.ups.com/track?tracknum=', color: '#351C15' },
  tnt:      { name: 'TNT',       url: 'https://www.tnt.com/express/fr_fr/site/outils-expedition/suivi.html?searchType=con&cons=', color: '#FF6600' },
  dpd:      { name: 'DPD',       url: 'https://trace.dpd.fr/fr/trace/', color: '#DC0032' },
  cma:      { name: 'CMA CGM',   url: 'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=ContainerNumber&Reference=', color: '#002B5C' },
  maersk:   { name: 'Maersk',    url: 'https://www.maersk.com/tracking/', color: '#003B5C' },
  msc:      { name: 'MSC',       url: 'https://www.msc.com/track-a-shipment?agencyPath=fr&trackingNumber=', color: '#002244' },
  other:    { name: 'Autre',     url: 'https://www.17track.net/fr/track?nums=', color: '#6b7280' },
}

const mockShipments = [
  { id: 'm1', reference: 'EXP-2024-001', origin: 'Shenzhen, Chine', destination: 'Amazon FBA FR', status: 'transit', carrier: 'dhl', tracking_number: '1234567890', eta: '2024-05-20', items: 500 },
  { id: 'm2', reference: 'EXP-2024-002', origin: 'Guangzhou, Chine', destination: 'Amazon FBA DE', status: 'customs', carrier: 'fedex', tracking_number: '9876543210', eta: '2024-05-18', items: 300 },
  { id: 'm3', reference: 'EXP-2024-003', origin: 'Istanbul, Turquie', destination: 'Amazon FBA FR', status: 'fba', carrier: 'cma', tracking_number: 'CMAU1234567', eta: '2024-05-10', items: 200 },
]

const emptyForm = { reference: '', origin: '', destination: '', carrier: 'dhl', items: '', status: 'transit', eta: '', tracking_number: '' }

function ProgressSteps({ status }) {
  const currentIdx = STEPS.indexOf(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 10 }}>
      {STEPS.map((step, i) => {
        const s = STATUS[step]
        const done = i <= currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? (isCurrent ? s.color : '#10b981') : '#f0f0eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: `2px solid ${done ? (isCurrent ? s.color : '#10b981') : '#e8e8e3'}` }}>
                {done ? (isCurrent ? s.icon : '✓') : ''}
              </div>
              <span style={{ fontSize: 9, color: done ? (isCurrent ? s.color : '#10b981') : '#9ca3af', marginTop: 3, whiteSpace: 'nowrap', fontWeight: isCurrent ? 700 : 400 }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < currentIdx ? '#10b981' : '#f0f0eb', margin: '0 4px', marginBottom: 16 }} />
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
  const trackUrl = c.url + encodeURIComponent(tracking)
  return (
    <a href={trackUrl} target="_blank" rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 8, textDecoration: 'none', cursor: 'pointer' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace' }}>{tracking}</span>
      <span style={{ fontSize: 10, color: '#6b7280' }}>({c.name})</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </a>
  )
}

export default function Expeditions() {
  const { user } = useStore()
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [useMock, setUseMock] = useState(false)
  const [editingTracking, setEditingTracking] = useState(null)
  const [trackingInput, setTrackingInput] = useState('')

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const { data, error } = await getShipments(user.id)
    if (error || !data || data.length === 0) {
      if (error) toast(`Erreur de chargement : ${error.message || 'réessayez plus tard'}`)
      setShipments(mockShipments)
      setUseMock(true)
    } else {
      setShipments(data)
      setUseMock(false)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const shipmentData = {
      reference: form.reference || `EXP-${Date.now().toString(36).toUpperCase()}`,
      origin: form.origin,
      destination: form.destination,
      carrier: form.carrier,
      items: Number(form.items),
      status: form.status,
      eta: form.eta || null,
    }
    if (useMock) {
      setShipments(prev => [...prev, { ...shipmentData, id: `m${Date.now()}`, tracking_number: form.tracking_number || null }])
    } else {
      const ok = await mutate(() => addShipment(user.id, shipmentData), 'shipments')
      if (ok) await loadData()
    }
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
  }

  const handleStatusChange = async (id, newStatus) => {
    if (useMock || String(id).startsWith('m')) {
      setShipments(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
    } else {
      const ok = await mutate(() => updateShipment(id, { status: newStatus }), 'shipments')
      if (ok) loadData()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette expédition ?')) return
    if (useMock || String(id).startsWith('m')) {
      setShipments(prev => prev.filter(s => s.id !== id))
    } else {
      const ok = await mutate(() => deleteShipment(id), 'shipments')
      if (ok) loadData()
    }
  }

  const saveTracking = async (id) => {
    if (useMock || String(id).startsWith('m')) {
      setShipments(prev => prev.map(s => s.id === id ? { ...s, tracking_number: trackingInput } : s))
    } else {
      const ok = await mutate(() => updateShipment(id, { tracking_number: trackingInput }), 'shipments')
      if (ok) loadData()
    }
    setEditingTracking(null)
  }

  const inTransit = shipments.filter(s => s.status === 'transit' || s.status === 'customs' || s.status === 'production').length
  const inCustoms = shipments.filter(s => s.status === 'customs').length
  const delivered = shipments.filter(s => s.status === 'delivered' || s.status === 'fba').length
  const totalItems = shipments.filter(s => s.status !== 'delivered' && s.status !== 'fba').reduce((a, s) => a + (s.items || 0), 0)
  const withTracking = shipments.filter(s => s.tracking_number).length

  if (loading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Expéditions</h1>
            {useMock && <DemoBadge />}
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Suivez vos envois fournisseurs jusqu'aux entrepôts Amazon FBA</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Nouvelle expédition
        </button>
      </div>

      {inCustoms > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🛃</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{inCustoms} expédition{inCustoms > 1 ? 's' : ''} bloquée{inCustoms > 1 ? 's' : ''} en douane</div>
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>Vérifiez la documentation douanière et contactez votre transitaire</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="En cours" value={inTransit} icon="🚢" color="#3b82f6" sub="En route vers FBA" />
        <KpiCard label="En douane" value={inCustoms} icon="🛃" color={inCustoms > 0 ? '#f59e0b' : '#10b981'} sub={inCustoms > 0 ? 'Attention requise' : 'Aucun blocage'} />
        <KpiCard label="Livrées" value={delivered} icon="✅" color="#10b981" sub="Dans les entrepôts" />
        <KpiCard label="Unités en transit" value={totalItems.toLocaleString()} icon="📦" color="#6366f1" sub={`${withTracking} avec suivi`} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {shipments.map(s => {
          const st = STATUS[s.status] || STATUS.transit
          const carrierInfo = CARRIERS[s.carrier] || CARRIERS.other
          return (
            <div key={s.id} style={{ ...box, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${st.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {st.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', fontFamily: 'monospace' }}>{s.reference}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {s.origin} → {s.destination} · {carrierInfo.name} · <strong>{s.items} unités</strong>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {s.eta && (
                    <span style={{ fontSize: 12, color: '#6b7280', background: '#fafaf8', padding: '4px 10px', borderRadius: 6, border: '1px solid #e8e8e3' }}>
                      ETA: {s.eta}
                    </span>
                  )}
                  <select value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)}
                    style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${st.color}40`, background: `${st.color}15`, color: st.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                  <button onClick={() => handleDelete(s.id)}
                    style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: '10px 14px', background: '#fafaf8', borderRadius: 8, border: '1px solid #f0f0eb' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap' }}>N° suivi :</span>
                {editingTracking === s.id ? (
                  <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                    <input style={{ ...inp, flex: 1, fontFamily: 'monospace' }} type="text" value={trackingInput}
                      onChange={e => setTrackingInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveTracking(s.id)}
                      placeholder="Ex: 1234567890, CMAU1234567..." autoFocus />
                    <button onClick={() => saveTracking(s.id)}
                      style={{ padding: '6px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Sauver
                    </button>
                    <button onClick={() => setEditingTracking(null)}
                      style={{ padding: '6px 10px', background: '#f0f0eb', color: '#6b7280', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <TrackingBadge carrier={s.carrier} tracking={s.tracking_number} />
                    <button onClick={() => { setEditingTracking(s.id); setTrackingInput(s.tracking_number || '') }}
                      style={{ padding: '4px 10px', background: 'none', border: '1px solid #e8e8e3', borderRadius: 6, fontSize: 11, color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>
                      {s.tracking_number ? '✏️ Modifier' : '+ Ajouter'}
                    </button>
                  </div>
                )}
              </div>

              <ProgressSteps status={s.status} />
            </div>
          )
        })}
        {shipments.length === 0 && (
          <div style={box}>
            <EmptyState icon="🚢" title="Aucune expédition en cours" subtitle="Créez une expédition pour suivre vos envois fournisseurs" />
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, padding: '14px 18px', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>💡 Suivi en temps réel</div>
        <div style={{ fontSize: 12, color: '#1e3a5f' }}>
          Renseignez votre numéro de suivi et cliquez dessus pour être redirigé vers le site du transporteur (DHL, FedEx, UPS, CMA CGM, Maersk, MSC, etc.) et voir le statut en temps réel de votre expédition.
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouvelle expédition">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Référence</label>
              <input style={inp} type="text" placeholder="Auto-généré si vide" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Transporteur *</label>
              <select style={inp} value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })}>
                {Object.entries(CARRIERS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Numéro de suivi</label>
            <input style={{ ...inp, fontFamily: 'monospace' }} type="text" placeholder="Ex: 1234567890, CMAU1234567..." value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Origine *</label>
              <input style={inp} type="text" placeholder="Shenzhen, Chine" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} required />
            </div>
            <div>
              <label style={lbl}>Destination *</label>
              <input style={inp} type="text" placeholder="Amazon FBA FR" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Unités *</label>
              <input style={inp} type="number" min="1" value={form.items} onChange={e => setForm({ ...form, items: e.target.value })} required />
            </div>
            <div>
              <label style={lbl}>Statut</label>
              <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>ETA</label>
              <input style={inp} type="date" value={form.eta} onChange={e => setForm({ ...form, eta: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: saving ? '#9ca3af' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Création...' : "Créer l'expédition"}
          </button>
        </form>
      </Modal>
    </div>
  )
}
