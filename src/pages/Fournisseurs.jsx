import { useEffect, useState } from 'react'
import { getSuppliers, addSupplier, deleteSupplier } from '../lib/supabase'
import { useStore, toast } from '../lib/store'
import { mutate } from '../lib/useData'
import { box, inp, lbl } from '../lib/theme'
import { DemoBadge, KpiCard, EmptyState } from '../components/ui'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const COUNTRY_FLAGS = {
  'Chine': '🇨🇳', 'China': '🇨🇳',
  'Inde': '🇮🇳', 'India': '🇮🇳',
  'Turquie': '🇹🇷', 'Turkey': '🇹🇷',
  'Vietnam': '🇻🇳',
  'Bangladesh': '🇧🇩',
  'France': '🇫🇷',
  'Allemagne': '🇩🇪', 'Germany': '🇩🇪',
}

const mockSuppliers = [
  { id: 'm1', name: 'Shenzhen Electronics Co.', country: 'Chine', contact_email: 'contact@shenzhen-elec.com', phone: '+86 755 1234 5678', status: 'active', created_at: '2024-04-15' },
  { id: 'm2', name: 'Guangzhou Trading Ltd.', country: 'Chine', contact_email: 'sales@gz-trading.com', phone: '+86 20 8765 4321', status: 'active', created_at: '2024-03-20' },
  { id: 'm3', name: 'Istanbul Packaging', country: 'Turquie', contact_email: 'info@ist-pack.com', phone: '+90 212 555 0000', status: 'inactive', created_at: '2024-01-10' },
]

export default function Fournisseurs() {
  const { user } = useStore()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [form, setForm] = useState({ name: '', country: '', contact_email: '', phone: '', status: 'active' })
  const [useMock, setUseMock] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const { data, error } = await getSuppliers(user.id)
    if (error || !data || data.length === 0) {
      if (error) toast(`Erreur de chargement : ${error.message || 'réessayez plus tard'}`)
      setSuppliers(mockSuppliers)
      setUseMock(true)
    } else {
      setSuppliers(data)
      setUseMock(false)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    if (useMock) {
      setSuppliers(prev => [...prev, { ...form, id: `m${Date.now()}`, created_at: new Date().toISOString() }])
    } else {
      const ok = await mutate(() => addSupplier(user.id, form), 'suppliers')
      if (ok) await loadData()
    }
    setForm({ name: '', country: '', contact_email: '', phone: '', status: 'active' })
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce fournisseur ?')) return
    if (useMock || String(id).startsWith('m')) {
      setSuppliers(prev => prev.filter(s => s.id !== id))
    } else {
      const ok = await mutate(() => deleteSupplier(id), 'suppliers')
      if (ok) loadData()
    }
  }

  const filtered = filterStatus === 'all' ? suppliers : suppliers.filter(s => s.status === filterStatus)
  const active = suppliers.filter(s => s.status === 'active').length
  const countries = new Set(suppliers.map(s => s.country)).size

  if (loading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Fournisseurs</h1>
            {useMock && <DemoBadge />}
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Gérez votre carnet de fournisseurs et leurs coordonnées</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter un fournisseur
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total fournisseurs" value={suppliers.length} icon="🏭" color="#6366f1" sub="Dans votre carnet" />
        <KpiCard label="Fournisseurs actifs" value={active} icon="✅" color="#10b981" sub="En activité" />
        <KpiCard label="Inactifs" value={suppliers.length - active} icon="💤" color="#9ca3af" sub="Archivés" />
        <KpiCard label="Pays" value={countries} icon="🌍" color="#3b82f6" sub="Diversification" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['all', `Tous (${suppliers.length})`], ['active', `✅ Actifs (${active})`], ['inactive', `💤 Inactifs (${suppliers.length - active})`]].map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filterStatus === val ? '#6366f1' : '#e8e8e3'}`, background: filterStatus === val ? '#6366f1' : '#fff', color: filterStatus === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {filtered.map(s => (
          <div key={s.id} style={{ ...box, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: '#6366f115', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  {COUNTRY_FLAGS[s.country] || '🏭'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.country}</div>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: s.status === 'active' ? '#10b98115' : '#9ca3af15', color: s.status === 'active' ? '#10b981' : '#9ca3af', border: `1px solid ${s.status === 'active' ? '#10b98130' : '#9ca3af30'}` }}>
                {s.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid #f0f0eb' }}>
              {s.contact_email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>✉️</span>
                  <a href={`mailto:${s.contact_email}`} style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>{s.contact_email}</a>
                </div>
              )}
              {s.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📞</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{s.phone}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => handleDelete(s.id)}
                style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', ...box }}>
            <EmptyState icon="🏭" title="Aucun fournisseur" subtitle="Ajoutez vos fournisseurs pour centraliser leurs coordonnées" />
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouveau fournisseur">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Nom du fournisseur *</label>
            <input style={inp} type="text" placeholder="Ex: Shenzhen Electronics Co." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Pays *</label>
              <input style={inp} type="text" placeholder="Ex: Chine" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} required />
            </div>
            <div>
              <label style={lbl}>Statut</label>
              <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Email de contact *</label>
              <input style={inp} type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} required />
            </div>
            <div>
              <label style={lbl}>Téléphone</label>
              <input style={inp} type="text" placeholder="+86 755 ..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: saving ? '#9ca3af' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Ajout...' : 'Ajouter le fournisseur'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
