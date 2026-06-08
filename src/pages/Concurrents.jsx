import { useEffect, useState } from 'react'
import { getAllCompetitors } from '../lib/supabase'
import { useStore } from '../lib/store'
import { formatCurrency } from '../lib/utils'
import Loading from '../components/Loading'

export default function Concurrents() {
  const { user } = useStore()
  const [competitors, setCompetitors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const { data } = await getAllCompetitors(user.id)
    setCompetitors(data || [])
    setLoading(false)
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">Concurrents</h1>
        <button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          + Ajouter un concurrent
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e3] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#fafaf8]">
            <tr>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">ASIN concurrent</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Nom</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Prix</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Note</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Ecart prix</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Votre produit</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((c) => (
              <tr key={c.id} className="border-t border-[#e8e8e3] hover:bg-[#f5f5f0]">
                <td className="px-6 py-4 text-[#1a1a2e] text-sm font-mono">{c.competitor_asin}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{c.competitor_name}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{formatCurrency(c.competitor_price || 0)}</td>
                <td className="px-6 py-4">
                  <span className="bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-1 rounded-full text-xs">
                    ★ {c.competitor_rating || 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${(c.price_difference || 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {(c.price_difference || 0) >= 0 ? '+' : ''}{formatCurrency(c.price_difference || 0)}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{c.products?.name} ({c.products?.asin})</td>
              </tr>
            ))}
          </tbody>
        </table>
        {competitors.length === 0 && (
          <div className="p-12 text-center text-[#6b7280]">
            Aucun concurrent suivi. Ajoutez des concurrents a vos produits pour les suivre.
          </div>
        )}
      </div>
    </div>
  )
}
