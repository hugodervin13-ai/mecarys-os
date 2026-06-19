import { useEffect, useMemo, useState } from 'react'
import { useStore, toast } from '../lib/store'
import { getProducts } from '../lib/supabase'
import { box, inp, lbl, colors } from '../lib/theme'
import { KpiCard, EmptyState, PageHeader } from '../components/ui'
import { formatCurrency, formatDate } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import { listOrders, createOrder, patchOrder, removeOrder, autoOrderRef } from '../lib/ordersRepo'
import { listSuppliers } from '../lib/suppliersRepo'

const STATUS = {
  pending:       { label: 'En attente',        color: '#f59e0b', icon: '⏳' },
  production:    { label: 'En production',     color: '#6366f1', icon: '🏭' },
  shipped:       { label: 'Expédiée',          color: '#3b82f6', icon: '📤' },
  transit_boat:  { label: 'Transit bateau',    color: '#0ea5e9', icon: '🚢' },
  transit_truck: { label: 'Transit camion',    color: '#f59e0b', icon: '🚚' },
  customs:       { label: 'En douane',         color: '#f97316', icon: '🛃' },
  delivered:     { label: 'Livrée',            color: '#10b981', icon: '✅' },
  cancelled:     { label: 'Annulée',           color: '#9ca3af', icon: '❌' },
}

const ACTIVE_STATUSES = ['pending', 'production', 'shipped', 'transit_boat', 'transit_truck', 'customs']

const emptyForm = {
  order_number: '', supplier: '', product_id: '', product_name: '',
  quantity: '', cost_total: '', expected_delivery: '', notes: '', status: 'pending',
}

function isLate(order) {
  if (!order.expected_delivery) return false
  if (!ACTIVE_STATUSES.includes(order.status)) return false
  return new Date(order.expected_delivery) < new Date()
}

export default function Commandes() {
  const { user } = useStore()
  const uid = user?.id
  const [orders, setOrders] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [synced, setSynced] = useState(false)
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedNotes, setExpandedNotes] = useState(null)

  useEffect(() => {
    let alive = true
    listOrders(uid).then(({ data, synced }) => {
      if (!alive) return
      setOrders(data)
      setSynced(synced)
      setLoaded(true)
    })
    getProducts(uid).then(({ data }) => alive && setProducts(data || [])).catch(() => {})
    listSuppliers(uid).then(({ data }) => alive && setSuppliers(data || [])).catch(() => {})
    return () => { alive = false }
  }, [uid])

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true) }
  const openEdit = (o) => {
    setForm({
      order_number: o.order_number || '', supplier: o.supplier || '',
      product_id: o.product_id || '', product_name: o.product_name || '',
      quantity: o.quantity || '', cost_total: o.cost_total || '',
      expected_delivery: o.expected_delivery || '', notes: o.notes || '',
      status: o.status || 'pending',
    })
    setEditingId(o.id)
    setShowForm(true)
  }

  const onPickProduct = (id) => {
    const p = products.find(p => p.id === id)
    setForm(f => ({ ...f, product_id: id, product_name: p?.name || '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...form,
      order_number: form.order_number?.trim() || autoOrderRef(),
      quantity: form.quantity === '' ? '' : Number(form.quantity),
      cost_total: form.cost_total === '' ? '' : Number(form.cost_total),
    }
    if (editingId) {
      const next = await patchOrder(uid, editingId, data)
      setOrders(next); toast('Commande mise à jour', 'success')
    } else {
      const next = await createOrder(uid, data)
      setOrders(next); toast('Commande créée', 'success')
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm)
  }

  const handleStatusChange = async (id, status) => {
    const next = await patchOrder(uid, id, { status })
    setOrders(next)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette commande ?')) return
    const next = await removeOrder(uid, id)
    setOrders(next); toast('Commande supprimée', 'success')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders
      .filter(o => filterStatus === 'all' || o.status === filterStatus)
      .filter(o => !q || [o.order_number, o.supplier, o.product_name].some(v => (v || '').toLowerCase().includes(q)))
  }, [orders, filterStatus, search])

  const pending = orders.filter(o => o.status === 'pending').length
  const inTransit = orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length
  const totalAmount = orders.reduce((a, o) => a + (Number(o.cost_total) || 0), 0)
  const delivered = orders.filter(o => o.status === 'delivered').length
  const lateCount = orders.filter(isLate).length

  if (!loaded) return <Loading />

  return (
    <div>
      <PageHeader title="Commandes Fournisseurs" subtitle="Suivez vos commandes de réapprovisionnement de A à Z">
        <button onClick={openCreate} style={{ padding: '10px 20px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Nouvelle commande
        </button>
      </PageHeader>

      <div style={{ marginBottom: 16, fontSize: 12, color: synced ? colors.success : colors.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: synced ? colors.success : '#cbd5e1' }} />
        {synced ? 'Synchronisé avec la base' : 'Sauvegarde locale active'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total commandes" value={orders.length} icon="📋" color={colors.primary} sub="Toutes périodes" />
        <KpiCard label="En attente" value={pending} icon="⏳" color={colors.warning} sub="À confirmer" />
        <KpiCard label="En transit" value={inTransit} icon="🚢" color={colors.info} sub="En route" />
        <KpiCard label="Livrées" value={delivered} icon="✅" color={colors.success} sub="Complétées" />
        {lateCount > 0 && (
          <KpiCard label="En retard" value={lateCount} icon="🚨" color={colors.danger} sub="Délai dépassé" />
        )}
        <KpiCard label="Montant engagé" value={formatCurrency(totalAmount)} icon="💳" color="#10b981" sub="Total commandes" />
      </div>

      <div style={{ ...box, padding: 14, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input style={{ ...inp, flex: '2 1 200px' }} placeholder="🔍 N° commande, fournisseur, produit…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inp, flex: '1 1 150px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        {(search || filterStatus !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterStatus('all') }}
            style={{ padding: '9px 14px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, fontSize: 12, color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>
            Réinitialiser
          </button>
        )}
      </div>

      <div style={{ ...box, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#fafaf8' }}>
                {['N° commande', 'Fournisseur', 'Produit', 'Qté', 'Montant', 'P.U.', 'Statut', 'Livraison', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const s = STATUS[order.status] || STATUS.pending
                const late = isLate(order)
                const qty = Number(order.quantity) || 0
                const total = Number(order.cost_total) || 0
                const unitCost = qty > 0 ? total / qty : null
                const hasNotes = !!order.notes
                return (
                  <>
                    <tr key={order.id} style={{ borderTop: '1px solid #f0f0eb', background: late ? '#fef2f2' : '' }}
                      onMouseEnter={e => !late && (e.currentTarget.style.background = '#fafaf8')}
                      onMouseLeave={e => e.currentTarget.style.background = late ? '#fef2f2' : ''}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>{order.order_number}</div>
                        {hasNotes && (
                          <button onClick={() => setExpandedNotes(expandedNotes === order.id ? null : order.id)}
                            style={{ fontSize: 11, color: colors.textFaint, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
                            {expandedNotes === order.id ? '▲ masquer' : '📝 notes'}
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: colors.text }}>{order.supplier || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: colors.textMuted }}>{order.product_name || order.products?.name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: colors.text }}>{order.quantity || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: colors.primary, whiteSpace: 'nowrap' }}>{formatCurrency(total)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap' }}>
                        {unitCost !== null ? formatCurrency(unitCost) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}
                            style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${s.color}40`, background: `${s.color}15`, color: s.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                          </select>
                          {late && <span style={{ fontSize: 10, fontWeight: 700, color: colors.danger }}>🚨 En retard</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: late ? colors.danger : colors.textMuted, fontWeight: late ? 700 : 400, whiteSpace: 'nowrap' }}>
                        {order.expected_delivery ? formatDate(order.expected_delivery) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(order)} style={{ fontSize: 12, color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginRight: 10 }}>✏️ Modifier</button>
                        <button onClick={() => handleDelete(order.id)} style={{ fontSize: 12, color: colors.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
                      </td>
                    </tr>
                    {expandedNotes === order.id && (
                      <tr key={`${order.id}-notes`} style={{ background: '#fffbeb' }}>
                        <td colSpan={9} style={{ padding: '8px 16px 12px', fontSize: 12, color: colors.textMuted, fontStyle: 'italic', borderTop: '1px dashed #fde68a' }}>
                          📝 {order.notes}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState icon="📋"
            title={orders.length === 0 ? 'Aucune commande' : 'Aucun résultat'}
            subtitle={orders.length === 0 ? 'Créez une commande pour suivre vos réapprovisionnements.' : 'Aucune commande ne correspond à votre recherche / filtre.'}
            action={orders.length === 0 ? (
              <button onClick={openCreate} style={{ padding: '10px 20px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nouvelle commande</button>
            ) : null}
          />
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Modifier la commande' : 'Nouvelle commande fournisseur'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>N° commande</label>
              <input style={inp} type="text" placeholder="Auto si vide" value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Fournisseur *</label>
              {suppliers.length > 0 ? (
                <select style={inp} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} required>
                  <option value="">— Sélectionner un fournisseur —</option>
                  {suppliers.filter(s => s.status === 'active').map(s => (
                    <option key={s.id} value={s.name}>{COUNTRY_FLAGS_INLINE[s.country] || '🏭'} {s.name}</option>
                  ))}
                  {suppliers.some(s => s.status !== 'active') && (
                    <>
                      <option disabled>── Inactifs ──</option>
                      {suppliers.filter(s => s.status !== 'active').map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </>
                  )}
                  <option value="__other__">✏️ Autre (saisie libre)</option>
                </select>
              ) : (
                <input style={inp} type="text" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} required />
              )}
              {form.supplier === '__other__' && (
                <input style={{ ...inp, marginTop: 6 }} type="text" placeholder="Nom du fournisseur" onChange={e => setForm({ ...form, supplier: e.target.value })} autoFocus />
              )}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Produit associé</label>
            {products.length > 0 ? (
              <select style={inp} value={form.product_id} onChange={e => onPickProduct(e.target.value)}>
                <option value="">— Sélectionner un produit —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.asin})</option>)}
              </select>
            ) : (
              <input style={inp} type="text" placeholder="Nom du produit" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Quantité *</label>
              <input style={inp} type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div>
              <label style={lbl}>Montant total (€) *</label>
              <input style={inp} type="number" step="0.01" min="0" value={form.cost_total} onChange={e => setForm({ ...form, cost_total: e.target.value })} required />
            </div>
          </div>
          {form.quantity > 0 && form.cost_total > 0 && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: `${colors.primary}08`, borderRadius: 8, fontSize: 12, color: colors.textMuted }}>
              💡 Coût unitaire : <strong style={{ color: colors.primary }}>{formatCurrency(Number(form.cost_total) / Number(form.quantity))}</strong>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Statut</label>
              <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Livraison prévue</label>
              <input style={inp} type="date" value={form.expected_delivery} onChange={e => setForm({ ...form, expected_delivery: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" style={{ width: '100%', padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {editingId ? 'Enregistrer les modifications' : 'Créer la commande'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

const COUNTRY_FLAGS_INLINE = {
  'Chine': '🇨🇳', 'China': '🇨🇳', 'Inde': '🇮🇳', 'India': '🇮🇳',
  'Turquie': '🇹🇷', 'Turkey': '🇹🇷', 'Vietnam': '🇻🇳', 'Bangladesh': '🇧🇩',
  'France': '🇫🇷', 'Allemagne': '🇩🇪', 'Germany': '🇩🇪', 'Italie': '🇮🇹',
  'Espagne': '🇪🇸', 'Maroc': '🇲🇦', 'Portugal': '🇵🇹', 'Thaïlande': '🇹🇭',
  'Indonésie': '🇮🇩', 'Pakistan': '🇵🇰', 'Cambodge': '🇰🇭',
}
