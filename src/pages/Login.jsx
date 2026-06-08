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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-[22px] font-bold text-white tracking-tight">MECARYS OS</h1>
          </div>
          <p className="text-text-secondary text-[13px]">
            {isSignUp ? 'Creez votre compte pour commencer' : 'Connectez-vous a votre espace'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl p-7 border border-border">
          {error && (
            <div className="mb-5 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-[12px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-[12px] font-medium mb-1.5">Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-bg text-white rounded-lg border border-border focus:border-primary text-[13px] transition-colors placeholder:text-text-muted"
                required
              />
            </div>
            <div>
              <label className="block text-text-secondary text-[12px] font-medium mb-1.5">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-bg text-white rounded-lg border border-border focus:border-primary text-[13px] transition-colors placeholder:text-text-muted"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors mt-2"
            >
              {loading ? 'Chargement...' : isSignUp ? "S'inscrire" : 'Se connecter'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-text-secondary hover:text-white text-[12px] transition-colors"
            >
              {isSignUp ? "J'ai deja un compte" : "Creer un compte"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
