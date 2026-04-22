'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'

export default function ConfirmationSignatureClient() {
  const params = useSearchParams()
  const success = params.get('success') === 'true'
  const error   = params.get('error')

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {success ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-brun-nuit mb-2">Signature enregistrée</h1>
            <p className="text-brun-doux mb-6">Votre signature a bien été prise en compte. Connectez-vous pour suivre l&apos;état du document.</p>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-brun-nuit mb-2">Lien invalide</h1>
            <p className="text-brun-doux mb-6">
              {error === 'token_manquant' && 'Le lien de signature est incomplet.'}
              {error === 'token_invalide' && 'Ce lien de signature est invalide ou a déjà été utilisé.'}
              {!error && 'Une erreur est survenue.'}
            </p>
          </>
        )}
        <Link href="/mon-espace" className="btn-primary">
          Accéder à mon espace
        </Link>
      </div>
    </div>
  )
}
