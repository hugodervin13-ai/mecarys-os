import { useEffect, useState } from 'react'
import { getOrders, addOrder, getProducts, deleteOrder, updateOrder } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency, formatDate } from '../lib/utils'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }
const inp = { width: '100%', padding: '9px 12px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, display: 'block' }

const STATUS = {
  pending:    { label: 'En attente',   color: '#f59e0b', bg: '#fef3c715' },
  production: { label: 'Production',   color: '#6366f1', bg: '#6366f115' },
  shipped:    { label: 'Expediee',     color: '#3b82f6', bg: '#3b82f615' },
  transit:    { label: 'En transit',   color: '#3b82f6', bg: '#3b82f615' },
  delivered:  { label: 'Livree',       color: '#10b981', bg: '#10b98115' },
  cancelled:  { label: 'Annulee',      color: '#9ca3af', bg: '#9ca3af15' },
}

const emptyForm = { order_number: '', supplier: '', product_id: '', quantity: '', cost_total: '', expected_delivery: '', status: 'pending' }

export default function Commandes() {
  const { user } = useStore()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const [ordersRes, productsRes] = await Promise.all([getOrders(user.id), getProducts(user.id)])
    setOrders(ordersRes.data || [])
    setProducts(productsRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const orderData = {
      order_number: form.order_number || `CMD-${Date.now().toString(36).toUpperCase()}`,
      supplier: form.supplier,
      quantity: Number(form.quantity),
      cost_total: Number(form.cost_total),
      status: form.status,
    }
    if (form.product_id) orderData.product_id = form.product_id
    if (form.expected_delivery) orderData.expected_delivery = form.expected_delivery
    await addOrder(user.id, orderData)
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const handleStatusChange = async (id, newStatus) => {
    await updateOrder(id, { status: newStatus })
    loadData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette commande ?')) return
    await deleteOrder(id)
    loadData()
  }

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)
  const pending = orders.filter(o => o.status === 'pending').length
  const transit = orders.filter(o => o.status === 'transit' || o.status === 'shipped').length
  const totalAmount = orders.reduce((a, o) => a + (o.cost_total || 0), 0)

  if (loading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Commandes Fournisseurs</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Suivez vos commandes de reapprovisionnement de A a Z</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Nouvelle commande
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total commandes', value: orders.length, icon: '📋', color: '#6366f1', sub: 'Toutes periodes' },
          { label: 'En attente', value: pending, icon: '⏳', color: '#f59e0b', sub: 'A confirmer' },
          { label: 'En transit', value: transit, icon: '🚢', color: '#3b82f6', sub: 'En route' },
          { label: 'Montant engage', value: formatCurrency(totalAmount), icon: '💳', color: '#10b981', sub: 'Total commandes' },
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

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['all', `Toutes (${orders.length})`], ...Object.entries(STATUS).map(([k, v]) => [k, `${v.label} (${orders.filter(o => o.status === k).length})`])].map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filterStatus === val ? '#6366f1' : '#e8e8e3'}`, background: filterStatus === val ? '#6366f1' : '#fff', color: filterStatus === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ ...box, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaf8' }}>
              {['N° commande', 'Fournisseur', 'Produit', 'Quantite', 'Montant', 'Statut', 'Livraison prevue', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => {
              const s = STATUS[order.status] || STATUS.pending
              return (
                <tr key={order.id} style={{ borderTop: '1px solid #f0f0eb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#1a1a2e', fontFamily: 'monospace' }}>{order.order_number}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{order.supplier}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{order.products?.name || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{order.quantity}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#6366f1' }}>{formatCurrency(order.cost_total || 0)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}
                      style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${s.color}40`, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>
                    {order.expected_delivery ? formatDate(order.expected_delivery) : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => handleDelete(order.id)}
                      style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Aucune commande</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Creez une commande pour suivre vos reapprovisionnements</div>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouvelle commande fournisseur">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>N° commande</label>
              <input style={inp} type="text" placeholder="Auto-genere si vide" value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Fournisseur *</label>
              <input style={inp} type="text" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} required />
            </div>
          </div>
          {products.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Produit associe</label>
              <select style={inp} value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
                <option value="">-- Selectionner un produit --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.asin})</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Quantite *</label>
              <input style={inp} type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required min="1" />
            </div>
            <div>
              <label style={lbl}>Montant total (€) *</label>
              <input style={inp} type="number" step="0.01" value={form.cost_total} onChange={e => setForm({ ...form, cost_total: e.target.value })} required min="0" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Statut initial</label>
              <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Livraison prevue</label>
              <input style={inp} type="date" value={form.expected_delivery} onChange={e => setForm({ ...form, expected_delivery: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: saving ? '#9ca3af' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creation...' : 'Creer la commande'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
