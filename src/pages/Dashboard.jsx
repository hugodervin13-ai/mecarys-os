import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getProducts, getAlerts, getOrders,
  getSuppliers, getDocuments, getAllCompetitors,
} from '../lib/supabase'
import { listShipments } from '../lib/shipmentsRepo'
import { computeAlerts, SEVERITY } from '../lib/alertsEngine'
import { useStore } from '../lib/store'
import { useData } from '../lib/useData'
import { formatNumber, formatCurrency } from '../lib/utils'
import Loading from '../components/Loading'
import ChartSkeleton from '../components/charts/ChartSkeleton'

// Recharts (~386 Ko) chargé à la demande : la page s'affiche sans l'attendre.
const SparkArea = lazy(() => import('../components/charts/SparkArea'))

// ─── Métriques par période ───────────────────────────────────────────────────
const PM = {
  hier: { ca: '9 240 €', caRaw: 9240,  caΔ: 12.3, profit: '2 310 €', profitRaw: 2310, profitΔ: 8.1,  units: '34',  unitsΔ: 5.2  },
  auj:  { ca: '3 180 €', caRaw: 3180,  caΔ: 6.4,  profit: '795 €',   profitRaw: 795,  profitΔ: 4.2,  units: '11',  unitsΔ: 2.1  },
  '7j': { ca: '72 300 €',caRaw: 72300, caΔ: 8.4,  profit: '18 200 €',profitRaw:18200, profitΔ: 6.2,  units: '82',  unitsΔ: 5.1  },
  '30j':{ ca: '386 730 €',caRaw:386730,caΔ: 22.8, profit: '97 430 €',profitRaw:97430, profitΔ: 16.7, units: '356', unitsΔ: 12.2 },
}
const PC = {
  hier: [{ t:'06h',ca:210,p:52},{ t:'09h',ca:1140,p:285},{ t:'12h',ca:2650,p:662},{ t:'15h',ca:4280,p:1070},{ t:'18h',ca:5540,p:1385},{ t:'21h',ca:7120,p:1780},{ t:'00h',ca:9240,p:2310}],
  auj:  [{ t:'06h',ca:80,p:20},{ t:'08h',ca:290,p:72},{ t:'10h',ca:740,p:185},{ t:'12h',ca:1240,p:310},{ t:'14h',ca:1880,p:470},{ t:'16h',ca:2450,p:612},{ t:'18h',ca:3180,p:795}],
  '7j': [{ t:'Lun',ca:7200,p:1800},{ t:'Mar',ca:9100,p:2300},{ t:'Mer',ca:8400,p:2100},{ t:'Jeu',ca:11200,p:2800},{ t:'Ven',ca:13500,p:3400},{ t:'Sam',ca:12100,p:3100},{ t:'Dim',ca:10800,p:2700}],
  '30j':[{ t:'7 avr',ca:52000,p:13000},{ t:'14 avr',ca:74000,p:18500},{ t:'21 avr',ca:98000,p:24500},{ t:'28 avr',ca:112000,p:28000},{ t:'5 mai',ca:142000,p:35500},{ t:'12 mai',ca:174000,p:43500},{ t:'19 mai',ca:198000,p:49500},{ t:'26 mai',ca:224000,p:56000},{ t:'2 juin',ca:256000,p:64000},{ t:'9 juin',ca:298000,p:74500},{ t:'16 juin',ca:386730,p:97430}],
}
const PL = { hier: 'Hier', auj: "Aujourd'hui", '7j': '7 jours', '30j': '30 jours' }

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const STAGES = [
  { key:'production', label:'Production',   icon:'🏭', color:'#7c3aed', bg:'#7c3aed12' },
  { key:'transit',    label:'En transit',   icon:'🚢', color:'#2563eb', bg:'#2563eb12' },
  { key:'customs',    label:'Douane',       icon:'🛃', color:'#d97706', bg:'#d9770612' },
  { key:'warehouse',  label:'Entrepôt',     icon:'🏬', color:'#0891b2', bg:'#0891b212' },
  { key:'fba',        label:'Amazon FBA',   icon:'📦', color:'#059669', bg:'#05966912' },
]
const ACTIVE = ['production','transit','customs','warehouse']
const TRANSIT = ['transit','customs','warehouse']
const ORDER_ACTIVE = ['pending','production','shipped','transit_boat','transit_truck','transit','customs']

// ─── Raccourcis ───────────────────────────────────────────────────────────────
const SHORTCUTS = [
  { label:'Nouveau produit',     icon:'📦', to:'/produits',     color:'#7c3aed' },
  { label:'Nouveau fournisseur', icon:'🏭', to:'/fournisseurs', color:'#9333ea' },
  { label:'Nouvelle commande',   icon:'📋', to:'/commandes',    color:'#2563eb' },
  { label:'Nouvelle expédition', icon:'🚢', to:'/expeditions',  color:'#0ea5e9' },
  { label:'Gérer le stock',      icon:'📊', to:'/stock',        color:'#059669' },
  { label:'Documents',           icon:'📄', to:'/documents',    color:'#d97706' },
]

// ─── Notes localStorage ───────────────────────────────────────────────────────
function loadNotes() { try { return JSON.parse(localStorage.getItem('mecarys_notes')||'[]') } catch { return [] } }
function saveNotes(n) { try { localStorage.setItem('mecarys_notes', JSON.stringify(n)) } catch {} }

function firstName(email) {
  if (!email) return 'vous'
  const raw = email.split('@')[0].split('.')[0].replace(/[^a-zA-ZÀ-ÿ]/g,'')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, setProducts, setAlerts: setStoreAlerts, setOrders } = useStore()

  const { data: productsData,  loading: lP  } = useData('products',    () => getProducts(user.id),       [user])
  const { data: ordersData,    loading: lO   } = useData('orders',      () => getOrders(user.id),         [user])
  const { data: shipmentsData, loading: lS   } = useData('shipments',   () => listShipments(user.id),     [user])
  const { data: suppliersData, loading: lSu  } = useData('suppliers',   () => getSuppliers(user.id),      [user])
  const { data: documentsData, loading: lD   } = useData('documents',   () => getDocuments(user.id),      [user])
  const { data: competitorsData }               = useData('competitors', () => getAllCompetitors(user.id), [user])
  const { data: alertsDbData }                  = useData('db-alerts',  () => getAlerts(user.id),         [user])

  useEffect(() => { if (productsData) setProducts(productsData) },   [productsData, setProducts])
  useEffect(() => { if (alertsDbData) setStoreAlerts(alertsDbData) }, [alertsDbData, setStoreAlerts])
  useEffect(() => { if (ordersData)   setOrders(ordersData) },        [ordersData, setOrders])

  const products   = productsData   || []
  const orders     = ordersData     || []
  const shipments  = shipmentsData  || []
  const suppliers  = suppliersData  || []
  const documents  = documentsData  || []

  const activeShipments = shipments.filter(s => ACTIVE.includes(s.status))
  const activeOrders    = orders.filter(o => ORDER_ACTIVE.includes(o.status))
  const inTransit       = shipments.filter(s => TRANSIT.includes(s.status))
  const totalItems      = shipments.reduce((a,s) => a + (Number(s.items)||Number(s.quantity)||0), 0)
  const unitsTransit    = inTransit.reduce((a,s) => a + (Number(s.items)||Number(s.quantity)||0), 0)
  const stockValue      = products.reduce((a,p) => a + (Number(p.stock_fba)||0)*(Number(p.cost)||0), 0)

  const productAlerts   = computeAlerts(products)
  const criticalStock   = productAlerts.filter(a => a.type==='stock' && a.severity==='critical').length
  const today           = new Date().toISOString().split('T')[0]

  const allAlerts = [
    ...productAlerts,
    ...shipments.filter(s=>s.status==='customs').map(s=>({
      severity:'warning', type:'customs',
      message:`Expédition ${s.reference||s.id?.slice(0,8)} bloquée en douane`,
    })),
    ...orders.filter(o=>o.expected_delivery&&o.expected_delivery<today&&!['delivered','cancelled'].includes(o.status)).map(o=>({
      severity:'warning', type:'order_late',
      message:`Commande ${o.order_number||o.id?.slice(0,8)} en retard (ETA: ${o.expected_delivery})`,
    })),
  ].sort((a,b)=>({'critical':0,'warning':1,'info':2}[a.severity]??1)-({'critical':0,'warning':1,'info':2}[b.severity]??1)).slice(0,8)

  const pipeline = STAGES.map(st => {
    const matched = shipments.filter(s => st.key==='fba' ? ['fba','delivered'].includes(s.status) : s.status===st.key)
    return { ...st, count: matched.length, items: matched.reduce((a,s)=>a+(Number(s.items)||Number(s.quantity)||0),0) }
  })

  const [period,   setPeriod]   = useState('30j')
  const [notes,    setNotes]    = useState(loadNotes)
  const [noteText, setNoteText] = useState('')
  const [editId,   setEditId]   = useState(null)
  const [editVal,  setEditVal]  = useState('')

  const addNote = () => {
    if (!noteText.trim()) return
    const next = [{ id:Date.now(), text:noteText.trim(), pinned:false, createdAt:new Date().toISOString() }, ...notes]
    setNotes(next); saveNotes(next); setNoteText('')
  }
  const deleteNote = id => { const n=notes.filter(x=>x.id!==id); setNotes(n); saveNotes(n) }
  const togglePin  = id => { const n=notes.map(x=>x.id===id?{...x,pinned:!x.pinned}:x); setNotes(n); saveNotes(n) }
  const startEdit  = (id,text) => { setEditId(id); setEditVal(text) }
  const commitEdit = () => {
    if (!editVal.trim()) return
    const n = notes.map(x=>x.id===editId?{...x,text:editVal.trim()}:x)
    setNotes(n); saveNotes(n); setEditId(null); setEditVal('')
  }
  const sortedNotes = [...notes].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0))

  const hour = new Date().getHours()
  const greet = hour<12?'Bonjour':hour<18?'Bon après-midi':'Bonsoir'

  if (lP||lO||lS||lSu||lD) return <Loading />

  const m = PM[period]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:1280, margin:'0 auto' }}>

      {/* ══════════ HEADER ══════════ */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', margin:0, letterSpacing:'-0.3px' }}>
            {greet}, {firstName(user?.email)} 👋
          </h1>
          <p style={{ fontSize:12, color:'#9ca3af', marginTop:3, margin:0 }}>
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            {products.length>0 && ` · ${products.length} produit${products.length>1?'s':''} dans votre catalogue`}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>navigate('/expeditions')} style={{ padding:'8px 18px', background:'#5046e4', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', letterSpacing:'-0.1px' }}>
            + Expédition
          </button>
          <button onClick={()=>navigate('/produits')} style={{ padding:'8px 18px', background:'#fff', color:'#111827', border:'1px solid #e5e7eb', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            + Produit
          </button>
        </div>
      </div>

      {/* ══════════ HERO REVENUE ══════════ */}
      <div style={{
        background:'linear-gradient(135deg, #0f0e23 0%, #1e1a4a 40%, #2d2880 70%, #4338ca 100%)',
        borderRadius:20, padding:'28px 32px', position:'relative', overflow:'hidden',
        boxShadow:'0 8px 32px rgba(79,70,229,0.25)',
      }}>
        {/* Orbs décoratifs */}
        <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, borderRadius:'50%', background:'rgba(129,140,248,0.08)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-80, right:120, width:180, height:180, borderRadius:'50%', background:'rgba(99,102,241,0.06)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'30%', left:'40%', width:120, height:120, borderRadius:'50%', background:'rgba(165,180,252,0.05)', pointerEvents:'none' }}/>

        <div style={{ display:'flex', gap:40, position:'relative', zIndex:1 }}>

          {/* Métriques */}
          <div style={{ flex:1 }}>
            {/* Tabs période */}
            <div style={{ display:'flex', gap:4, marginBottom:24 }}>
              {Object.entries(PL).map(([k,label])=>(
                <button key={k} onClick={()=>setPeriod(k)} style={{
                  padding:'5px 16px', borderRadius:20, border:'none', cursor:'pointer',
                  fontSize:12, fontWeight:600, transition:'all 0.15s',
                  background: period===k ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.08)',
                  color: period===k ? '#1e1a4a' : 'rgba(255,255,255,0.55)',
                }}>{label}</button>
              ))}
            </div>

            <div style={{ display:'flex', gap:0, alignItems:'stretch' }}>
              {/* CA */}
              <div style={{ paddingRight:36 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                  Chiffre d'affaires
                </div>
                <div style={{ fontSize:38, fontWeight:900, color:'#ffffff', letterSpacing:'-1.5px', lineHeight:1 }}>
                  {m.ca}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.15)', padding:'2px 8px', borderRadius:20 }}>
                    ↑ {m.caΔ}%
                  </span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>vs période préc.</span>
                </div>
              </div>

              {/* Séparateur */}
              <div style={{ width:1, background:'rgba(255,255,255,0.08)', margin:'0 36px 0 0', flexShrink:0 }}/>

              {/* Profit */}
              <div style={{ paddingRight:36 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                  Profit net
                </div>
                <div style={{ fontSize:38, fontWeight:900, color:'#4ade80', letterSpacing:'-1.5px', lineHeight:1 }}>
                  {m.profit}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.15)', padding:'2px 8px', borderRadius:20 }}>
                    ↑ {m.profitΔ}%
                  </span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>vs période préc.</span>
                </div>
              </div>

              {/* Séparateur */}
              <div style={{ width:1, background:'rgba(255,255,255,0.08)', margin:'0 36px 0 0', flexShrink:0 }}/>

              {/* Unités */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                  Unités vendues
                </div>
                <div style={{ fontSize:38, fontWeight:900, color:'rgba(255,255,255,0.9)', letterSpacing:'-1.5px', lineHeight:1 }}>
                  {m.units}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.15)', padding:'2px 8px', borderRadius:20 }}>
                    ↑ {m.unitsΔ}%
                  </span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>vs période préc.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Graphe */}
          <div style={{ width:340, flexShrink:0 }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Évolution CA — {PL[period]}
            </div>
            <Suspense fallback={<ChartSkeleton height={96} dark />}>
              <SparkArea data={PC[period]} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* ══════════ KPI ROW ══════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Produits', value:products.length, sub:products.length===0?'Ajoutez un produit':'dans le catalogue', icon:'📦', color:'#7c3aed', to:'/produits' },
          { label:'Expéditions actives', value:activeShipments.length, sub:activeShipments.length===0?'Aucune en cours':`${unitsTransit} unités en route`, icon:'🚢', color:'#2563eb', to:'/expeditions' },
          { label:'Commandes en cours', value:activeOrders.length, sub:activeOrders.length===0?'Aucune en cours':'en traitement fournisseur', icon:'📋', color:'#0891b2', to:'/commandes' },
          { label:'Alertes stock', value:criticalStock, sub:criticalStock>0?'Réapprovisionnement urgent':'Tout est OK', icon:'⚠️', color:criticalStock>0?'#dc2626':'#059669', to:'/stock' },
        ].map(k=>(
          <div key={k.label} onClick={()=>navigate(k.to)}
            style={{ background:'#fff', borderRadius:16, padding:'18px 20px', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border:`1px solid #f0f0f0`, borderLeft:`4px solid ${k.color}`, transition:'all 0.15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.09)' }}
            onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</span>
              <div style={{ width:34, height:34, borderRadius:10, background:`${k.color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{k.icon}</div>
            </div>
            <div style={{ fontSize:32, fontWeight:900, color:'#111827', letterSpacing:'-0.8px', lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:12, color:k.color, fontWeight:600, marginTop:7 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ══════════ PIPELINE LOGISTIQUE ══════════ */}
      <div style={{ background:'#fff', borderRadius:20, padding:'24px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border:'1px solid #f0f0f0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20 }}>🚢</span>
              <span style={{ fontSize:18, fontWeight:800, color:'#111827', letterSpacing:'-0.4px' }}>Pipeline logistique</span>
            </div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:4, marginLeft:28 }}>
              {shipments.length===0
                ? 'Aucune expédition — créez-en une pour démarrer'
                : `${shipments.length} expédition${shipments.length>1?'s':''} · ${formatNumber(totalItems)} unités au total`}
            </div>
          </div>
          <button onClick={()=>navigate('/expeditions')} style={{ fontSize:12, color:'#5046e4', background:'#ede9fe', padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:700, letterSpacing:'-0.1px' }}>
            Gérer les expéditions →
          </button>
        </div>

        {/* Stages */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
          {pipeline.map((st,i)=>(
            <div key={st.key} onClick={()=>navigate('/expeditions')} style={{ position:'relative', cursor:'pointer' }}>
              {i<pipeline.length-1 && (
                <div style={{ position:'absolute', right:-6, top:'50%', transform:'translateY(-50%)', zIndex:1, color:'#d1d5db', fontSize:14, fontWeight:700 }}>›</div>
              )}
              <div style={{
                borderRadius:14, background: st.count>0 ? st.bg : '#fafaf8',
                border:`1.5px solid ${st.count>0 ? st.color+'30' : '#ebebE6'}`,
                padding:'16px 14px', textAlign:'center', transition:'all 0.15s',
                opacity: st.count===0 ? 0.55 : 1,
              }}
              onMouseEnter={e=>st.count>0&&(e.currentTarget.style.transform='translateY(-2px)')}
              onMouseLeave={e=>(e.currentTarget.style.transform='none')}
              >
                <div style={{ fontSize:20, marginBottom:8 }}>{st.icon}</div>
                <div style={{ fontSize:10, fontWeight:700, color: st.count>0 ? st.color : '#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{st.label}</div>
                <div style={{ fontSize:28, fontWeight:900, color: st.count>0 ? '#111827' : '#d1d5db', letterSpacing:'-0.5px', lineHeight:1 }}>{st.count}</div>
                {st.items>0 && <div style={{ fontSize:10, color:'#9ca3af', marginTop:5 }}>{formatNumber(st.items)} unités</div>}
                {st.count>0 && (
                  <div style={{ width:28, height:3, borderRadius:2, background:st.color, margin:'10px auto 0' }}/>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Liste des expéditions actives */}
        {activeShipments.length>0 && (
          <div style={{ marginTop:20, borderTop:'1.5px solid #f5f4f0', paddingTop:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:10, letterSpacing:'-0.1px' }}>
              Expéditions actives
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {activeShipments.slice(0,5).map(s=>{
                const st = STAGES.find(p=>p.key===s.status)
                return (
                  <div key={s.id} onClick={()=>navigate('/expeditions')} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                    borderRadius:10, background:'#fafaf8', border:'1px solid #ebebE6',
                    cursor:'pointer', transition:'background 0.1s',
                  }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#f5f4f0')}
                  onMouseLeave={e=>(e.currentTarget.style.background='#fafaf8')}
                  >
                    <span style={{ fontSize:16, flexShrink:0 }}>{st?.icon||'📦'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'#111827' }}>{s.reference||`EXP-${s.id?.slice(0,6)}`}</span>
                      {s.product && <span style={{ fontSize:11, color:'#9ca3af', marginLeft:8 }}>{s.product}</span>}
                    </div>
                    {(s.quantity||s.items)>0 && (
                      <span style={{ fontSize:11, color:'#6b7280', flexShrink:0 }}>
                        {formatNumber(Number(s.quantity)||Number(s.items))} unités
                      </span>
                    )}
                    {s.eta && (
                      <span style={{ fontSize:11, color:'#6b7280', flexShrink:0 }}>ETA {s.eta}</span>
                    )}
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:`${st?.color||'#6366f1'}14`, color:st?.color||'#6366f1', flexShrink:0, whiteSpace:'nowrap' }}>
                      {st?.label||s.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {shipments.length===0 && (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🚢</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:6 }}>Aucune expédition en cours</div>
            <div style={{ fontSize:12, color:'#9ca3af', marginBottom:18 }}>Créez une expédition pour suivre votre pipeline fournisseur → Amazon FBA</div>
            <button onClick={()=>navigate('/expeditions')} style={{ padding:'9px 22px', background:'#5046e4', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              + Créer une expédition
            </button>
          </div>
        )}
      </div>

      {/* ══════════ BOTTOM ROW : Alertes | Notes | Raccourcis ══════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr 1fr', gap:14 }}>

        {/* ALERTES */}
        <div style={{ background:'#fff', borderRadius:18, padding:'20px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border:'1px solid #f0f0f0', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <span style={{ fontSize:17, fontWeight:800, color:'#111827', letterSpacing:'-0.3px' }}>Alertes</span>
            </div>
            {allAlerts.length>0 && (
              <span style={{ fontSize:12, fontWeight:800, padding:'3px 10px', borderRadius:20, background: allAlerts.some(a=>a.severity==='critical')?'#fee2e2':'#fef3c7', color: allAlerts.some(a=>a.severity==='critical')?'#dc2626':'#d97706' }}>
                {allAlerts.length}
              </span>
            )}
          </div>

          {allAlerts.length===0 ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 0' }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:10 }}>✅</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#111827' }}>Tout est OK</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:3 }}>Aucune alerte active</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, flex:1, overflowY:'auto' }}>
              {allAlerts.map((a,i)=>{
                const isCrit = a.severity==='critical'
                const isWarn = a.severity==='warning'
                const clr = isCrit?'#dc2626':isWarn?'#d97706':'#2563eb'
                const bg  = isCrit?'#fef2f2':isWarn?'#fffbeb':'#eff6ff'
                const to  = a.type==='stock'?'/stock':a.type==='customs'||a.type==='order_late'?'/expeditions':'/produits'
                return (
                  <div key={i} onClick={()=>navigate(to)} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 12px', borderRadius:10, background:bg, border:`1px solid ${clr}18`, cursor:'pointer', transition:'opacity 0.1s' }}
                    onMouseEnter={e=>(e.currentTarget.style.opacity='0.8')}
                    onMouseLeave={e=>(e.currentTarget.style.opacity='1')}
                  >
                    <span style={{ fontSize:13, flexShrink:0, marginTop:0.5 }}>{SEVERITY[a.severity]?.icon||(isCrit?'🔴':isWarn?'🟠':'🔵')}</span>
                    <span style={{ fontSize:11, color:'#374151', lineHeight:1.5, flex:1 }}>{a.message}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* NOTES */}
        <div style={{ background:'#fff', borderRadius:18, padding:'20px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border:'1px solid #f0f0f0', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:16 }}>
            <span style={{ fontSize:18 }}>📝</span>
            <span style={{ fontSize:17, fontWeight:800, color:'#111827', letterSpacing:'-0.3px' }}>Notes rapides</span>
          </div>

          {/* Input */}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <input
              type="text"
              placeholder="Nouvelle note… (Entrée pour ajouter)"
              value={noteText}
              onChange={e=>setNoteText(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addNote()}
              style={{ flex:1, padding:'9px 13px', background:'#fafaf8', border:'1.5px solid #ebebE6', borderRadius:10, fontSize:12, color:'#111827', outline:'none', transition:'border-color 0.15s' }}
              onFocus={e=>(e.target.style.borderColor='#5046e4')}
              onBlur={e=>(e.target.style.borderColor='#ebebE6')}
            />
            <button onClick={addNote} disabled={!noteText.trim()} style={{ width:36, height:36, borderRadius:10, background:noteText.trim()?'#5046e4':'#f0f0f0', color:noteText.trim()?'#fff':'#9ca3af', border:'none', cursor:noteText.trim()?'pointer':'default', fontSize:18, fontWeight:700, flexShrink:0, transition:'background 0.15s' }}>+</button>
          </div>

          {/* Liste */}
          <div style={{ display:'flex', flexDirection:'column', gap:7, flex:1, maxHeight:280, overflowY:'auto' }}>
            {sortedNotes.length===0 ? (
              <div style={{ textAlign:'center', padding:'24px 0', color:'#9ca3af', fontSize:12 }}>
                Aucune note. Commencez à écrire ci-dessus.
              </div>
            ) : sortedNotes.map(note=>(
              <div key={note.id} style={{ background:note.pinned?'#fffbeb':'#fafaf8', border:`1.5px solid ${note.pinned?'#fde68a':'#ebebE6'}`, borderRadius:10, padding:'10px 13px' }}>
                {editId===note.id ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <textarea
                      autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();commitEdit()} if(e.key==='Escape'){setEditId(null)} }}
                      style={{ width:'100%', minHeight:52, padding:'6px 8px', background:'#fff', border:'1.5px solid #5046e4', borderRadius:8, fontSize:12, color:'#111827', resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                    />
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={commitEdit} style={{ flex:1, padding:'5px', background:'#5046e4', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer' }}>Sauvegarder</button>
                      <button onClick={()=>setEditId(null)} style={{ padding:'5px 10px', background:'#f0f0eb', color:'#6b7280', border:'none', borderRadius:7, fontSize:11, cursor:'pointer' }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ fontSize:12, color:'#374151', flex:1, lineHeight:1.5 }}>
                      {note.pinned && <span style={{ marginRight:4, fontSize:11 }}>📌</span>}
                      {note.text}
                    </span>
                    <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                      <NoteBtn title={note.pinned?'Désépingler':'Épingler'} onClick={()=>togglePin(note.id)}>📌</NoteBtn>
                      <NoteBtn title="Modifier" onClick={()=>startEdit(note.id,note.text)}>✏️</NoteBtn>
                      <NoteBtn title="Supprimer" onClick={()=>deleteNote(note.id)} danger>🗑</NoteBtn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RACCOURCIS */}
        <div style={{ background:'#fff', borderRadius:18, padding:'20px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border:'1px solid #f0f0f0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:16 }}>
            <span style={{ fontSize:18 }}>⚡</span>
            <span style={{ fontSize:17, fontWeight:800, color:'#111827', letterSpacing:'-0.3px' }}>Accès rapide</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {SHORTCUTS.map(s=>(
              <button key={s.label} onClick={()=>navigate(s.to)} style={{
                background:'#fafaf8', border:`1.5px solid #ebebE6`, borderRadius:12,
                padding:'14px 10px', textAlign:'center', cursor:'pointer', transition:'all 0.15s',
                display:'flex', flexDirection:'column', alignItems:'center', gap:7,
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=s.color; e.currentTarget.style.background=s.color+'0d'; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='#ebebE6'; e.currentTarget.style.background='#fafaf8'; e.currentTarget.style.transform='none' }}
              >
                <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>{s.icon}</div>
                <span style={{ fontSize:10, fontWeight:600, color:'#6b7280', lineHeight:1.3 }}>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Stats secondaires */}
          <div style={{ marginTop:16, borderTop:'1.5px solid #f5f4f0', paddingTop:14, display:'flex', flexDirection:'column', gap:8 }}>
            <StatRow label="Fournisseurs" value={suppliers.length} color="#7c3aed"/>
            <StatRow label="Documents" value={documents.length} color="#d97706"/>
            <StatRow label="Valeur du stock" value={stockValue>0?formatCurrency(stockValue):'—'} color="#059669"/>
            <StatRow label="Unités en transit" value={formatNumber(unitsTransit)} color="#2563eb"/>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NoteBtn({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color: danger?'#ef4444':'#9ca3af', padding:'2px', lineHeight:1, opacity:0.7 }}
      onMouseEnter={e=>(e.currentTarget.style.opacity='1')}
      onMouseLeave={e=>(e.currentTarget.style.opacity='0.7')}
    >{children}</button>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <span style={{ fontSize:11, color:'#9ca3af' }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:700, color }}>{value}</span>
    </div>
  )
}
