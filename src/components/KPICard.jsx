export default function KPICard({ title, value, change, icon, color = '#6366f1', subtitle = 'vs hier' }) {
  const isPositive = change >= 0

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e8e8e3',
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ color: '#6b7280', fontSize: 12 }}>{title}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1a1a2e', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: isPositive ? '#10b981' : '#ef4444' }}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}% {subtitle}
      </div>
    </div>
  )
}
