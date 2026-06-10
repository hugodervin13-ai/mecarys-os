import { useState } from 'react'
import { box } from '../lib/theme'
import { DemoBadge } from '../components/ui'

const mockReviews = [
  { id: 1, asin: 'B08N5WRWNW', product: 'Kit Phare LED H7', rating: 2, text: "Produit conforme mais l'emballage était abîmé à la réception. Le produit fonctionne mais l'impression est mauvaise.", date: '2024-05-12', status: 'pending' },
  { id: 2, asin: 'B09X1ZZKZL', product: 'Ampoule LED H4', rating: 1, text: "Ne fonctionne pas après seulement 2 semaines d'utilisation. Qualité très décevante, ne pas acheter.", date: '2024-05-10', status: 'resolved' },
  { id: 3, asin: 'B08N5WRWNW', product: 'Kit Phare LED H7', rating: 3, text: 'Correct mais la qualité a clairement baissé par rapport à ma première commande il y a 6 mois.', date: '2024-05-08', status: 'pending' },
  { id: 4, asin: 'B07XKZZKZL', product: 'Support téléphone voiture', rating: 2, text: "La fixation lâche après quelques jours d'utilisation. Très déçu.", date: '2024-05-06', status: 'pending' },
]

const mockReturns = [
  { id: 1, asin: 'B08N5WRWNW', product: 'Kit Phare LED H7', reason: 'Défectueux', quantity: 3, date: '2024-05-11', cost: 84, impact: 'high' },
  { id: 2, asin: 'B09X1ZZKZL', product: 'Ampoule LED H4', reason: 'Non conforme à la description', quantity: 1, date: '2024-05-09', cost: 30, impact: 'medium' },
  { id: 3, asin: 'B07XKZZKZL', product: 'Support téléphone', reason: 'Ne répond pas aux attentes', quantity: 2, date: '2024-05-07', cost: 48, impact: 'low' },
  { id: 4, asin: 'B08N5WRWNW', product: 'Kit Phare LED H7', reason: 'Emballage endommagé', quantity: 1, date: '2024-05-05', cost: 28, impact: 'low' },
]

const TEMPLATES = {
  1: "Bonjour, nous vous présentons nos sincères excuses pour cette expérience négative. La qualité de nos produits est notre priorité. Nous vous proposons un remboursement intégral ou un remplacement immédiat. Merci de nous contacter en message privé.",
  2: "Bonjour, nous sommes vraiment désolés que notre produit ne soit pas à la hauteur de vos attentes. Votre satisfaction est essentielle. Nous prenons ce retour très au sérieux pour améliorer notre qualité.",
  3: "Bonjour, merci pour votre retour. Nous avons pris note de votre remarque et travaillons activement à améliorer notre qualité. N'hésitez pas à nous contacter directement pour que nous puissions vous aider.",
}

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
  const [tab, setTab] = useState('reviews')
  const [reviews, setReviews] = useState(mockReviews)
  const [returns] = useState(mockReturns)
  const [showTemplate, setShowTemplate] = useState(null)

  const markResolved = (id) => setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r))
  const pending = reviews.filter(r => r.status === 'pending')
  const totalReturnCost = returns.reduce((a, r) => a + r.cost, 0)
  const returnRate = 2.3

  const impactColor = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }
  const impactLabel = { high: 'Élevé', medium: 'Moyen', low: 'Faible' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Qualité & SAV</h1>
            <DemoBadge />
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Surveillez vos avis négatifs et gérez vos retours pour protéger votre BSR</p>
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
          { label: 'Avis négatifs (30j)', value: reviews.length, icon: '💬', color: '#ef4444', sub: `${pending.length} à traiter` },
          { label: 'Retours (30j)', value: returns.length, icon: '↩️', color: '#f59e0b', sub: `${returnRate}% de taux de retour` },
          { label: 'Taux de retour', value: `${returnRate}%`, icon: '📉', color: returnRate > 5 ? '#ef4444' : returnRate > 2 ? '#f59e0b' : '#10b981', sub: returnRate > 5 ? 'Risque suspension' : returnRate > 2 ? 'À surveiller' : 'Niveau normal' },
          { label: 'Coût des retours', value: `${totalReturnCost} €`, icon: '💸', color: '#ef4444', sub: 'Sur 30 jours' },
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
        {[['reviews', `💬 Avis négatifs (${reviews.length})`], ['returns', `↩️ Retours (${returns.length})`]].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            style={{ padding: '7px 18px', borderRadius: 8, border: `1px solid ${tab === val ? '#6366f1' : '#e8e8e3'}`, background: tab === val ? '#6366f1' : '#fff', color: tab === val ? '#fff' : '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map(r => (
            <div key={r.id} style={{ ...box, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Stars rating={r.rating} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{r.product}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{r.asin}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{r.date}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: r.status === 'resolved' ? '#10b98115' : '#f59e0b15', color: r.status === 'resolved' ? '#10b981' : '#f59e0b', border: `1px solid ${r.status === 'resolved' ? '#10b98130' : '#f59e0b30'}` }}>
                    {r.status === 'resolved' ? '✓ Traité' : 'À traiter'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 14, padding: '10px 14px', background: '#fafaf8', borderRadius: 8, borderLeft: '3px solid #e8e8e3' }}>"{r.text}"</p>
              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowTemplate(showTemplate === r.id ? null : r.id)}
                    style={{ padding: '7px 14px', borderRadius: 8, background: '#6366f115', border: '1px solid #6366f130', color: '#6366f1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    📝 Voir modèle réponse
                  </button>
                  <button onClick={() => markResolved(r.id)}
                    style={{ padding: '7px 14px', borderRadius: 8, background: '#10b98115', border: '1px solid #10b98130', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ✓ Marquer comme traité
                  </button>
                  <a href={`https://www.amazon.fr/dp/${r.asin}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '7px 14px', borderRadius: 8, background: '#f0f0eb', border: '1px solid #e8e8e3', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                    🔗 Voir sur Amazon
                  </a>
                </div>
              )}
              {showTemplate === r.id && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: '#f0f7ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Modèle de réponse</div>
                  <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{TEMPLATES[r.id] || TEMPLATES[1]}</p>
                  <button onClick={() => navigator.clipboard?.writeText(TEMPLATES[r.id] || TEMPLATES[1])}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
            {[
              ['Défectueux', returns.filter(r => r.reason === 'Défectueux').length, '#ef4444'],
              ['Non conforme', returns.filter(r => r.reason.includes('conforme')).length, '#f59e0b'],
              ['Autres raisons', returns.filter(r => !r.reason.includes('Défectueux') && !r.reason.includes('conforme')).length, '#6366f1'],
            ].map(([label, count, color]) => (
              <div key={label} style={{ ...box, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20 }}>📦</span>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color }}>{count}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...box, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafaf8' }}>
                  {['Produit', 'Raison du retour', 'Quantité', 'Coût', 'Impact', 'Date'].map(h => (
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
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{r.product}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{r.asin}</div>
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 13, color: '#374151' }}>{r.reason}</td>
                    <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{r.quantity}</td>
                    <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 700, color: '#ef4444' }}>{r.cost} €</td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${impactColor[r.impact]}15`, color: impactColor[r.impact], border: `1px solid ${impactColor[r.impact]}30` }}>
                        {impactLabel[r.impact]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 12, color: '#9ca3af' }}>{r.date}</td>
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
        </div>
      )}
    </div>
  )
}
