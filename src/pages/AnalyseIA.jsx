import { useState } from 'react'
import { supabase } from '../lib/supabase'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }

const SCORE_COLOR = (s) => s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'
const SCORE_BG = (s) => s >= 75 ? '#10b98115' : s >= 50 ? '#f59e0b15' : '#ef444415'
const SCORE_LABEL = (s) => s >= 75 ? 'Bon' : s >= 50 ? 'À améliorer' : 'Urgent'

const IMPACT_COLOR = { élevé: '#10b981', moyen: '#f59e0b', faible: '#6b7280' }
const EFFORT_COLOR = { faible: '#10b981', moyen: '#f59e0b', élevé: '#ef4444' }

function ScoreRing({ score, size = 80 }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const progress = circ - (score / 100) * circ
  const color = SCORE_COLOR(score)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0eb" strokeWidth={7}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={progress} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontSize: 18, fontWeight: 700, fill: color }}>
        {score}
      </text>
    </svg>
  )
}

function ScoreBadge({ score, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: SCORE_BG(score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: SCORE_COLOR(score) }}>{score}</div>
      {label && <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>}
    </div>
  )
}

function Section({ title, icon, score, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ ...box, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {score !== undefined && (
            <span style={{ background: SCORE_BG(score), color: SCORE_COLOR(score), fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
              {score}/100 · {SCORE_LABEL(score)}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
        </div>
      </div>
      {open && <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0f0eb' }}>{children}</div>}
    </div>
  )
}

function Tag({ text, color = '#6366f1', bg }) {
  return (
    <span style={{ background: bg || `${color}15`, color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>{text}</span>
  )
}

function Chip({ text, icon }) {
  return (
    <span style={{ background: '#f5f5f0', color: '#374151', fontSize: 11, padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginRight: 6, marginBottom: 6 }}>
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{text}
    </span>
  )
}

export default function AnalyseIA() {
  const [asin, setAsin] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const steps = [
    'Connexion à Amazon...',
    'Extraction des données produit...',
    'Analyse IA du listing en cours...',
    'Génération des recommandations...',
    'Finalisation du rapport...',
  ]

  const handleAnalyse = async () => {
    const cleanAsin = asin.trim().toUpperCase()
    if (!cleanAsin) return
    if (!/^[A-Z0-9]{10}$/.test(cleanAsin)) {
      setError('Format ASIN invalide — 10 caractères alphanumériques (ex: B08N5WRWNW)')
      return
    }

    setLoading(true)
    setResult(null)
    setError('')
    setLoadStep(0)

    // Animate steps while waiting
    const interval = setInterval(() => {
      setLoadStep(s => Math.min(s + 1, steps.length - 1))
    }, 1400)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyse-asin', {
        body: { asin: cleanAsin },
      })
      clearInterval(interval)

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.analysis) throw new Error('Réponse invalide de l\'API')

      setResult(data)
    } catch (e) {
      clearInterval(interval)
      setError(e.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const a = result?.analysis

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Analyse IA d'un ASIN</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Entrez l'ASIN d'un concurrent ou de votre propre produit pour obtenir un audit complet et un plan d'action.</p>
      </div>

      {/* Input */}
      <div style={{ ...box, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              placeholder="ASIN Amazon — ex: B08N5WRWNW"
              value={asin}
              onChange={e => { setAsin(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && !loading && handleAnalyse()}
              maxLength={10}
              style={{
                width: '100%', padding: '14px 18px', background: '#fafaf8',
                border: `1px solid ${error ? '#ef4444' : '#e8e8e3'}`, borderRadius: 10,
                color: '#1a1a2e', fontSize: 16, fontFamily: 'monospace', fontWeight: 600,
                letterSpacing: 2, boxSizing: 'border-box', outline: 'none',
              }}
            />
            {asin.length > 0 && (
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: asin.length === 10 ? '#10b981' : '#9ca3af' }}>
                {asin.length}/10
              </span>
            )}
          </div>
          <button
            onClick={handleAnalyse}
            disabled={loading || asin.length !== 10}
            style={{
              padding: '14px 32px', background: loading || asin.length !== 10 ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: loading || asin.length !== 10 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {loading ? '⏳ Analyse...' : '✨ Analyser avec l\'IA'}
          </button>
        </div>
        {error && <p style={{ marginTop: 10, fontSize: 12, color: '#ef4444' }}>⚠ {error}</p>}
        <p style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>
          L'IA extrait les données de la page Amazon et génère un audit complet : titre, images, bullet points, prix, SEO, PPC et plan d'action.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ ...box, padding: 40, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', animation: `bounce 1s ${i * 0.2}s infinite` }}/>
            ))}
          </div>
          <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)} }`}</style>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>Analyse en cours...</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{steps[loadStep]}</div>
          <div style={{ marginTop: 20, height: 4, background: '#f0f0eb', borderRadius: 4, overflow: 'hidden', maxWidth: 300, margin: '20px auto 0' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 4, width: `${((loadStep + 1) / steps.length) * 100}%`, transition: 'width 1.4s ease' }}/>
          </div>
        </div>
      )}

      {/* Results */}
      {a && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Header */}
          <div style={{ ...box, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <ScoreRing score={a.score_global} size={90}/>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Score global</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>{a.produit_detecte || result.asin}</span>
                  <Tag text={`ASIN: ${result.asin}`} color="#6366f1"/>
                  {result.scraped
                    ? <Tag text="✓ Données Amazon extraites" color="#10b981"/>
                    : <Tag text="Analyse IA" color="#f59e0b"/>}
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 16 }}>{a.resume_executif}</p>
                {/* Score radar */}
                {a.score_par_categorie && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {Object.entries(a.score_par_categorie).map(([key, val]) => (
                      <div key={key} style={{ background: '#fafaf8', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize', marginBottom: 4 }}>{key.replace('_', ' ')}</div>
                        <div style={{ height: 4, background: '#e8e8e3', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${val}%`, background: SCORE_COLOR(val), borderRadius: 4, transition: 'width 1s ease' }}/>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: SCORE_COLOR(val), marginTop: 3 }}>{val}/100</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan d'action prioritaire */}
          {a.plan_action_prioritaire && (
            <div style={{ ...box, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                🎯 Plan d'action prioritaire
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {a.plan_action_prioritaire.map((item) => (
                  <div key={item.rang} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fafaf8', borderRadius: 10, padding: '12px 16px', border: item.rang === 1 ? '1px solid #6366f130' : '1px solid transparent' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: item.rang === 1 ? '#6366f1' : '#f0f0eb', color: item.rang === 1 ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{item.rang}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>{item.action}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Tag text={`Impact ${item.impact}`} color={IMPACT_COLOR[item.impact] || '#6b7280'}/>
                        <Tag text={`Effort ${item.effort}`} color={EFFORT_COLOR[item.effort] || '#6b7280'}/>
                        {item.delai && <Tag text={`⏱ ${item.delai}`} color="#6b7280"/>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Titre */}
          {a.titre && (
            <Section title="Titre & Mots-clés" icon="📝" score={a.titre.score} defaultOpen={true}>
              <div style={{ marginTop: 16 }}>
                {a.titre.analyse && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>{a.titre.analyse}</p>}
                {a.titre.problemes?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>Problèmes identifiés</div>
                    {a.titre.problemes.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: '#ef4444', flexShrink: 0 }}>✕</span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
                {a.titre.titre_optimise && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #10b98130', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 6 }}>✓ Titre optimisé suggéré</div>
                    <div style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.6 }}>{a.titre.titre_optimise}</div>
                  </div>
                )}
                {a.titre.mots_cles_integrer?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Mots-clés à intégrer</div>
                    <div>{a.titre.mots_cles_integrer.map((k, i) => <Chip key={i} text={k} icon="🔑"/>)}</div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Images */}
          {a.images && (
            <Section title="Images & Visuels" icon="🖼️" score={a.images.score}>
              <div style={{ marginTop: 16 }}>
                {a.images.analyse && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>{a.images.analyse}</p>}
                {a.images.images_manquantes?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 10 }}>Images à créer / ajouter</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {a.images.images_manquantes.map((img, i) => (
                        <div key={i} style={{ background: '#fafaf8', borderRadius: 10, padding: 12, border: img.priorite === 'haute' ? '1px solid #f59e0b30' : '1px solid #f0f0eb' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{img.type}</span>
                            <Tag text={img.priorite} color={img.priorite === 'haute' ? '#f59e0b' : '#6b7280'}/>
                          </div>
                          <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{img.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {a.images.conseils_techniques?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Conseils techniques</div>
                    {a.images.conseils_techniques.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: '#6366f1', flexShrink: 0 }}>→</span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Bullet Points */}
          {a.bullet_points && (
            <Section title="Bullet Points" icon="📋" score={a.bullet_points.score}>
              <div style={{ marginTop: 16 }}>
                {a.bullet_points.analyse && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>{a.bullet_points.analyse}</p>}
                {a.bullet_points.problemes?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>Problèmes</div>
                    {a.bullet_points.problemes.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: '#ef4444', flexShrink: 0 }}>✕</span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
                {a.bullet_points.bullets_optimises?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 10 }}>✓ Bullet points récrits & optimisés</div>
                    {a.bullet_points.bullets_optimises.map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, marginBottom: 8, border: '1px solid #10b98120' }}>
                        <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0, fontSize: 13 }}>{i + 1}.</span>
                        <span style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.6 }}>{b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* A+ Content */}
          {a.description_aplus && (
            <Section title="Description & Contenu A+" icon="⭐" score={a.description_aplus.score}>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <Tag
                    text={a.description_aplus.a_du_contenu_aplus ? '✓ Contenu A+ présent' : '✕ Pas de contenu A+'}
                    color={a.description_aplus.a_du_contenu_aplus ? '#10b981' : '#ef4444'}
                  />
                </div>
                {a.description_aplus.analyse && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>{a.description_aplus.analyse}</p>}
                {a.description_aplus.modules_recommandes?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>Modules A+ recommandés</div>
                    <div>{a.description_aplus.modules_recommandes.map((m, i) => <Chip key={i} text={m}/>)}</div>
                  </div>
                )}
                {a.description_aplus.points_cles_a_inclure?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Points clés à inclure</div>
                    {a.description_aplus.points_cles_a_inclure.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: '#6366f1', flexShrink: 0 }}>→</span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Prix */}
          {a.prix_strategie && (
            <Section title="Prix & Stratégie" icon="💰" score={a.prix_strategie.score}>
              <div style={{ marginTop: 16 }}>
                {a.prix_strategie.analyse_positionnement && (
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>{a.prix_strategie.analyse_positionnement}</p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {a.prix_strategie.fourchette_optimale && (
                    <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Fourchette optimale</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{a.prix_strategie.fourchette_optimale}</div>
                    </div>
                  )}
                  {a.prix_strategie.strategie_lancement && (
                    <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Stratégie</div>
                      <div style={{ fontSize: 13, color: '#1a1a2e' }}>{a.prix_strategie.strategie_lancement}</div>
                    </div>
                  )}
                </div>
                {a.prix_strategie.impact_conversion && (
                  <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>💡 {a.prix_strategie.impact_conversion}</div>
                )}
              </div>
            </Section>
          )}

          {/* SEO */}
          {a.seo_keywords && (
            <Section title="SEO & Mots-clés" icon="🔍" score={a.seo_keywords.score}>
              <div style={{ marginTop: 16 }}>
                {a.seo_keywords.conseil_principal && (
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>{a.seo_keywords.conseil_principal}</p>
                )}
                {a.seo_keywords.mots_cles_principaux?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>Mots-clés principaux (volume élevé)</div>
                    <div>{a.seo_keywords.mots_cles_principaux.map((k, i) => (
                      <span key={i} style={{ background: '#6366f115', color: '#6366f1', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, display: 'inline-block', marginRight: 6, marginBottom: 6 }}>{k}</span>
                    ))}</div>
                  </div>
                )}
                {a.seo_keywords.mots_cles_longue_traine?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Longue traîne</div>
                    <div>{a.seo_keywords.mots_cles_longue_traine.map((k, i) => <Chip key={i} text={k}/>)}</div>
                  </div>
                )}
                {a.seo_keywords.backend_search_terms?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Backend Search Terms</div>
                    <div style={{ background: '#1a1a2e', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#a5b4fc', lineHeight: 1.8 }}>
                      {a.seo_keywords.backend_search_terms.join(' ')}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Avis */}
          {a.avis_reputation && (
            <Section title="Avis & Réputation" icon="⭐" score={a.avis_reputation.score}>
              <div style={{ marginTop: 16 }}>
                {a.avis_reputation.analyse && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>{a.avis_reputation.analyse}</p>}
                {a.avis_reputation.strategie_obtenir_avis && (
                  <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Stratégie pour obtenir des avis</div>
                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{a.avis_reputation.strategie_obtenir_avis}</p>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {a.avis_reputation.points_differenciants?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>Points forts à valoriser</div>
                      {a.avis_reputation.points_differenciants.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {a.avis_reputation.risques?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>Risques / points faibles</div>
                      {a.avis_reputation.risques.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <span style={{ color: '#ef4444', flexShrink: 0 }}>✕</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* PPC */}
          {a.publicite_ppc && (
            <Section title="Publicité & PPC" icon="📣" score={null}>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                  {a.publicite_ppc.budget_journalier_recommande && (
                    <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Budget/jour recommandé</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>{a.publicite_ppc.budget_journalier_recommande}</div>
                    </div>
                  )}
                  {a.publicite_ppc.bid_suggere && (
                    <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Enchère suggérée</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>{a.publicite_ppc.bid_suggere}</div>
                    </div>
                  )}
                  {a.publicite_ppc.types_campagnes?.length > 0 && (
                    <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Types de campagnes</div>
                      {a.publicite_ppc.types_campagnes.map((t, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#1a1a2e' }}>{t.type}</div>
                      ))}
                    </div>
                  )}
                </div>
                {a.publicite_ppc.mots_cles_ppc_prioritaires?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>Mots-clés PPC prioritaires</div>
                    <div>{a.publicite_ppc.mots_cles_ppc_prioritaires.map((k, i) => (
                      <span key={i} style={{ background: '#f59e0b15', color: '#f59e0b', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, display: 'inline-block', marginRight: 6, marginBottom: 6 }}>{k}</span>
                    ))}</div>
                  </div>
                )}
                {a.publicite_ppc.strategie && (
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{a.publicite_ppc.strategie}</p>
                )}
              </div>
            </Section>
          )}

        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { icon: '📝', title: 'Titre & Bullet Points', desc: 'Titre SEO-optimisé, bullet points récrits avec les bons mots-clés et bénéfices produit.' },
            { icon: '🖼️', title: 'Images & Visuels', desc: 'Audit du nombre et type d\'images. Recommandations lifestyle, infographie, comparatif.' },
            { icon: '💰', title: 'Prix & Positionnement', desc: 'Analyse du positionnement prix vs concurrents. Stratégie pour maximiser la conversion.' },
            { icon: '🔍', title: 'SEO & Mots-clés', desc: 'Mots-clés principaux, longue traîne et backend search terms pour dominer l\'algorithme A10.' },
            { icon: '📣', title: 'Stratégie PPC', desc: 'Budget recommandé, enchères, types de campagnes Sponsored Products/Brands/Display.' },
            { icon: '⭐', title: 'Contenu A+ & Avis', desc: 'Recommandations de modules A+, stratégie pour obtenir des avis et améliorer la note.' },
          ].map(c => (
            <div key={c.title} style={{ ...box, padding: 20 }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>{c.title}</div>
              <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
