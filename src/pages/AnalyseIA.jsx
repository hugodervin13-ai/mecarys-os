import { useState } from 'react'
import { supabase } from '../lib/supabase'

const box = { background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14 }

const SCORE_COLOR = (s) => s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'
const SCORE_BG = (s) => s >= 75 ? '#10b98115' : s >= 50 ? '#f59e0b15' : '#ef444415'
const SCORE_LABEL = (s) => s >= 75 ? 'Bon' : s >= 50 ? 'À améliorer' : 'Urgent'

const IMPACT_COLOR = { élevé: '#10b981', moyen: '#f59e0b', faible: '#6b7280' }
const EFFORT_COLOR = { faible: '#10b981', moyen: '#f59e0b', élevé: '#ef4444' }
const DIFF_COLOR = { faible: '#10b981', moyen: '#f59e0b', élevé: '#ef4444', 'très élevé': '#7c3aed' }
const COMPETITION_COLOR = { faible: '#10b981', moyen: '#f59e0b', élevé: '#ef4444', 'très élevé': '#7c3aed' }
const TENDANCE_COLOR = { croissante: '#10b981', stable: '#f59e0b', décroissante: '#ef4444' }
const BARRIERE_COLOR = { faible: '#10b981', moyenne: '#f59e0b', élevée: '#ef4444' }

function ScoreRing({ score, size = 90 }) {
  const r = (size / 2) - 9
  const circ = 2 * Math.PI * r
  const progress = circ - (score / 100) * circ
  const color = SCORE_COLOR(score)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0eb" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={progress} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontSize: size > 80 ? 20 : 15, fontWeight: 700, fill: color }}>
        {score}
      </text>
    </svg>
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
          {score !== undefined && score !== null && (
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

function Chip({ text, icon, color = '#374151' }) {
  return (
    <span style={{ background: '#f5f5f0', color, fontSize: 11, padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginRight: 6, marginBottom: 6 }}>
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{text}
    </span>
  )
}

function KpiCard({ label, value, sub, color = '#1a1a2e' }) {
  return (
    <div style={{ background: '#fafaf8', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

const MARKETPLACES = [
  { code: 'fr', label: '🇫🇷 Amazon.fr' },
  { code: 'com', label: '🇺🇸 Amazon.com' },
  { code: 'de', label: '🇩🇪 Amazon.de' },
  { code: 'es', label: '🇪🇸 Amazon.es' },
  { code: 'it', label: '🇮🇹 Amazon.it' },
  { code: 'uk', label: '🇬🇧 Amazon.co.uk' },
]

export default function AnalyseIA() {
  const [asin, setAsin] = useState('')
  const [marketplace, setMarketplace] = useState('fr')
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const steps = [
    'Connexion à Amazon...',
    'Extraction des données produit...',
    'Analyse de la niche et concurrence...',
    'Génération du plan SEO & PPC...',
    'Compilation du rapport expert...',
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

    const interval = setInterval(() => {
      setLoadStep(s => Math.min(s + 1, steps.length - 1))
    }, 1600)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyse-asin', {
        body: { asin: cleanAsin, marketplace },
      })
      clearInterval(interval)

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.analysis) throw new Error("Réponse invalide de l'API")

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
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Analyse IA d'un ASIN</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Audit complet de listing, analyse de niche, SEO, PPC et plan d'action — propulsé par l'IA.</p>
      </div>

      {/* Input */}
      <div style={{ ...box, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          {MARKETPLACES.map(m => (
            <button key={m.code} onClick={() => setMarketplace(m.code)}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${marketplace === m.code ? '#6366f1' : '#e8e8e3'}`, background: marketplace === m.code ? '#6366f115' : '#fff', color: marketplace === m.code ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {m.label}
            </button>
          ))}
        </div>
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
            {loading ? '⏳ Analyse...' : '✨ Analyser'}
          </button>
        </div>
        {error && <p style={{ marginTop: 10, fontSize: 12, color: '#ef4444' }}>⚠ {error}</p>}
        <p style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>
          Analyse complète : titre, images, bullet points, A+, prix, SEO, PPC, opportunité de niche et plan d'action prioritaire.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ ...box, padding: 48, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', animation: `bounce 1s ${i * 0.2}s infinite` }}/>
            ))}
          </div>
          <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)} }`}</style>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>Analyse IA en cours...</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{steps[loadStep]}</div>
          <div style={{ maxWidth: 360, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
              {steps.map((s, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i <= loadStep ? '#6366f1' : '#e8e8e3', transition: 'background 0.3s' }}/>
              ))}
            </div>
            <div style={{ height: 4, background: '#f0f0eb', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 4, width: `${((loadStep + 1) / steps.length) * 100}%`, transition: 'width 1.6s ease' }}/>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {a && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Header / Score Global */}
          <div style={{ ...box, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <ScoreRing score={a.score_global} size={100}/>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Score global</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: SCORE_COLOR(a.score_global), marginTop: 2 }}>{SCORE_LABEL(a.score_global)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{a.produit_detecte || result.asin}</span>
                  <Tag text={`ASIN: ${result.asin}`} color="#6366f1"/>
                  <Tag text={`Amazon.${result.marketplace}`} color="#6b7280"/>
                  {result.scraped
                    ? <Tag text="✓ Données extraites d'Amazon" color="#10b981"/>
                    : <Tag text="⚡ Analyse IA basée sur les meilleures pratiques" color="#f59e0b"/>}
                </div>
                {a.niche_detectee && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Niche : <strong>{a.niche_detectee}</strong></div>
                )}
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 18 }}>{a.resume_executif}</p>

                {/* Score radar */}
                {a.score_par_categorie && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {Object.entries(a.score_par_categorie).map(([key, val]) => (
                      <div key={key} style={{ background: '#fafaf8', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize', marginBottom: 4 }}>{key.replace(/_/g, ' ')}</div>
                        <div style={{ height: 4, background: '#e8e8e3', borderRadius: 4, overflow: 'hidden', marginBottom: 3 }}>
                          <div style={{ height: '100%', width: `${val}%`, background: SCORE_COLOR(val), borderRadius: 4, transition: 'width 1s ease' }}/>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: SCORE_COLOR(val) }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Listing Quality */}
                {a.listing_quality_score && (
                  <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {Object.entries(a.listing_quality_score).map(([key, val]) => (
                      <div key={key} style={{ background: `${SCORE_COLOR(val)}10`, border: `1px solid ${SCORE_COLOR(val)}25`, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>{key.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: SCORE_COLOR(val) }}>{val}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan d'action */}
          {a.plan_action_prioritaire && (
            <div style={{ ...box, padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                🎯 Plan d'action prioritaire
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {a.plan_action_prioritaire.map((item) => (
                  <div key={item.rang} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fafaf8', borderRadius: 10, padding: '12px 16px', border: item.rang <= 2 ? '1px solid #6366f125' : '1px solid transparent' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: item.rang === 1 ? '#6366f1' : item.rang === 2 ? '#8b5cf6' : '#f0f0eb', color: item.rang <= 2 ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{item.rang}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>{item.action}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Tag text={`Impact ${item.impact}`} color={IMPACT_COLOR[item.impact] || '#6b7280'}/>
                        <Tag text={`Effort ${item.effort}`} color={EFFORT_COLOR[item.effort] || '#6b7280'}/>
                        {item.delai && <Tag text={`⏱ ${item.delai}`} color="#6b7280"/>}
                        {item.gain_estime && <Tag text={`→ ${item.gain_estime}`} color="#6366f1"/>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opportunité de niche */}
          {a.opportunite_niche && (
            <Section title="Opportunité de Niche" icon="📊" score={a.opportunite_niche.score_opportunite} defaultOpen={true}>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  <KpiCard label="CA mensuel estimé" value={a.opportunite_niche.potentiel_ca_mensuel || '—'} color="#10b981"/>
                  <KpiCard label="Niveau concurrence" value={a.opportunite_niche.niveau_competition || '—'} color={COMPETITION_COLOR[a.opportunite_niche.niveau_competition] || '#6b7280'}/>
                  <KpiCard label="Tendance" value={a.opportunite_niche.tendance || '—'} color={TENDANCE_COLOR[a.opportunite_niche.tendance] || '#6b7280'}/>
                  <KpiCard label="Barrière entrée" value={a.opportunite_niche.barriere_entree || '—'} color={BARRIERE_COLOR[a.opportunite_niche.barriere_entree] || '#6b7280'}/>
                </div>
                {a.opportunite_niche.volume_recherche_estime && (
                  <div style={{ background: '#fafaf8', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Volume de recherche estimé</div>
                    <div style={{ fontSize: 13, color: '#1a1a2e' }}>{a.opportunite_niche.volume_recherche_estime}</div>
                  </div>
                )}
                {a.opportunite_niche.saisonnalite && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>📅</span>
                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}><strong>Saisonnalité :</strong> {a.opportunite_niche.saisonnalite}</p>
                  </div>
                )}
                {a.opportunite_niche.recommandation && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #10b98130', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>Verdict</div>
                    <p style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.6 }}>{a.opportunite_niche.recommandation}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Analyse concurrentielle */}
          {a.analyse_concurrentielle && (
            <Section title="Analyse Concurrentielle" icon="⚔️" score={a.analyse_concurrentielle.score}>
              <div style={{ marginTop: 16 }}>
                {a.analyse_concurrentielle.analyse && (
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>{a.analyse_concurrentielle.analyse}</p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  {a.analyse_concurrentielle.avantages_concurrentiels?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 10 }}>Points forts</div>
                      {a.analyse_concurrentielle.avantages_concurrentiels.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: 13, color: '#6b7280' }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {a.analyse_concurrentielle.points_faibles_vs_concurrents?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 10 }}>Points faibles</div>
                      {a.analyse_concurrentielle.points_faibles_vs_concurrents.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <span style={{ color: '#ef4444', flexShrink: 0 }}>✕</span>
                          <span style={{ fontSize: 13, color: '#6b7280' }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {a.analyse_concurrentielle.strategies_differentiation?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 10 }}>Stratégies de différenciation</div>
                    {a.analyse_concurrentielle.strategies_differentiation.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: '#6366f1', flexShrink: 0 }}>→</span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Titre */}
          {a.titre && (
            <Section title="Titre & Mots-clés" icon="📝" score={a.titre.score} defaultOpen>
              <div style={{ marginTop: 16 }}>
                {(a.titre.longueur_actuelle || a.titre.longueur_optimale) && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    {a.titre.longueur_actuelle && <Tag text={`Longueur actuelle : ${a.titre.longueur_actuelle}`} color="#6b7280"/>}
                    {a.titre.longueur_optimale && <Tag text={`Optimal : ${a.titre.longueur_optimale}`} color="#10b981"/>}
                  </div>
                )}
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
                  <div style={{ background: '#f0fdf4', border: '1px solid #10b98130', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>✓ Titre optimisé (copiez-collez directement)</div>
                    <div style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.7, fontWeight: 500 }}>{a.titre.titre_optimise}</div>
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
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  {a.images.nombre_actuel !== undefined && <Tag text={`${a.images.nombre_actuel} image(s) actuellement`} color="#6b7280"/>}
                  <Tag text={`Objectif : ${a.images.nombre_optimal || 7} images`} color="#10b981"/>
                </div>
                {a.images.analyse && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>{a.images.analyse}</p>}
                {a.images.images_manquantes?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 10 }}>Images à créer / ajouter</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {a.images.images_manquantes.map((img, i) => (
                        <div key={i} style={{ background: '#fafaf8', borderRadius: 10, padding: 14, border: img.priorite === 'haute' ? '1px solid #f59e0b30' : '1px solid #f0f0eb' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{img.type}</span>
                            <Tag text={img.priorite} color={img.priorite === 'haute' ? '#f59e0b' : '#6b7280'}/>
                          </div>
                          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{img.description}</p>
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
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 10 }}>✓ Bullet points réécrits & optimisés (prêts à copier)</div>
                    {a.bullet_points.bullets_optimises.map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, marginBottom: 8, border: '1px solid #10b98120' }}>
                        <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0, fontSize: 13, minWidth: 18 }}>{i + 1}.</span>
                        <span style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>{b}</span>
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
                {a.prix_strategie.prix_actuel && a.prix_strategie.prix_actuel !== 'non disponible' && (
                  <div style={{ marginBottom: 14 }}>
                    <Tag text={`Prix actuel : ${a.prix_strategie.prix_actuel}`} color="#6366f1"/>
                  </div>
                )}
                {a.prix_strategie.analyse_positionnement && (
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>{a.prix_strategie.analyse_positionnement}</p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                  {a.prix_strategie.fourchette_optimale && (
                    <KpiCard label="Fourchette optimale" value={a.prix_strategie.fourchette_optimale} color="#10b981"/>
                  )}
                  {a.prix_strategie.strategie_lancement && (
                    <div style={{ background: '#fafaf8', borderRadius: 10, padding: '12px 16px', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Stratégie</div>
                      <div style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.5 }}>{a.prix_strategie.strategie_lancement}</div>
                    </div>
                  )}
                </div>
                {a.prix_strategie.impact_conversion && (
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>💡 {a.prix_strategie.impact_conversion}</div>
                )}
                {a.prix_strategie.conseil_promotions && (
                  <div style={{ fontSize: 13, color: '#6b7280' }}>🎟️ {a.prix_strategie.conseil_promotions}</div>
                )}
              </div>
            </Section>
          )}

          {/* SEO */}
          {a.seo_keywords && (
            <Section title="SEO & Mots-clés" icon="🔍" score={a.seo_keywords.score}>
              <div style={{ marginTop: 16 }}>
                {a.seo_keywords.conseil_principal && (
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>{a.seo_keywords.conseil_principal}</p>
                )}
                {a.seo_keywords.mots_cles_principaux?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 10 }}>Mots-clés principaux</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {a.seo_keywords.mots_cles_principaux.map((k, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fafaf8', borderRadius: 8, padding: '8px 14px' }}>
                          <span style={{ background: '#6366f115', color: '#6366f1', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, minWidth: 0 }}>
                            {typeof k === 'object' ? k.mot_cle : k}
                          </span>
                          {typeof k === 'object' && k.volume_mensuel_estime && (
                            <span style={{ fontSize: 11, color: '#6b7280' }}>~{k.volume_mensuel_estime}</span>
                          )}
                          {typeof k === 'object' && k.difficulte && (
                            <Tag text={k.difficulte} color={DIFF_COLOR[k.difficulte] || '#6b7280'}/>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {a.seo_keywords.mots_cles_longue_traine?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Longue traîne</div>
                    <div>{a.seo_keywords.mots_cles_longue_traine.map((k, i) => <Chip key={i} text={k}/>)}</div>
                  </div>
                )}
                {a.seo_keywords.opportunites_inexploitees?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>💡 Opportunités inexploitées</div>
                    <div>{a.seo_keywords.opportunites_inexploitees.map((k, i) => <Chip key={i} text={k} color="#f59e0b"/>)}</div>
                  </div>
                )}
                {a.seo_keywords.backend_search_terms?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Backend Search Terms (Seller Central)</div>
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: '14px 18px', fontFamily: 'monospace', fontSize: 12, color: '#a5b4fc', lineHeight: 2, wordBreak: 'break-all' }}>
                      {a.seo_keywords.backend_search_terms.join(' ')}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Avis */}
          {a.avis_reputation && (
            <Section title="Avis & Réputation" icon="🌟" score={a.avis_reputation.score}>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  {a.avis_reputation.note_actuelle && a.avis_reputation.note_actuelle !== 'non disponible' && (
                    <Tag text={`Note : ${a.avis_reputation.note_actuelle}`} color="#f59e0b"/>
                  )}
                  {a.avis_reputation.nb_avis && a.avis_reputation.nb_avis !== 'non disponible' && (
                    <Tag text={`${a.avis_reputation.nb_avis} avis`} color="#6b7280"/>
                  )}
                  {a.avis_reputation.objectif_avis_3mois && (
                    <Tag text={`Objectif 3 mois : ${a.avis_reputation.objectif_avis_3mois}`} color="#6366f1"/>
                  )}
                </div>
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
            <Section title="Publicité & PPC" icon="📣" score={a.publicite_ppc.score_opportunite_ppc}>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {a.publicite_ppc.budget_journalier_recommande && (
                    <KpiCard label="Budget/jour" value={a.publicite_ppc.budget_journalier_recommande} color="#6366f1"/>
                  )}
                  {a.publicite_ppc.bid_suggere && (
                    <KpiCard label="Enchère suggérée" value={a.publicite_ppc.bid_suggere} color="#8b5cf6"/>
                  )}
                  {a.publicite_ppc.acos_cible && (
                    <KpiCard label="ACOS cible" value={a.publicite_ppc.acos_cible} color="#f59e0b"/>
                  )}
                </div>
                {a.publicite_ppc.types_campagnes?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 10 }}>Types de campagnes recommandées</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {a.publicite_ppc.types_campagnes.map((t, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fafaf8', borderRadius: 8, padding: '10px 14px' }}>
                          <Tag text={t.priorite} color={t.priorite === 'haute' ? '#ef4444' : '#f59e0b'}/>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{t.type}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{t.objectif}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {a.publicite_ppc.mots_cles_ppc_prioritaires?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>Mots-clés PPC prioritaires</div>
                    <div>{a.publicite_ppc.mots_cles_ppc_prioritaires.map((k, i) => (
                      <span key={i} style={{ background: '#f59e0b15', color: '#f59e0b', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, display: 'inline-block', marginRight: 6, marginBottom: 6 }}>{k}</span>
                    ))}</div>
                  </div>
                )}
                {a.publicite_ppc.mots_cles_negatifs?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Mots-clés négatifs (à exclure)</div>
                    <div>{a.publicite_ppc.mots_cles_negatifs.map((k, i) => (
                      <span key={i} style={{ background: '#ef444415', color: '#ef4444', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, display: 'inline-block', marginRight: 6, marginBottom: 6 }}>✕ {k}</span>
                    ))}</div>
                  </div>
                )}
                {a.publicite_ppc.strategie && (
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{a.publicite_ppc.strategie}</p>
                )}
              </div>
            </Section>
          )}

          {/* Données brutes si scraping ok */}
          {result.scraped && result.product_data && (
            <div style={{ ...box, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag text="✓ Données extraites d'Amazon" color="#10b981"/> Données brutes
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  ['Prix', result.product_data.price],
                  ['Note', result.product_data.rating],
                  ['Avis', result.product_data.reviewCount],
                  ['BSR', result.product_data.bsr],
                  ['Marque', result.product_data.brand],
                  ['Catégorie', result.product_data.category],
                  ['Images', result.product_data.imageCount],
                  ['Vidéo', result.product_data.hasVideo ? 'Oui' : 'Non'],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label} style={{ background: '#fafaf8', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
            {[
              { icon: '📊', title: 'Opportunité de niche', desc: 'CA mensuel estimé, niveau de concurrence, tendance de marché et barrières à l\'entrée.' },
              { icon: '📝', title: 'Titre & Bullet Points', desc: 'Titre SEO-optimisé et bullet points réécrits avec les bons mots-clés et bénéfices produit.' },
              { icon: '🖼️', title: 'Images & Visuels', desc: 'Audit des images, recommandations lifestyle, infographie, comparatif et contenu vidéo.' },
              { icon: '🔍', title: 'SEO & Mots-clés', desc: 'Mots-clés principaux avec volumes estimés, longue traîne, backend search terms et opportunités.' },
              { icon: '📣', title: 'Stratégie PPC', desc: 'Budget, enchères, ACOS cible, 4 types de campagnes, mots-clés prioritaires et négatifs.' },
              { icon: '⚔️', title: 'Analyse concurrentielle', desc: 'Points forts/faibles vs concurrents et stratégies de différenciation pour se démarquer.' },
            ].map(c => (
              <div key={c.title} style={{ ...box, padding: 22 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{c.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>{c.title}</div>
                <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ ...box, padding: 16, background: '#fefce8', border: '1px solid #fef08a' }}>
            <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
              <strong>💡 Comment ça marche :</strong> Entrez un ASIN Amazon ci-dessus. L'IA tentera d'extraire les données directement depuis la page Amazon, puis générera un rapport complet. Si Amazon bloque la requête (protection anti-bot), l'analyse sera quand même générée à partir de ses connaissances du marché et des meilleures pratiques FBA.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
