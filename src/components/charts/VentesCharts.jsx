// Graphiques Ventes/Profit — isolés pour charger Recharts à la demande (lazy).
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '../../lib/utils'

const TOOLTIP_STYLE = { backgroundColor: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 8, color: '#1a1a2e', fontSize: 12 }

export function VentesArea({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gVentes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" />
        <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} />
        <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCurrency(v)} />
        <Area type="monotone" dataKey="ventes" stroke="#6366f1" fill="url(#gVentes)" strokeWidth={2} name="Ventes" />
        <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#gProfit)" strokeWidth={2} name="Profit" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function VentesBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" />
        <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} />
        <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCurrency(v)} />
        <Bar dataKey="ventes" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ventes" />
        <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MargesBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" />
        <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} interval={0} tick={{ fontSize: 10 }} />
        <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `${v}%`} unit="%" domain={[0, 'dataMax + 5']} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${Number(v).toFixed(1)}%`, 'Marge nette']} />
        <Bar dataKey="marge" radius={[4, 4, 0, 0]} name="Marge nette">
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
