import { useState } from 'react'
import { getReviews, addReview, updateReview, deleteReview, getReturns, addReturn, deleteReturn, getProducts } from '../lib/supabase'
import { useStore } from '../lib/store'
import { useData, mutate } from '../lib/useData'
import { formatCurrency } from '../lib/utils'
import { box, inp, lbl } from '../lib/theme'
import { DemoBadge } from '../components/ui'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const TEMPLATES = {
  1: "Bonjour, nous vous présentons nos sincères excuses pour cette expérience négative. La qualité de nos produits est notre priorité. Nous vous proposons un remboursement intégral ou un remplacement immédiat. Merci de nous contacter en message privé.",
  2: "Bonjour, nous sommes vraiment désolés que notre produit ne soit pas à la hauteur de vos attentes. Votre satisfaction est essentielle. Nous prenons ce retour très au sérieux pour améliorer notre qualité.",
  3: "Bonjour, merci pour votre retour. Nous avons pris note de votre remarque et travaillons activement à améliorer notre qualité. N'hésitez pas à nous contacter directement pour que nous puissions vous aider.",
}

const EMPTY_REVIEW = { product_id: '', author: '', rating: '1', title: '', content: '', review_date: new Date().toISOString().slice(0, 10) }
const EMPTY_RETURN = { product_id: '', reason: '', quantity: '1', cost: '', return_date: new Date().toISOString().slice(0, 10), notes: '' }

function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: 13, color: s <= rating ? '#f59e0b' : '#e5e7eb' }}>★</span>
      ))}
    </div>
  )
}

export default function QualiteSAV() {
  const { user } = useStore()
  const { data: reviewsData, loading: reviewsLoading, reload: reloadReviews } = useData('reviews', () => getReviews(user.id), [user])
  const { data: returnsData, loading: returnsLoading, reload: reloadReturns } = useData('returns', () => getReturns(user.id), [user])
  const { data: productsData } = useData('products', () => getProducts(user.id), [user])

  const reviews = reviewsData || []
  const returns = returnsData || []
  const products = productsData || []
  const useMock = reviews.length === 0 && returns.length === 0

  const [tab, setTab] = useState('reviews')
  const [showTemplate, setShowTemplate] = useState(null)
  const [showAddReview, setShowAddReview] = useState(false)
  const [showAddReturn, setShowAddReturn] = useState(false)
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW)
  const [returnForm, setReturnForm] = useState(EMPTY_RETURN)
  const [saving, setSaving] = useState(false)

  const pending = reviews.filter(r => !r.responded)
  const totalReturnCost = returns.reduce((a, r) => a + (Number(r.cost) || 0), 0)
  const totalReturnQty = returns.reduce((a, r) => a + (Number(r.quantity) || 0), 0)

  const handleAddReview = async (e) => {
    e.preventDefault()
    setSaving(true)
    const d = { ...reviewForm, rating: Number(reviewForm.rating) }
    if (!d.product_id) delete d.product_id
    const ok = await mutate(() => addReview(user.id, d), 'reviews', 'Avis ajouté')
    setSaving(false)
    if (ok) { setShowAddReview(false); setReviewForm(EMPTY_REVIEW); reloadReviews() }
  }

  const handleAddReturn = async (e) => {
    e.preventDefault()
    setSaving(true)
    const d = { ...returnForm, quantity: Number(returnForm.quantity), cost: Number(returnForm.cost) || 0 }
    if (!d.product_id) delete d.product_id
    const ok = await mutate(() => addReturn(user.id, d), 'returns', 'Retour ajouté')
    setSaving(false)
    if (ok) { setShowAddReturn(false); setReturnForm(EMPTY_RETURN); reloadReturns() }
  }

  const handleMarkResponded = async (id) => {
    const ok = await mutate(() => updateReview(id, { responded: true }), 'reviews', 'Marqué comme traité')
    if (ok) reloadReviews()
  }

  const handleDeleteReview = async (id) => {
    if (!confirm('Supprimer cet avis ?')) return
    const ok = await mutate(() => deleteReview(id), 'reviews', 'Avis supprimé')
    if (ok) reloadReviews()
  }

  const handleDeleteReturn = async (id) => {
    if (!confirm('Supprimer ce retour ?')) return
    const ok = await mutate(() => deleteReturn(id), 'returns', 'Retour supprimé')
    if (ok) reloadReturns()
  }

  if (reviewsLoading || returnsLoading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Qualité & SAV</h1>
            {useMock && <DemoBadge />}
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Surveillez vos avis négatifs et gérez vos retours pour protéger votre BSR</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setReviewForm(EMPTY_REVIEW); setShowAddReview(true) }}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Ajouter un avis
          </button>
          <button onClick={() => { setReturnForm(EMPTY_RETURN); setShowAddReturn(true) }}
            style={{ background: '#fff', color: '#6366f1', border: '1px solid #6366f1', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Ajouter un retour
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{pending.length} avis négatif{pending.length > 1 ? 's' : ''} en attente de traitement</div>
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>Les avis négatifs non traités impactent directement votre taux de conversion et votre BSR</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Avis négatifs', value: reviews.length, icon: '💬', color: '#ef4444', sub: `${pending.length} à traiter` },
          { label: 'Retours', value: returns.length, icon: '↩️', color: '#f59e0b', sub: `${totalReturnQty} unités retournées` },
          { label: 'Note moyenne', value: reviews.length > 0 ? (reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1) : '-', icon: '⭐', color: '#3b82f6', sub: reviews.length > 0 ? `Sur ${reviews.length} avis` : 'Aucun avis' },
          { label: 'Coût des retours', value: formatCurrency(totalReturnCost), icon: '💸', color: '#ef4444', sub: 'Total cumulé' },
        ].map(k => (
          <div key={k.label} style={{ ...box, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</p>
                <p style={{ fontSize: 11, color: k.color, marginTop: 4, fontWeight: 500 }}>{k.sub}</p>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[['reviews', `💬 Avis (${reviews.length})`], ['returns', `↩️ Retours (${returns.length})`]].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            style={{ padding: '7px 18px', borderRadius: 8, border: `1px solid ${tab === val ? '#6366f1' : '#e8e8e3'}`, background: tab === val ? '#6366f1' : '#fff', color: tab === val ? '#fff' : '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.length === 0 ? (
            <div style={{ ...box, padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Aucun avis enregistré</div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>Ajoutez vos avis négatifs pour les suivre et y répondre</div>
            </div>
          ) : reviews.map(r => (
            <div key={r.id} style={{ ...box, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Stars rating={r.rating} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{r.products?.name || r.title || 'Produit'}</span>
                  {r.products?.asin && <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{r.products.asin}</span>}
                  {r.author && <span style={{ fontSize: 11, color: '#9ca3af' }}>par {r.author}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{r.review_date}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: r.responded ? '#10b98115' : '#f59e0b15', color: r.responded ? '#10b981' : '#f59e0b', border: `1px solid ${r.responded ? '#10b98130' : '#f59e0b30'}` }}>
                    {r.responded ? '✓ Traité' : 'À traiter'}
                  </span>
                </div>
              </div>
              {(r.content || r.title) && (
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 14, padding: '10px 14px', background: '#fafaf8', borderRadius: 8, borderLeft: '3px solid #e8e8e3' }}>
                  "{r.content || r.title}"
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {!r.responded && (
                  <>
                    <button onClick={() => setShowTemplate(showTemplate === r.id ? null : r.id)}
                      style={{ padding: '7px 14px', borderRadius: 8, background: '#6366f115', border: '1px solid #6366f130', color: '#6366f1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      📝 Modèle réponse
                    </button>
                    <button onClick={() => handleMarkResponded(r.id)}
                      style={{ padding: '7px 14px', borderRadius: 8, background: '#10b98115', border: '1px solid #10b98130', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✓ Marquer traité
                    </button>
                  </>
                )}
                {r.products?.asin && (
                  <a href={`https://www.amazon.fr/dp/${r.products.asin}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '7px 14px', borderRadius: 8, background: '#f0f0eb', border: '1px solid #e8e8e3', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                    🔗 Amazon
                  </a>
                )}
                <button onClick={() => handleDeleteReview(r.id)}
                  style={{ padding: '7px 14px', borderRadius: 8, background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
                  Suppr.
                </button>
              </div>
              {showTemplate === r.id && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: '#f0f7ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Modèle de réponse</div>
                  <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{TEMPLATES[r.rating] || TEMPLATES[1]}</p>
                  <button onClick={() => navigator.clipboard?.writeText(TEMPLATES[r.rating] || TEMPLATES[1])}
                    style={{ marginTop: 8, padding: '5px 12px', borderRadius: 6, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Copier
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'returns' && (
        <div>
          {returns.length === 0 ? (
            <div style={{ ...box, padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>↩️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Aucun retour enregistré</div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>Ajoutez vos retours pour suivre le coût et les raisons</div>
            </div>
          ) : (
            <>
              <div style={{ ...box, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafaf8' }}>
                      {['Produit', 'Raison', 'Quantité', 'Coût', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map(r => (
                      <tr key={r.id} style={{ borderTop: '1px solid #f0f0eb' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{r.products?.name || 'Produit'}</div>
                          {r.products?.asin && <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{r.products.asin}</div>}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: 13, color: '#374151' }}>{r.reason || '-'}</td>
                        <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{r.quantity}</td>
                        <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 700, color: '#ef4444' }}>{formatCurrency(r.cost || 0)}</td>
                        <td style={{ padding: '12px 18px', fontSize: 12, color: '#9ca3af' }}>{r.return_date}</td>
                        <td style={{ padding: '12px 18px' }}>
                          <button onClick={() => handleDeleteReturn(r.id)}
                            style={{ fontSize: 12, color: '#ef4444', background: '#ef444410', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>Suppr.</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 14, padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>💡 Conseil FBA expert</div>
                <div style={{ fontSize: 12, color: '#78350f' }}>
                  Un taux de retour supérieur à 8% sur Amazon peut entraîner une suspension de votre compte. Analysez les raisons récurrentes et contactez votre fournisseur pour améliorer la qualité produit et l'emballage.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Ajouter Avis */}
      <Modal isOpen={showAddReview} onClose={() => setShowAddReview(false)} title="Ajouter un avis négatif">
        <form onSubmit={handleAddReview}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Produit</label>
            <select style={inp} value={reviewForm.product_id} onChange={e => setReviewForm({ ...reviewForm, product_id: e.target.value })}>
              <option value="">-- Sélectionner --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.asin})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Auteur</label>
              <input style={inp} value={reviewForm.author} onChange={e => setReviewForm({ ...reviewForm, author: e.target.value })} placeholder="Nom du client" />
            </div>
            <div>
              <label style={lbl}>Note (1-5) *</label>
              <select style={inp} value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: e.target.value })}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} étoile{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Titre</label>
            <input style={inp} value={reviewForm.title} onChange={e => setReviewForm({ ...reviewForm, title: e.target.value })} placeholder="Titre de l'avis" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Contenu *</label>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={reviewForm.content} onChange={e => setReviewForm({ ...reviewForm, content: e.target.value })} placeholder="Texte de l'avis..." required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Date de l'avis</label>
            <input style={inp} type="date" value={reviewForm.review_date} onChange={e => setReviewForm({ ...reviewForm, review_date: e.target.value })} />
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px 0', background: saving ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Sauvegarde...' : 'Ajouter l\'avis'}
          </button>
        </form>
      </Modal>

      {/* Modal Ajouter Retour */}
      <Modal isOpen={showAddReturn} onClose={() => setShowAddReturn(false)} title="Ajouter un retour produit">
        <form onSubmit={handleAddReturn}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Produit</label>
            <select style={inp} value={returnForm.product_id} onChange={e => setReturnForm({ ...returnForm, product_id: e.target.value })}>
              <option value="">-- Sélectionner --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.asin})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Raison du retour *</label>
            <input style={inp} value={returnForm.reason} onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })} placeholder="Défectueux, non conforme..." required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Quantité</label>
              <input style={inp} type="number" min="1" value={returnForm.quantity} onChange={e => setReturnForm({ ...returnForm, quantity: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Coût (€)</label>
              <input style={inp} type="number" step="0.01" value={returnForm.cost} onChange={e => setReturnForm({ ...returnForm, cost: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Date du retour</label>
            <input style={inp} type="date" value={returnForm.return_date} onChange={e => setReturnForm({ ...returnForm, return_date: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={returnForm.notes} onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} placeholder="Notes supplémentaires..." />
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px 0', background: saving ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Sauvegarde...' : 'Ajouter le retour'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
