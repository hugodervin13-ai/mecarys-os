import { useEffect, useState } from 'react'
import { getProducts, getAlerts } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatNumber } from '../lib/utils'
import KPICard from '../components/KPICard'
import Loading from '../components/Loading'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const salesData = [
  { date: '7 avr.', v: 8200 },
  { date: '14 avr.', v: 10500 },
  { date: '21 avr.', v: 14200 },
  { date: '28 avr.', v: 12800 },
  { date: '5 mai', v: 28500 },
  { date: '12 mai', v: 32000 },
]

const profitData = [
  { date: '7 avr.', v: 1800 },
  { date: '14 avr.', v: 2800 },
  { date: '21 avr.', v: 4100 },
  { date: '28 avr.', v: 3200 },
  { date: '5 mai', v: 6800 },
  { date: '12 mai', v: 7500 },
]

const tracked = [
  { asin: 'B08N5WRWNW', price: '27,99', chg: -0.50, rating: 4.3, rev: 1256 },
  { asin: 'B09X1ZZKZL', price: '29,90', chg: 1.20, rating: 4.1, rev: 842 },
  { asin: 'B0C1234567', price: '25,50', chg: -0.20, rating: 4.0, rev: 532 },
]

const alerts = [
  { id: 1, msg: 'Stock faible sur 3 produits', icon: '⚠️' },
  { id: 2, msg: 'Rupture de stock imminent (7 jours)', icon: '🔴' },
  { id: 3, msg: 'Retour produit en hausse', icon: '📦' },
  { id: 4, msg: 'Prix concurrent en baisse sur 2 ASIN', icon: '💰' },
]

const pipe = [
  { label: 'Production', n: 3, color: '#5a2d82', icon: '🏭' },
  { label: 'En transit', n: 2, color: '#00d4ff', icon: '🚢' },
  { label: 'Douane', n: 1, color: '#ef4444', icon: '🛃' },
  { label: 'En entrepot', n: 1, color: '#f59e0b', icon: '📦' },
  { label: 'Amazon FBA', n: 2, color: '#10b981', icon: '📦' },
]

const card = { background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 12 }
const ttp = { backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 8, color: '#fff', fontSize: 12, padding: '6px 10px' }

export default function Dashboard() {
  const { user, setProducts, setAlerts: setStoreAlerts } = useStore()
  const [loading, setLoading] = useState(true)
  const [products, setP] = useState([])

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    const [pr, al] = await Promise.all([getProducts(user.id), getAlerts(user.id)])
    setP(pr.data || [])
    setProducts(pr.data || [])
    setStoreAlerts(al.data || [])
    setLoading(false)
  }

  const stock = products.reduce((a, p) => a + (p.stock_fba || 0), 0) || 4782

  if (loading) return <Loading />

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Bonjour Hugo 👋</h1>
        <p style={{ fontSize: 13, color: '#8b95a5', marginTop: 2 }}>Voici la performance de votre activite Amazon.</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPICard title="Chiffre d'affaires" value="12 450 €" change={18.6} icon="💰" color="yellow" />
        <KPICard title="Profit net (Sellerboard)" value="3 124 €" change={15.3} icon="📊" color="green" />
        <KPICard title="Unites vendues" value="356" change={12.2} icon="📦" color="blue" />
        <KPICard title="ACOS" value="24,6%" change={-3.1} icon="🎯" color="red" />
        <KPICard title="Stock total FBA" value={formatNumber(stock)} change={3.1} icon="🏭" color="purple" />
      </div>

      {/* Charts + Right panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 14, marginBottom: 20 }}>
        {/* Sales */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Ventes </span>
              <span style={{ fontSize: 12, color: '#636d7e' }}>(30 derniers jours)</span>
            </div>
            <select style={{ background: '#0f1419', border: '1px solid #2d3748', color: '#8b95a5', fontSize: 11, borderRadius: 6, padding: '3px 8px' }}>
              <option>30 jours</option><option>7 jours</option><option>90 jours</option>
            </select>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>386 730 €</div>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 500, marginBottom: 12 }}>↑ 22.8%</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={salesData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5a2d82" stopOpacity={0.4}/><stop offset="100%" stopColor="#5a2d82" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false}/>
              <XAxis dataKey="date" stroke="#636d7e" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="#636d7e" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={ttp}/>
              <Area type="monotone" dataKey="v" stroke="#5a2d82" fill="url(#sg)" strokeWidth={2} dot={false} name="Ventes"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Profit */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Profit net </span>
              <span style={{ fontSize: 12, color: '#636d7e' }}>(30 derniers jours)</span>
            </div>
            <select style={{ background: '#0f1419', border: '1px solid #2d3748', color: '#8b95a5', fontSize: 11, borderRadius: 6, padding: '3px 8px' }}>
              <option>30 jours</option><option>7 jours</option><option>90 jours</option>
            </select>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>97 430 €</div>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 500, marginBottom: 12 }}>↑ 16.7%</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={profitData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false}/>
              <XAxis dataKey="date" stroke="#636d7e" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="#636d7e" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={ttp}/>
              <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#pg)" strokeWidth={2} dot={false} name="Profit"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right panel: Competitors + Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Suivi concurrents */}
          <div style={{ ...card, padding: 16, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Suivi concurrents</span>
              <button style={{ fontSize: 11, background: '#5a2d8822', color: '#7c4daa', padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Ajouter un ASIN</button>
            </div>
            {tracked.map(p => (
              <div key={p.asin} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #2d3748' }}>
                <div style={{ width: 32, height: 32, background: '#0f1419', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>📦</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{p.asin}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#fff' }}>{p.price} €</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: p.chg >= 0 ? '#10b981' : '#ef4444' }}>
                      {p.chg >= 0 ? '↑' : '↓'} {Math.abs(p.chg).toFixed(2)} €
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: '#fff' }}>
                    <span style={{ color: '#f59e0b', marginRight: 2 }}>★</span>{p.rating}
                  </div>
                  <div style={{ fontSize: 10, color: '#636d7e' }}>({formatNumber(p.rev)})</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <span style={{ fontSize: 12, color: '#7c4daa', cursor: 'pointer', fontWeight: 500 }}>Voir tous les suivis →</span>
            </div>
          </div>

          {/* Alertes */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              🚨 Alertes
            </div>
            {alerts.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                  <span style={{ fontSize: 12, color: '#8b95a5', lineHeight: 1.4 }}>{a.msg}</span>
                </div>
                <span style={{ fontSize: 11, color: '#7c4daa', fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>Voir</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Analyse IA d'un ASIN</div>
          <p style={{ fontSize: 12, color: '#636d7e', marginBottom: 12, lineHeight: 1.5 }}>Collez un ASIN et obtenez une analyse complete + recommandations.</p>
          <input placeholder="Ex: B08N5WRWNW" style={{ width: '100%', padding: '8px 12px', background: '#0f1419', border: '1px solid #2d3748', borderRadius: 8, color: '#fff', fontSize: 12, marginBottom: 10 }}/>
          <button style={{ width: '100%', padding: '9px 0', background: '#5a2d82', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✨ Analyser</button>
        </div>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Suivi concurrentiel</div>
          <p style={{ fontSize: 12, color: '#636d7e', marginBottom: 12, lineHeight: 1.5 }}>Suivez vos concurrents : prix, avis, stock, evolution quotidienne.</p>
          <div style={{ height: 50, background: '#0f1419', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📊</div>
        </div>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Amelioration de listing</div>
          <p style={{ fontSize: 12, color: '#636d7e', marginBottom: 12, lineHeight: 1.5 }}>Obtenez des idees pour ameliorer votre fiche produit et booster vos ventes.</p>
          <div style={{ height: 50, background: '#0f1419', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📝</div>
        </div>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Idees produit</div>
          <p style={{ fontSize: 12, color: '#636d7e', marginBottom: 12, lineHeight: 1.5 }}>Trouvez des idees de produits rentables avec notre IA.</p>
          <div style={{ height: 50, background: '#0f1419', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💡</div>
        </div>
      </div>

      {/* Pipeline + Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, marginBottom: 20 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Pipeline reapprovisionnement</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {pipe.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f1419', borderRadius: 8, padding: '10px 12px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: s.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: '#636d7e' }}>{s.n} commande{s.n > 1 ? 's' : ''}</div>
                  </div>
                </div>
                {i < pipe.length - 1 && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d3748" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#7c4daa', cursor: 'pointer', fontWeight: 500 }}>Voir toutes les commandes →</span>
          </div>
        </div>

        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Raccourcis</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { l: 'Importer facture', i: '📄' },
              { l: 'Ajouter un produit', i: '➕' },
              { l: 'Nouvelle commande', i: '📋' },
              { l: 'Analyse IA', i: '🤖' },
            ].map(s => (
              <button key={s.l} style={{ background: '#0f1419', border: '1px solid #2d3748', borderRadius: 8, padding: '10px 6px', textAlign: 'center', cursor: 'pointer', color: '#8b95a5' }}>
                <span style={{ display: 'block', fontSize: 18, marginBottom: 4 }}>{s.i}</span>
                <span style={{ fontSize: 11 }}>{s.l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#ef4444' }}>⚠️</span> Derniers avis clients negatifs
          </div>
          <div style={{ background: '#0f1419', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#fff', lineHeight: 1.5, flex: 1 }}>Produit conforme mais l'emballage etait abime.</span>
              <span style={{ fontSize: 10, background: '#10b98122', color: '#10b981', padding: '2px 8px', borderRadius: 20, marginLeft: 8, whiteSpace: 'nowrap', fontWeight: 500 }}>Qualite</span>
            </div>
            <span style={{ fontSize: 11, color: '#636d7e' }}>ASIN: B08N5WRWNW · Il y a 2h</span>
          </div>
        </div>

        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⭐</span> Prochaines taches
          </div>
          {[
            { t: 'Commander reassort kit phare', d: '14 mai' },
            { t: 'Demander certificat CE fournisseur', d: '15 mai' },
            { t: 'Optimiser listing ASIN B08N5WRWNW', d: '16 mai' },
          ].map(t => (
            <div key={t.t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ color: '#10b981', fontSize: 12, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 12, color: '#8b95a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.t}</span>
              </div>
              <span style={{ fontSize: 11, color: '#636d7e', flexShrink: 0, marginLeft: 8 }}>{t.d}</span>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            📝 Notes rapides
          </div>
          <p style={{ fontSize: 12, color: '#8b95a5', lineHeight: 1.6, marginBottom: 6 }}>Relancer usine pour ameliorer le packaging.</p>
          <p style={{ fontSize: 12, color: '#8b95a5', lineHeight: 1.6 }}>Tester nouveau visuel principal la semaine prochaine.</p>
        </div>
      </div>
    </div>
  )
}
