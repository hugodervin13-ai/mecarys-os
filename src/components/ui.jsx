import { useStore } from '../lib/store'
import { colors } from '../lib/theme'

// ---------- Toasts ----------
const TOAST_STYLES = {
  error:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', icon: '⚠️' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: '✓' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: 'ℹ' },
}

export function ToastContainer() {
  const { toasts, removeToast } = useStore()
  if (toasts.length === 0) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
      {toasts.map(t => {
        const s = TOAST_STYLES[t.type] || TOAST_STYLES.error
        return (
          <div key={t.id}
            style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', animation: 'toastIn 0.2s ease' }}>
            <span style={{ flexShrink: 0 }}>{s.icon}</span>
            <span style={{ fontSize: 13, color: s.color, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', color: s.color, cursor: 'pointer', fontSize: 14, padding: 0, opacity: 0.6 }}>✕</button>
          </div>
        )
      })}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}

// ---------- Badge de statut générique ----------
export function StatusBadge({ label, color = colors.primary, icon }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${color}15`, color, border: `1px solid ${color}30`, whiteSpace: 'nowrap' }}>
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
    </span>
  )
}

// ---------- Badge "données de démonstration" ----------
export function DemoBadge() {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
      ⚡ Données de démonstration
    </span>
  )
}

// ---------- État vide ----------
export function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: colors.textFaint, maxWidth: 380, margin: '0 auto' }}>{subtitle}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

// ---------- Carte KPI ----------
export function KpiCard({ label, value, sub, icon, color = colors.primary }) {
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: colors.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{value}</p>
          {sub && <p style={{ fontSize: 11, color, marginTop: 4, fontWeight: 500 }}>{sub}</p>}
        </div>
        {icon && (
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        )}
      </div>
    </div>
  )
}

// ---------- En-tête de page ----------
export function PageHeader({ title, subtitle, badge, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>{title}</h1>
          {badge}
        </div>
        {subtitle && <p style={{ fontSize: 13, color: colors.textFaint, marginTop: 3 }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 8 }}>{children}</div>}
    </div>
  )
}
