import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import VirementClient from './VirementClient'

interface Props { params: { dossier_id: string } }

export default async function VirementPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/connexion?next=/vente/virement/${params.dossier_id}`)

  const { data: dossier } = await supabaseAdmin
    .from('dossiers_vente')
    .select('*, bien:biens(titre,ville), promesse:promesses_vente(prix_vente,numero_promesse,banque_vendeur,numero_compte_vendeur,nom_compte_vendeur,commission_lofia,taux_commission)')
    .eq('id', params.dossier_id)
    .single()

  if (!dossier) redirect('/mon-espace/ventes')
  if (dossier.acheteur_id !== user.id && dossier.vendeur_id !== user.id) redirect('/mon-espace/ventes')

  return <VirementClient dossier={dossier as any} userId={user.id} />
}
