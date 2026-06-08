const iconColors = {
  purple: 'bg-primary/15 text-primary-light',
  green: 'bg-success/15 text-success',
  orange: 'bg-warning/15 text-warning',
  red: 'bg-danger/15 text-danger',
  blue: 'bg-info/15 text-info',
}

export default function KPICard({ title, value, change, icon, color = 'purple', subtitle = 'vs hier' }) {
  const isPositive = change >= 0
  const colorClass = iconColors[color] || iconColors.purple

  return (
    <div className="bg-surface rounded-xl p-4 border border-border hover:border-border-light transition-colors">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${colorClass}`}>
          {icon}
        </div>
        <p className="text-text-secondary text-[12px] leading-tight">{title}</p>
      </div>
      <h3 className="text-[22px] font-bold text-white leading-none mb-1.5">{value}</h3>
      <p className={`text-[12px] font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}% {subtitle}
      </p>
    </div>
  )
}
