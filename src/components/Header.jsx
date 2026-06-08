import { signOut } from '../lib/supabase'
import { useStore } from '../lib/store'

export default function Header() {
  const { logout } = useStore()

  const handleLogout = async () => {
    await signOut()
    logout()
  }

  return (
    <header style={{
      height: 56, padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
      background: '#ffffff', borderBottom: '1px solid #e8e8e3',
      flexShrink: 0,
    }}>
      <select style={{
        fontSize: 12, padding: '6px 12px', borderRadius: 8,
        border: '1px solid #e8e8e3', background: '#fafaf8', color: '#6b7280', cursor: 'pointer',
      }}>
        <option>Aujourd&apos;hui</option>
        <option>7 jours</option>
        <option>30 jours</option>
        <option>90 jours</option>
      </select>

      <button style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, border: '1px solid #e8e8e3', background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }}></span>
      </button>

      <button style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e8e8e3', background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </button>

      <button onClick={handleLogout} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px' }}>
        Deconnexion
      </button>
    </header>
  )
}
