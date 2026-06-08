export default function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'bounce 1s infinite', animationDelay: '-0.3s' }}></div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'bounce 1s infinite', animationDelay: '-0.15s' }}></div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'bounce 1s infinite' }}></div>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100% { transform: translateY(0) } 40% { transform: translateY(-8px) } }`}</style>
    </div>
  )
}
