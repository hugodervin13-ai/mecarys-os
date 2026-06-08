import { useState } from 'react'

export default function AnalyseIA() {
  const [asin, setAsin] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)

  const handleAnalyze = (e) => {
    e.preventDefault()
    if (!asin.trim()) return
    setAnalyzing(true)

    setTimeout(() => {
      setResult({
        asin,
        score: 78,
        market: 'Bonne opportunite - marche en croissance',
        pricing: 'Prix competitif, marge possible de 25-30%',
        competition: '12 concurrents directs, 3 dominants',
        recommendations: [
          'Ameliorer les images principales (lifestyle)',
          'Ajouter une video produit',
          'Optimiser les bullet points avec mots-cles longue traine',
          'Lancer une campagne PPC avec budget 15€/jour'
        ]
      })
      setAnalyzing(false)
    }, 2000)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1a1a2e] mb-6">Analyse IA</h1>

      <div className="bg-white rounded-xl p-6 border border-[#e8e8e3] mb-8">
        <h2 className="text-[#1a1a2e] font-bold mb-4">Analyser un ASIN</h2>
        <p className="text-[#6b7280] text-sm mb-4">
          Entrez un ASIN Amazon pour obtenir une analyse complete : marche, concurrence, prix, et recommandations.
        </p>
        <form onSubmit={handleAnalyze} className="flex gap-4">
          <input
            type="text"
            placeholder="Ex: B08N5WRWNW"
            value={asin}
            onChange={(e) => setAsin(e.target.value)}
            className="flex-1 px-4 py-3 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] focus:border-[#6366f1] focus:outline-none"
          />
          <button
            type="submit"
            disabled={analyzing}
            className="bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {analyzing ? 'Analyse en cours...' : '✨ Analyser'}
          </button>
        </form>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
              <h3 className="text-[#6b7280] text-sm mb-2">Score global</h3>
              <div className="text-4xl font-bold text-[#10b981]">{result.score}/100</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
              <h3 className="text-[#6b7280] text-sm mb-2">Marche</h3>
              <p className="text-[#1a1a2e]">{result.market}</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
              <h3 className="text-[#6b7280] text-sm mb-2">Concurrence</h3>
              <p className="text-[#1a1a2e]">{result.competition}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
            <h3 className="text-[#1a1a2e] font-bold mb-2">Pricing</h3>
            <p className="text-[#6b7280]">{result.pricing}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
            <h3 className="text-[#1a1a2e] font-bold mb-4">Recommandations</h3>
            <div className="space-y-3">
              {result.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 bg-[#fafaf8] rounded-lg p-4">
                  <span className="text-[#6366f1] font-bold">{i + 1}.</span>
                  <p className="text-[#6b7280]">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && !analyzing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
            <h3 className="text-[#1a1a2e] font-bold mb-2">Analyse de marche</h3>
            <p className="text-[#6b7280] text-sm">Evaluez le potentiel d'un produit avec notre IA.</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
            <h3 className="text-[#1a1a2e] font-bold mb-2">Optimisation listing</h3>
            <p className="text-[#6b7280] text-sm">Recevez des suggestions pour ameliorer vos fiches produits.</p>
          </div>
        </div>
      )}
    </div>
  )
}
