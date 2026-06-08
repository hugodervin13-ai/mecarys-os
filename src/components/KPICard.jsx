export default function KPICard({ title, value, change, icon, subtitle }) {
  const isPositive = change >= 0

  return (
    <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#5a2d82]/20 flex items-center justify-center text-lg">
          {icon}
        </div>
        <p className="text-[#a0aec0] text-sm">{title}</p>
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <p className={`text-sm ${isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}% {subtitle || 'vs hier'}
      </p>
    </div>
  )
}
