import { supabaseAdmin } from '@/lib/supabase/admin'
import DecisionLocataireClient from './DecisionLocataireClient'

interface Props { searchParams: { token?: string; reponse?: string } }

export default async function DecisionLocatairePage({ searchParams }: Props) {
  const { token, reponse } = searchParams

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
    .from('dossiers_longue_duree')
    .select('id, statut, token_decision_expire_at, locataire_interesse, bien:biens(titre, ville, photo_principale)')
    .eq('token_decision_locataire', token)
    .maybeSingle()

  return <DecisionLocataireClient dossier={dossier as any} token={token} reponseInitiale={reponse} />
}
