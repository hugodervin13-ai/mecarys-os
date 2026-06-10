import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'
import { useStore } from '../lib/store'
import { colors, lbl } from '../lib/theme'

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
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.5px' }}>MECARYS OS</span>
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>
            {isSignUp ? 'Créez votre compte pour commencer' : 'Connectez-vous à votre espace'}
          </p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 16, padding: 32, border: '1px solid #e8e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {error && (
            <div style={{ marginBottom: 20, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#ef4444', fontSize: 12 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 10, color: '#1a1a2e', fontSize: 13 }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 10, color: '#1a1a2e', fontSize: 13 }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px 0', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Chargement...' : isSignUp ? "S'inscrire" : 'Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {isSignUp ? "J'ai déjà un compte" : "Créer un compte"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
