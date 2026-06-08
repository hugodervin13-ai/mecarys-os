import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#6366f1] mb-4">404</h1>
        <p className="text-[#6b7280] mb-8">Page introuvable</p>
        <Link
          to="/"
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Retour au Dashboard
        </Link>
      </div>
    </div>
  )
}
