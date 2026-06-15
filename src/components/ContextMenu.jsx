import { useEffect } from 'react'

// Menu contextuel moderne. `items` : [{ icon, label, onClick, danger }] ou { divider:true }.
export default function ContextMenu({ x, y, items, onClose }) {
  useEffect(() => {
    const close = () => onClose()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('click', close)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const realItems = items.filter(Boolean)
  const left = Math.min(x, window.innerWidth - 210)
  const top = Math.min(y, window.innerHeight - (realItems.length * 38 + 16))

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', left, top, zIndex: 200, minWidth: 190,
        background: '#fff', border: '1px solid #e8e8e3', borderRadius: 12,
        boxShadow: '0 12px 44px rgba(0,0,0,0.18)', padding: 6,
        animation: 'mecarysPop 0.12s ease-out',
      }}
    >
      {realItems.map((it, i) =>
        it.divider ? (
          <div key={i} style={{ height: 1, background: '#f0f0eb', margin: '4px 6px' }} />
        ) : (
          <button
            key={i}
            onClick={() => { it.onClick(); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 11, width: '100%',
              padding: '8px 12px', border: 'none', background: 'none', borderRadius: 8,
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              color: it.danger ? '#ef4444' : '#1a1a2e', textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = it.danger ? '#ef444410' : '#f5f5f0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{it.icon}</span>
            {it.label}
          </button>
        )
      )}
    </div>
  )
}
