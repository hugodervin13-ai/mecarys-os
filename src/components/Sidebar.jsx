import { Link, useLocation } from 'react-router-dom'

const menuItems = [
  { label: 'Dashboard', path: '/', icon: 'grid' },
  { label: 'Ventes & Profit', path: '/ventes-profit', icon: 'trending' },
  { label: 'Produits', path: '/produits', icon: 'box' },
  { label: 'Concurrents', path: '/concurrents', icon: 'users' },
  { label: 'Analyse IA', path: '/analyse-ia', icon: 'zap' },
  { label: 'Fournisseurs', path: '/fournisseurs', icon: 'building' },
  { label: 'Commandes', path: '/commandes', icon: 'clipboard' },
  { label: 'Expeditions', path: '/expeditions', icon: 'truck' },
  { label: 'Stock', path: '/stock', icon: 'archive' },
  { label: 'Qualite & SAV', path: '/qualite-sav', icon: 'shield' },
  { label: 'Documents', path: '/documents', icon: 'file' },
  { label: 'Comptabilite', path: '/comptabilite', icon: 'calculator' },
  { label: 'Parametres', path: '/parametres', icon: 'settings' },
]

const icons = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  box: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  building: <><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></>,
  clipboard: <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></>,
  truck: <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  archive: <><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  calculator: <><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><line x1="8" y1="11" x2="8" y2="11"/><line x1="12" y1="11" x2="12" y2="11"/><line x1="16" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="8" y1="19" x2="8" y2="19"/><line x1="12" y1="19" x2="12" y2="19"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
}

function Icon({ name }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside style={{ width: 220, minWidth: 220 }} className="bg-[#1a1f2e] border-r border-[#2d3748] h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 pt-5 pb-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#5a2d82] flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span className="font-bold text-white text-[15px] tracking-tight">MECARYS OS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-[2px]">
        {menuItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-[10px] rounded-lg text-[13px] transition-all duration-150 ${
                active
                  ? 'bg-[#5a2d82] text-white font-semibold'
                  : 'text-[#8b95a5] hover:bg-[#232a3b] hover:text-[#c0c8d4] font-medium'
              }`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Account */}
      <div className="px-4 py-4 border-t border-[#2d3748]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#5a2d82] rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0">M</div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[13px] font-semibold truncate">MECARYS</p>
            <p className="text-[#636d7e] text-[11px] truncate">Compte principal</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#636d7e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </aside>
  )
}
