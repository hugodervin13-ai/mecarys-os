import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'
import { useStore } from '../lib/store'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser } = useStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const fn = isSignUp ? signUp : signIn
      const { data, error: authError } = await fn(email, password)

      if (authError) throw authError
      if (data?.user) setUser(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center px-4">
      <div className="bg-[#1a1f2e] rounded-2xl p-10 w-full max-w-md border border-[#2d3748]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#5a2d82] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">MECARYS OS</h1>
          </div>
          <p className="text-[#a0aec0] text-sm">
            {isSignUp ? 'Creez votre compte' : 'Connectez-vous a votre espace'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[#a0aec0] text-sm mb-2">Email</label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f1419] text-white rounded-lg border border-[#2d3748] focus:border-[#5a2d82] focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[#a0aec0] text-sm mb-2">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f1419] text-white rounded-lg border border-[#2d3748] focus:border-[#5a2d82] focus:outline-none transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#5a2d82] hover:bg-[#6b3d92] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Chargement...' : isSignUp ? "S'inscrire" : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="text-[#a0aec0] hover:text-white text-sm transition-colors"
          >
            {isSignUp ? "J'ai deja un compte" : "Creer un compte"}
          </button>
        </div>
      </div>
    </div>
  )
}
