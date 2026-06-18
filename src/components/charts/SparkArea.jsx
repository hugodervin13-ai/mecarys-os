// Sparkline CA du Dashboard — isolé pour charger Recharts à la demande (lazy).
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

const TTP_STYLE = { backgroundColor:'rgba(15,15,35,0.95)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'#fff', fontSize:11, padding:'6px 10px', boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }

export default function SparkArea({ data }) {
  return (
    <ResponsiveContainer width="100%" height={96}>
      <AreaChart data={data} margin={{ top:4, right:0, left:0, bottom:0 }}>
        <defs>
          <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.45}/>
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="t" stroke="rgba(255,255,255,0.15)" fontSize={9} tickLine={false} axisLine={false} tick={{ fill:'rgba(255,255,255,0.3)' }}/>
        <Tooltip contentStyle={TTP_STYLE} formatter={v=>[`${Number(v).toLocaleString('fr-FR')} €`,'CA']} cursor={{ stroke:'rgba(255,255,255,0.15)', strokeWidth:1 }}/>
        <Area type="monotone" dataKey="ca" stroke="#a5b4fc" fill="url(#gCA)" strokeWidth={2} dot={false} activeDot={{ r:3, fill:'#a5b4fc', strokeWidth:0 }}/>
      </AreaChart>
    </ResponsiveContainer>
  )
}
