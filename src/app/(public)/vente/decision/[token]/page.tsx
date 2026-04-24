import { supabaseAdmin } from '@/lib/supabase/admin'
import DecisionAcheteurClient from './DecisionAcheteurClient'

interface Props { searchParams: { token?: string } }

export default async function DecisionAcheteurPage({ searchParams }: Props) {
  const { token } = searchParams

  if (!token) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-semibold">Lien invalide ou expiré.</p>
        </div>
      </div>
    )
  }

  const { data: dossier } = await supabaseAdmin
    .from('dossiers_vente')
    .select('id, statut, acheteur_interesse, bien:biens(titre, ville, photo_principale, prix)')
    .eq('token_decision_acheteur', token)
    .maybeSingle()

  return <DecisionAcheteurClient dossier={dossier as any} token={token} />
}
