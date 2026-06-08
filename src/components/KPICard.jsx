const bgColors = {
  yellow: '#f59e0b',
  green: '#10b981',
  blue: '#3b82f6',
  red: '#ef4444',
  purple: '#5a2d82',
}

export default function KPICard({ title, value, change, icon, color = 'purple', subtitle = 'vs hier' }) {
  const bg = bgColors[color] || bgColors.purple
  const isPositive = change >= 0

  return (
    <div style={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${bg}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ color: '#8b95a5', fontSize: 12, lineHeight: '1.3' }}>{title}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: isPositive ? '#10b981' : '#ef4444' }}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}% {subtitle}
      </div>
    </div>
  )
}
