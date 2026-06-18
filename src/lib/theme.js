// MECARYS OS — Design system central
// Toutes les pages importent ces tokens au lieu de les redéfinir.

export const colors = {
  bg: '#f5f5f0',
  surface: '#ffffff',
  border: '#e8e8e3',
  borderLight: '#f0f0eb',
  inputBg: '#fafaf8',
  text: '#1a1a2e',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
}

// Ombres standardisées (profondeur cohérente sur toute l'app)
export const shadow = {
  sm: '0 1px 2px rgba(16,24,40,0.05)',
  md: '0 4px 12px rgba(16,24,40,0.08)',
  lg: '0 12px 32px rgba(16,24,40,0.12)',
  xl: '0 24px 64px rgba(16,24,40,0.18)',
}

// Échelles partagées
export const radius  = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 }
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }

export const box = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  boxShadow: shadow.sm,
}

export const inp = {
  width: '100%',
  padding: '9px 12px',
  background: colors.inputBg,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.text,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

export const lbl = {
  fontSize: 12,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 5,
  display: 'block',
}

export const btnPrimary = {
  padding: '10px 20px',
  background: colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

export const btnSecondary = {
  padding: '10px 18px',
  background: '#fff',
  color: colors.primary,
  border: `1px solid ${colors.primary}`,
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

export const btnDanger = {
  fontSize: 12,
  color: colors.danger,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
}

export const tableHeader = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: colors.textFaint,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  whiteSpace: 'nowrap',
}

export const pageTitle = { fontSize: 24, fontWeight: 700, color: colors.text }
export const pageSubtitle = { fontSize: 13, color: colors.textFaint, marginTop: 3 }
