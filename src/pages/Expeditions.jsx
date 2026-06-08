import { useEffect, useState } from 'react'
import { getShipments, addShipment, deleteShipment, updateShipment } from '../lib/supabase'
import { useStore } from '../lib/store'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }
const inp = { width: '100%', padding: '9px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, display: 'block' }

const STATUS = {
  production: { label: 'Production',   color: '#6366f1', icon: '🏭' },
  transit:    { label: 'En transit',   color: '#3b82f6', icon: '🚢' },
  customs:    { label: 'En douane',    color: '#f59e0b', icon: '🛃' },
  warehouse:  { label: 'Entrepot',     color: '#10b981', icon: '🏬' },
  delivered:  { label: 'Livre',        color: '#10b981', icon: '✅' },
  fba:        { label: 'Amazon FBA',   color: '#10b981', icon: '📦' },
}

const STEPS = ['production', 'transit', 'customs', 'warehouse', 'fba']

const mockShipments = [
  { id: 'm1', reference: 'EXP-2024-001', origin: 'Shenzhen, Chine', destination: 'Amazon FBA FR', status: 'transit', carrier: 'DHL', eta: '2024-05-20', items: 500 },
  { id: 'm2', reference: 'EXP-2024-002', origin: 'Guangzhou, Chine', destination: 'Amazon FBA DE', status: 'customs', carrier: 'FedEx', eta: '2024-05-18', items: 300 },
  { id: 'm3', reference: 'EXP-2024-003', origin: 'Istanbul, Turquie', destination: 'Amazon FBA FR', status: 'fba', carrier: 'TNT', eta: '2024-05-10', items: 200 },
]

const emptyForm = { reference: '', origin: '', destination: '', carrier: '', items: '', status: 'transit', eta: '' }

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

export default function Expeditions() {
  const { user } = useStore()
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [useMock, setUseMock] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const { data, error } = await getShipments(user.id)
    if (error || !data || data.length === 0) {
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
      setShipments(prev => [...prev, { ...shipmentData, id: `m${Date.now()}` }])
    } else {
      await addShipment(user.id, shipmentData)
      await loadData()
    }
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
  }

  const handleStatusChange = async (id, newStatus) => {
    if (useMock || String(id).startsWith('m')) {
      setShipments(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
    } else {
      await updateShipment(id, { status: newStatus })
      loadData()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette expedition ?')) return
    if (useMock || String(id).startsWith('m')) {
      setShipments(prev => prev.filter(s => s.id !== id))
    } else {
      await deleteShipment(id)
      loadData()
    }
  }

  const inTransit = shipments.filter(s => s.status === 'transit' || s.status === 'customs' || s.status === 'production').length
  const inCustoms = shipments.filter(s => s.status === 'customs').length
  const delivered = shipments.filter(s => s.status === 'delivered' || s.status === 'fba').length
  const totalItems = shipments.filter(s => s.status !== 'delivered' && s.status !== 'fba').reduce((a, s) => a + (s.items || 0), 0)

  if (loading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Expeditions</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Suivez vos envois fournisseurs jusqu'aux entrepots Amazon FBA</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Nouvelle expedition
        </button>
      </div>

      {inCustoms > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🛃</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{inCustoms} expedition{inCustoms > 1 ? 's' : ''} bloquee{inCustoms > 1 ? 's' : ''} en douane</div>
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>Verifiez la documentation douaniere et contactez votre transitaire</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'En cours', value: inTransit, icon: '🚢', color: '#3b82f6', sub: 'En route vers FBA' },
          { label: 'En douane', value: inCustoms, icon: '🛃', color: inCustoms > 0 ? '#f59e0b' : '#10b981', sub: inCustoms > 0 ? 'Attention requise' : 'Aucun blocage' },
          { label: 'Livrees', value: delivered, icon: '✅', color: '#10b981', sub: 'Dans les entrepots' },
          { label: 'Unites en transit', value: totalItems.toLocaleString(), icon: '📦', color: '#6366f1', sub: 'Unites en chemin' },
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {shipments.map(s => {
          const st = STATUS[s.status] || STATUS.transit
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
                      {s.origin} → {s.destination} · {s.carrier} · <strong>{s.items} unites</strong>
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
              <ProgressSteps status={s.status} />
            </div>
          )
        })}
        {shipments.length === 0 && (
          <div style={{ ...box, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚢</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Aucune expedition en cours</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Creez une expedition pour suivre vos envois fournisseurs</div>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouvelle expedition">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Reference</label>
              <input style={inp} type="text" placeholder="Auto-genere si vide" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Transporteur *</label>
              <input style={inp} type="text" placeholder="DHL, FedEx, TNT..." value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} required />
            </div>
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
              <label style={lbl}>Unites *</label>
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
            {saving ? 'Creation...' : "Creer l'expedition"}
          </button>
        </form>
      </Modal>
    </div>
  )
}
