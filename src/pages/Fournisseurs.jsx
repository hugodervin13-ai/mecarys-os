import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { box, inp, lbl, colors } from '../lib/theme'
import { KpiCard, EmptyState, PageHeader } from '../components/ui'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import { listSuppliers, createSupplier, removeSupplier } from '../lib/suppliersRepo'
import { toast } from '../lib/store'

const COUNTRY_FLAGS = {
  'Chine': '🇨🇳', 'China': '🇨🇳', 'Inde': '🇮🇳', 'India': '🇮🇳',
  'Turquie': '🇹🇷', 'Turkey': '🇹🇷', 'Vietnam': '🇻🇳', 'Bangladesh': '🇧🇩',
  'France': '🇫🇷', 'Allemagne': '🇩🇪', 'Germany': '🇩🇪', 'Italie': '🇮🇹',
  'Espagne': '🇪🇸', 'Maroc': '🇲🇦', 'Portugal': '🇵🇹', 'Thaïlande': '🇹🇭',
  'Indonésie': '🇮🇩', 'Pakistan': '🇵🇰', 'Cambodge': '🇰🇭',
}

const emptyForm = { name: '', country: '', contact_email: '', phone: '', notes: '', status: 'active' }

export default function Fournisseurs() {
  const { user } = useStore()
  const uid = user?.id
  const [suppliers, setSuppliers] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [synced, setSynced] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    let alive = true
    listSuppliers(uid).then(({ data, synced }) => {
      if (!alive) return
      setSuppliers(data)
      setSynced(synced)
      setLoaded(true)
    })
    return () => { alive = false }
  }, [uid])

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true) }
  const openEdit = (s) => {
    setForm({ name: s.name || '', country: s.country || '', contact_email: s.contact_email || '', phone: s.phone || '', notes: s.notes || '', status: s.status || 'active' })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingId) {
      // Modification locale uniquement (pas de updateSupplier dans supabase.js — on met à jour local)
      setSuppliers(prev => {
        const next = prev.map(s => s.id === editingId ? { ...s, ...form } : s)
        try { localStorage.setItem(`mecarys.suppliers.${uid}`, JSON.stringify(next)) } catch { /* ignore */ }
        return next
      })
      toast('Fournisseur mis à jour', 'success')
    } else {
      const next = await createSupplier(uid, form)
      setSuppliers(next)
      toast('Fournisseur ajouté', 'success')
    }
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce fournisseur ?')) return
    const next = await removeSupplier(uid, id)
    setSuppliers(next)
    toast('Fournisseur supprimé', 'success')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return suppliers
      .filter(s => filterStatus === 'all' || s.status === filterStatus)
      .filter(s => !q || [s.name, s.country, s.contact_email].some(v => (v || '').toLowerCase().includes(q)))
  }, [suppliers, filterStatus, search])

  const active = suppliers.filter(s => s.status === 'active').length
  const inactive = suppliers.length - active
  const countriesCount = new Set(suppliers.map(s => s.country).filter(Boolean)).size

  if (!loaded) return <Loading />

  return (
    <div>
      <PageHeader title="Fournisseurs" subtitle="Gérez votre carnet de fournisseurs et leurs coordonnées">
        <button onClick={openCreate} style={{ padding: '10px 20px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter un fournisseur
        </button>
      </PageHeader>

      <div style={{ marginBottom: 16, fontSize: 12, color: synced ? colors.success : colors.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: synced ? colors.success : '#cbd5e1' }} />
        {synced ? 'Synchronisé avec la base' : 'Sauvegarde locale active'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total" value={suppliers.length} icon="🏭" color={colors.primary} sub="Dans votre carnet" />
        <KpiCard label="Actifs" value={active} icon="✅" color={colors.success} sub="En activité" />
        <KpiCard label="Inactifs" value={inactive} icon="💤" color={colors.textFaint} sub="Archivés" />
        <KpiCard label="Pays" value={countriesCount} icon="🌍" color={colors.info} sub="Diversification" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...inp, maxWidth: 260 }} placeholder="🔍 Nom, pays, email…" value={search} onChange={e => setSearch(e.target.value)} />
        {[['all', `Tous (${suppliers.length})`], ['active', `✅ Actifs (${active})`], ['inactive', `💤 Inactifs (${inactive})`]].map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filterStatus === val ? colors.primary : '#e8e8e3'}`, background: filterStatus === val ? colors.primary : '#fff', color: filterStatus === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(s => (
          <div key={s.id} style={{ ...box, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: `${colors.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {COUNTRY_FLAGS[s.country] || '🏭'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{s.country || 'Pays non renseigné'}</div>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: s.status === 'active' ? '#10b98115' : '#9ca3af15', color: s.status === 'active' ? colors.success : colors.textFaint, border: `1px solid ${s.status === 'active' ? '#10b98130' : '#9ca3af30'}`, flexShrink: 0 }}>
                {s.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '1px solid #f0f0eb' }}>
              {s.contact_email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>✉️</span>
                  <a href={`mailto:${s.contact_email}`} style={{ fontSize: 12, color: colors.primary, textDecoration: 'none', fontWeight: 500 }}>{s.contact_email}</a>
                </div>
              )}
              {s.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📞</span>
                  <span style={{ fontSize: 12, color: colors.textMuted }}>{s.phone}</span>
                </div>
              )}
              {s.notes && (
                <div style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 }}>📝 {s.notes}</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button onClick={() => openEdit(s)} style={{ fontSize: 12, color: colors.primary, background: 'none', border: `1px solid ${colors.primary}30`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>
                ✏️ Modifier
              </button>
              <button onClick={() => handleDelete(s.id)} style={{ fontSize: 12, color: colors.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Supprimer
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', ...box }}>
            <EmptyState icon="🏭"
              title={suppliers.length === 0 ? 'Aucun fournisseur' : 'Aucun résultat'}
              subtitle={suppliers.length === 0 ? 'Ajoutez vos fournisseurs pour centraliser leurs coordonnées.' : 'Aucun fournisseur ne correspond à votre recherche.'}
              action={suppliers.length === 0 ? (
                <button onClick={openCreate} style={{ padding: '10px 20px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  + Ajouter un fournisseur
                </button>
              ) : null}
            />
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Nom du fournisseur *</label>
            <input style={inp} type="text" placeholder="Ex: Shenzhen Electronics Co." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Pays</label>
              <input style={inp} type="text" placeholder="Ex: Chine" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Statut</label>
              <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Email de contact</label>
              <input style={inp} type="email" placeholder="contact@supplier.com" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Téléphone</label>
              <input style={inp} type="text" placeholder="+86 755 ..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" style={{ width: '100%', padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {editingId ? 'Enregistrer les modifications' : 'Ajouter le fournisseur'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
