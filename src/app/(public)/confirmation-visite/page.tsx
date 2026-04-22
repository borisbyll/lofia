import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'
import { LogoLofia } from '@/components/lofia/LogoLofia'

export default function ConfirmationVisitePage({ searchParams }: { searchParams: { success?: string; error?: string; id?: string } }) {
  const ok = searchParams.success === 'true'
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-primary-50 shadow-sm p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-6"><LogoLofia variant="dark" className="text-2xl" /></div>
        {ok ? (
          <>
            <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
            <h1 className="text-xl font-black mb-2" style={{ color: '#1a0a00' }}>Visite confirmée</h1>
            <p className="text-sm mb-6" style={{ color: '#7a5c3a' }}>Votre confirmation a été enregistrée. Dès que les deux parties confirment, le contrat sera généré.</p>
          </>
        ) : (
          <>
            <XCircle size={48} className="mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-black mb-2" style={{ color: '#1a0a00' }}>Lien invalide</h1>
            <p className="text-sm mb-6" style={{ color: '#7a5c3a' }}>Ce lien est invalide ou a déjà été utilisé.</p>
          </>
        )}
        <Link href="/mon-espace" className="btn btn-primary w-full">Accéder à mon espace</Link>
      </div>
    </div>
  )
}
