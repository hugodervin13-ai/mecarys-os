import { useEffect, useState } from 'react'
import { getProducts } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency, formatNumber } from '../lib/utils'
import KPICard from '../components/KPICard'
import Loading from '../components/Loading'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const mockMonthlyData = [
  { month: 'Jan', ventes: 285000, profit: 72000, depenses: 213000 },
  { month: 'Fev', ventes: 310000, profit: 81000, depenses: 229000 },
  { month: 'Mar', ventes: 340000, profit: 88000, depenses: 252000 },
  { month: 'Avr', ventes: 365000, profit: 92000, depenses: 273000 },
  { month: 'Mai', ventes: 386730, profit: 97430, depenses: 289300 }
]

const mockDailyData = [
  { jour: 'Lun', ventes: 12400, profit: 3100 },
  { jour: 'Mar', ventes: 14200, profit: 3600 },
  { jour: 'Mer', ventes: 11800, profit: 2900 },
  { jour: 'Jeu', ventes: 15600, profit: 4100 },
  { jour: 'Ven', ventes: 18200, profit: 4800 },
  { jour: 'Sam', ventes: 16500, profit: 4200 },
  { jour: 'Dim', ventes: 13200, profit: 3400 }
]

export default function VentesProfit() {
  const { user } = useStore()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const { data } = await getProducts(user.id)
    setProducts(data || [])
    setLoading(false)
  }

  const totalRevenue = products.reduce((acc, p) => acc + (p.revenue_30d || 0), 0) || 386730
  const totalProfit = products.reduce((acc, p) => acc + (p.profit_30d || 0), 0) || 97430
  const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '25.2'

  if (loading) return <Loading />

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Ventes & Profit</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KPICard title="CA total (30j)" value={formatCurrency(totalRevenue)} change={22.8} icon="💰" />
        <KPICard title="Profit net (30j)" value={formatCurrency(totalProfit)} change={16.7} icon="📈" />
        <KPICard title="Marge nette" value={`${margin}%`} change={2.4} icon="📊" />
        <KPICard title="Panier moyen" value={formatCurrency(totalRevenue / (products.reduce((a, p) => a + (p.units_sold_30d || 0), 0) || 356))} change={5.1} icon="🛒" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3748]">
          <h3 className="text-white font-bold mb-4">Evolution mensuelle</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mockMonthlyData}>
              <defs>
                <linearGradient id="ventesG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5a2d82" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5a2d82" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="month" stroke="#a0aec0" fontSize={12} />
              <YAxis stroke="#a0aec0" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="ventes" stroke="#5a2d82" fill="url(#ventesG)" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#profitG)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3748]">
          <h3 className="text-white font-bold mb-4">Ventes par jour (cette semaine)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockDailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="jour" stroke="#a0aec0" fontSize={12} />
              <YAxis stroke="#a0aec0" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="ventes" fill="#5a2d82" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl border border-[#2d3748] overflow-hidden">
        <div className="p-6 border-b border-[#2d3748]">
          <h3 className="text-white font-bold">Detail par produit</h3>
        </div>
        <table className="w-full">
          <thead className="bg-[#0f1419]">
            <tr>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Produit</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">CA (30j)</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Profit (30j)</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Marge</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Unites</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-[#2d3748] hover:bg-[#2d3748]/30">
                <td className="px-6 py-4">
                  <p className="text-white text-sm font-medium">{p.name}</p>
                  <p className="text-[#a0aec0] text-xs">{p.asin}</p>
                </td>
                <td className="px-6 py-4 text-white text-sm">{formatCurrency(p.revenue_30d || 0)}</td>
                <td className="px-6 py-4 text-[#10b981] text-sm">{formatCurrency(p.profit_30d || 0)}</td>
                <td className="px-6 py-4 text-white text-sm">
                  {p.revenue_30d > 0 ? ((p.profit_30d / p.revenue_30d) * 100).toFixed(1) : 0}%
                </td>
                <td className="px-6 py-4 text-white text-sm">{formatNumber(p.units_sold_30d || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-12 text-center text-[#a0aec0]">Ajoutez des produits pour voir les donnees de ventes.</div>
        )}
      </div>
    </div>
  )
}
