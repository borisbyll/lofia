import { supabaseAdmin } from '@/lib/supabase/admin'
import SignerContratClient from './SignerContratClient'

interface Props { searchParams: { token?: string } }

export default async function SignerContratPage({ searchParams }: Props) {
  const { token } = searchParams
  if (!token) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="text-red-600 font-semibold">Lien invalide.</p>
    </div>
  )

  const locataire = await supabaseAdmin
    .from('contrats_location')
    .select('id, numero_contrat, statut, signe_par_locataire, signe_par_proprietaire, pdf_url, loyer_mensuel, duree_mois, date_debut, bien:biens(titre)')
    .eq('token_signature_locataire', token)
    .maybeSingle()

  const proprietaire = await supabaseAdmin
    .from('contrats_location')
    .select('id, numero_contrat, statut, signe_par_locataire, signe_par_proprietaire, pdf_url, loyer_mensuel, duree_mois, date_debut, bien:biens(titre)')
    .eq('token_signature_proprietaire', token)
    .maybeSingle()

  const contrat = locataire.data ?? proprietaire.data
  const partie  = locataire.data ? 'locataire' : 'proprietaire'

  return <SignerContratClient contrat={contrat as any} token={token} partie={partie} />
}
