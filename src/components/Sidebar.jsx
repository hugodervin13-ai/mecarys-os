import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../lib/store'

const menuItems = [
  { label: 'Dashboard', path: '/', icon: 'grid', color: '#6366f1' },
  { label: 'Ventes & Profit', path: '/ventes-profit', icon: 'trending', color: '#10b981' },
  { label: 'Produits', path: '/produits', icon: 'box', color: '#f59e0b' },
  { label: 'Concurrents', path: '/concurrents', icon: 'users', color: '#ef4444' },
  { label: 'Analyse IA', path: '/analyse-ia', icon: 'zap', color: '#8b5cf6' },
  { label: 'Fournisseurs', path: '/fournisseurs', icon: 'building', color: '#06b6d4' },
  { label: 'Commandes', path: '/commandes', icon: 'clipboard', color: '#f97316' },
  { label: 'Expeditions', path: '/expeditions', icon: 'truck', color: '#3b82f6' },
  { label: 'Stock', path: '/stock', icon: 'archive', color: '#14b8a6' },
  { label: 'Qualite & SAV', path: '/qualite-sav', icon: 'shield', color: '#ec4899' },
  { label: 'Documents', path: '/documents', icon: 'file', color: '#64748b' },
  { label: 'Parametres', path: '/parametres', icon: 'settings', color: '#6b7280' },
]

const iconPaths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  box: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  building: <><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></>,
  clipboard: <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></>,
  truck: <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  archive: <><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
}

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name]}
    </svg>
  )
}

export default function Sidebar() {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useStore()
  const w = sidebarOpen ? 240 : 68

  return (
    <aside
      style={{
        width: w, minWidth: w, maxWidth: w,
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        background: '#ffffff',
        borderRight: '1px solid #e8e8e3',
        height: '100vh',
        position: 'fixed', left: 0, top: 0, zIndex: 30,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: sidebarOpen ? '20px 16px 16px' : '20px 0 16px', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <img src="/logo.svg" alt="MECARYS" style={{ width: 36, height: 36, flexShrink: 0 }} />
          {sidebarOpen && <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>MECARYS OS</span>}
        </div>
        <button
          onClick={toggleSidebar}
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e8e8e3', background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: sidebarOpen ? 0 : 0 }}
          title={sidebarOpen ? 'Reduire' : 'Agrandir'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {sidebarOpen
              ? <><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></>
              : <><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></>
            }
          </svg>
        </button>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: '#f0f0eb', margin: '0 12px' }}/>

      {/* Nav */}
      <nav style={{ flex: 1, padding: sidebarOpen ? '12px 10px' : '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                title={sidebarOpen ? undefined : item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: sidebarOpen ? '9px 12px' : '9px 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? item.color : '#6b7280',
                  background: active ? `${item.color}10` : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#f5f5f0'; e.currentTarget.style.color = '#374151' }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280' }}}
              >
                <span style={{ flexShrink: 0, display: 'flex' }}>
                  <Icon name={item.icon} />
                </span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Account */}
      <div style={{ padding: sidebarOpen ? '12px 14px' : '12px 0', borderTop: '1px solid #f0f0eb', display: 'flex', alignItems: 'center', gap: 10, justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
        <img src="/logo.svg" alt="M" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
        {sidebarOpen && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>MECARYS</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Compte principal</div>
          </div>
        )}
      </div>
    </aside>
  )
}
