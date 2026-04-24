import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import DossierVenteModClient from './DossierVenteModClient'

interface Props { params: { id: string } }

export default async function DossierVenteModPage({ params }: Props) {
  const { data: dossier } = await supabaseAdmin
    .from('dossiers_vente')
    .select('*, bien:biens(titre,ville,prix,photo_principale,adresse,quartier), acheteur:profiles!acheteur_id(nom,phone), vendeur:profiles!vendeur_id(nom,phone), agent:agents(nom,prenom,telephone), promesse:promesses_vente(id,numero_promesse,statut,pdf_url,prix_vente,commission_lofia,taux_commission)')
    .eq('id', params.id)
    .single()

  if (!dossier) redirect('/moderateur')

  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('id, nom, prenom, telephone')
    .eq('actif', true)

  return <DossierVenteModClient dossier={dossier as any} agents={(agents ?? []) as any[]} />
}
