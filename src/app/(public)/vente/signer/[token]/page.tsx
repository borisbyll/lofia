import { supabaseAdmin } from '@/lib/supabase/admin'
import SignerPromesseClient from './SignerPromesseClient'

interface Props { searchParams: { token?: string } }

export default async function SignerPromessePage({ searchParams }: Props) {
  const { token } = searchParams
  if (!token) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="text-red-600 font-semibold">Lien invalide.</p>
    </div>
  )

  const acheteur = await supabaseAdmin
    .from('promesses_vente')
    .select('id, numero_promesse, statut, signe_par_acheteur, signe_par_vendeur, pdf_url, prix_vente, commission_lofia, taux_commission, bien:biens(titre)')
    .eq('token_signature_acheteur', token)
    .maybeSingle()

  const vendeur = await supabaseAdmin
    .from('promesses_vente')
    .select('id, numero_promesse, statut, signe_par_acheteur, signe_par_vendeur, pdf_url, prix_vente, commission_lofia, taux_commission, bien:biens(titre)')
    .eq('token_signature_vendeur', token)
    .maybeSingle()

  const promesse = acheteur.data ?? vendeur.data
  const partie   = acheteur.data ? 'acheteur' : 'vendeur'

  return <SignerPromesseClient promesse={promesse as any} token={token} partie={partie} />
}
