import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#5a2d82] mb-4">404</h1>
        <p className="text-[#a0aec0] mb-8">Page introuvable</p>
        <Link
          to="/"
          className="bg-[#5a2d82] hover:bg-[#6b3d92] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Retour au Dashboard
        </Link>
      </div>
    </div>
  )
}
