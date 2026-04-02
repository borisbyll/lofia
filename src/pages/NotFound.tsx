import { Link } from 'react-router-dom'
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-8xl font-black text-gray-100">404</p>
      <h1 className="text-2xl font-black text-gray-900 mt-4 mb-2">Page introuvable</h1>
      <p className="text-gray-500 mb-8">Cette page n'existe pas ou a été déplacée.</p>
      <Link to="/" className="btn-primary">Retour à l'accueil</Link>
    </div>
  )
}
