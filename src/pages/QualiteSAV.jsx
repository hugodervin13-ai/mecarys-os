import { useState } from 'react'

const mockReviews = [
  { id: 1, asin: 'B08N5WRWNW', rating: 2, text: "Produit conforme mais l'emballage etait abime.", date: '2024-05-12', status: 'pending' },
  { id: 2, asin: 'B09X1ZZKZL', rating: 1, text: "Ne fonctionne pas apres 2 semaines d'utilisation.", date: '2024-05-10', status: 'resolved' },
  { id: 3, asin: 'B08N5WRWNW', rating: 3, text: 'Correct mais la qualite a baisse par rapport a ma premiere commande.', date: '2024-05-08', status: 'pending' }
]

const mockReturns = [
  { id: 1, asin: 'B08N5WRWNW', reason: 'Defectueux', quantity: 3, date: '2024-05-11', cost: 84 },
  { id: 2, asin: 'B09X1ZZKZL', reason: 'Non conforme', quantity: 1, date: '2024-05-09', cost: 30 }
]

export default function QualiteSAV() {
  const [tab, setTab] = useState('reviews')

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1a1a2e] mb-6">Qualite & SAV</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Avis negatifs (30j)</p>
          <p className="text-2xl font-bold text-[#ef4444] mt-1">{mockReviews.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Retours (30j)</p>
          <p className="text-2xl font-bold text-[#f59e0b] mt-1">{mockReturns.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Taux de retour</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">2.3%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Cout des retours</p>
          <p className="text-2xl font-bold text-[#ef4444] mt-1">{mockReturns.reduce((a, r) => a + r.cost, 0)} &euro;</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTab('reviews')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'reviews' ? 'bg-[#6366f1] text-white' : 'text-[#6b7280] hover:text-[#1a1a2e]'}`}
        >
          Avis negatifs
        </button>
        <button
          onClick={() => setTab('returns')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'returns' ? 'bg-[#6366f1] text-white' : 'text-[#6b7280] hover:text-[#1a1a2e]'}`}
        >
          Retours
        </button>
      </div>

      {tab === 'reviews' && (
        <div className="space-y-4">
          {mockReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={`text-sm ${s <= review.rating ? 'text-[#f59e0b]' : 'text-[#d1d5db]'}`}>★</span>
                    ))}
                  </div>
                  <span className="text-[#6b7280] text-xs">{review.asin}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${review.status === 'resolved' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                  {review.status === 'resolved' ? 'Resolu' : 'A traiter'}
                </span>
              </div>
              <p className="text-[#1a1a2e] text-sm mb-2">{review.text}</p>
              <p className="text-[#6b7280] text-xs">{review.date}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'returns' && (
        <div className="bg-white rounded-xl border border-[#e8e8e3] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#fafaf8]">
              <tr>
                <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">ASIN</th>
                <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Raison</th>
                <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Quantite</th>
                <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Cout</th>
                <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {mockReturns.map((r) => (
                <tr key={r.id} className="border-t border-[#e8e8e3] hover:bg-[#f5f5f0]">
                  <td className="px-6 py-4 text-[#1a1a2e] text-sm font-mono">{r.asin}</td>
                  <td className="px-6 py-4 text-[#1a1a2e] text-sm">{r.reason}</td>
                  <td className="px-6 py-4 text-[#1a1a2e] text-sm">{r.quantity}</td>
                  <td className="px-6 py-4 text-[#ef4444] text-sm">{r.cost} &euro;</td>
                  <td className="px-6 py-4 text-[#6b7280] text-sm">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
