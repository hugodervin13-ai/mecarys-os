import { useEffect, useState } from 'react'
import { getProducts } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatNumber } from '../lib/utils'
import Loading from '../components/Loading'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export default function Stock() {
  const { user } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const { data } = await getProducts(user.id)
    setProducts(data || [])
    setLoading(false)
  }

  const totalStock = products.reduce((a, p) => a + (p.stock_fba || 0), 0)
  const lowStock = products.filter(p => (p.stock_fba || 0) <= (p.stock_alerte || 20))
  const outOfStock = products.filter(p => (p.stock_fba || 0) === 0)

  const chartData = products.map(p => ({
    name: p.asin || p.name?.substring(0, 10),
    stock: p.stock_fba || 0,
    alerte: p.stock_alerte || 20
  }))

  if (loading) return <Loading />

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Stock</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Stock total FBA</p>
          <p className="text-2xl font-bold text-white mt-1">{formatNumber(totalStock)}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Produits suivis</p>
          <p className="text-2xl font-bold text-white mt-1">{products.length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Stock faible</p>
          <p className="text-2xl font-bold text-[#f59e0b] mt-1">{lowStock.length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Rupture</p>
          <p className="text-2xl font-bold text-[#ef4444] mt-1">{outOfStock.length}</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3748] mb-8">
          <h3 className="text-white font-bold mb-4">Niveaux de stock par produit</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="name" stroke="#a0aec0" fontSize={12} />
              <YAxis stroke="#a0aec0" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="stock" fill="#5a2d82" radius={[4, 4, 0, 0]} name="Stock actuel" />
              <Bar dataKey="alerte" fill="#ef4444" radius={[4, 4, 0, 0]} name="Seuil alerte" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-[#1a1f2e] rounded-xl border border-[#2d3748] overflow-hidden">
        <div className="p-6 border-b border-[#2d3748]">
          <h3 className="text-white font-bold">Detail du stock</h3>
        </div>
        <table className="w-full">
          <thead className="bg-[#0f1419]">
            <tr>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">ASIN</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Produit</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Stock FBA</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Seuil alerte</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Jours restants (est.)</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const dailySales = (p.units_sold_30d || 0) / 30
              const daysLeft = dailySales > 0 ? Math.round((p.stock_fba || 0) / dailySales) : '-'
              const isLow = (p.stock_fba || 0) <= (p.stock_alerte || 20)
              const isOut = (p.stock_fba || 0) === 0

              return (
                <tr key={p.id} className="border-t border-[#2d3748] hover:bg-[#2d3748]/30">
                  <td className="px-6 py-4 text-white text-sm font-mono">{p.asin}</td>
                  <td className="px-6 py-4 text-white text-sm">{p.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${isOut ? 'text-[#ef4444]' : isLow ? 'text-[#f59e0b]' : 'text-white'}`}>
                      {formatNumber(p.stock_fba || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#a0aec0] text-sm">{p.stock_alerte || 20}</td>
                  <td className="px-6 py-4 text-white text-sm">{daysLeft} {typeof daysLeft === 'number' ? 'jours' : ''}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${isOut ? 'bg-[#ef4444]/20 text-[#ef4444]' : isLow ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-[#10b981]/20 text-[#10b981]'}`}>
                      {isOut ? 'Rupture' : isLow ? 'Faible' : 'OK'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-12 text-center text-[#a0aec0]">
            Ajoutez des produits pour suivre votre stock.
          </div>
        )}
      </div>
    </div>
  )
}
