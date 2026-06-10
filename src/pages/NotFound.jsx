import { Link } from 'react-router-dom'
import { colors } from '../lib/theme'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: colors.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 60, fontWeight: 700, color: colors.primary, marginBottom: 16 }}>404</h1>
        <p style={{ color: colors.textMuted, marginBottom: 32 }}>Page introuvable</p>
        <Link
          to="/"
          style={{ background: colors.primary, color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}
        >
          Retour au Dashboard
        </Link>
      </div>
    </div>
  )
}
