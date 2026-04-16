import Link from 'next/link'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex flex-col items-center justify-center p-6 text-center">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-3xl bg-primary-100 flex items-center justify-center mx-auto">
          <Home size={56} className="text-primary-300" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
          <Search size={18} className="text-accent-500" />
        </div>
      </div>

      {/* Texte */}
      <div className="max-w-sm">
        <p className="text-6xl font-black text-primary-500 mb-2">404</p>
        <h1 className="text-2xl font-black text-gray-900 mb-3">Page introuvable</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Cette annonce ou cette page n'existe pas ou a été supprimée.
          Explorez nos annonces disponibles.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn btn-primary gap-2">
            <Home size={16} />
            Retour à l'accueil
          </Link>
          <Link href="/vente" className="btn btn-outline gap-2">
            <ArrowLeft size={16} />
            Voir les annonces
          </Link>
        </div>
      </div>
    </div>
  )
}
