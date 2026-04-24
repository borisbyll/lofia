import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import PayerPremierLoyerClient from './PayerPremierLoyerClient'

interface Props { params: { contrat_id: string } }

export default async function PayerPremierLoyerPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/connexion?next=/longue-duree/payer/${params.contrat_id}`)

  const { data: contrat } = await supabaseAdmin
    .from('contrats_location')
    .select('id, numero_contrat, locataire_id, loyer_mensuel, depot_garantie_montant, commission_lofia, total_premier_paiement, paiement_effectue, statut, bien:biens(titre)')
    .eq('id', params.contrat_id)
    .single()

  if (!contrat) redirect('/mon-espace/locations')
  if (contrat.locataire_id !== user.id) redirect('/mon-espace/locations')
  if (contrat.paiement_effectue) redirect(`/longue-duree/contrat/${contrat.id}`)

  return <PayerPremierLoyerClient contrat={contrat as any} userId={user.id} />
}
