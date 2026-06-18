// Placeholder affiché pendant le chargement lazy d'un graphique Recharts.
export default function ChartSkeleton({ height = 240, dark = false }) {
  return (
    <div style={{
      width: '100%', height, borderRadius: 10,
      background: dark
        ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)'
        : 'linear-gradient(90deg, #f3f3ef 25%, #ebebe6 50%, #f3f3ef 75%)',
      backgroundSize: '200% 100%',
      animation: 'chartShimmer 1.3s ease infinite',
    }}>
      <style>{`@keyframes chartShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  )
}
