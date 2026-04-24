import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import DossierVenteUserClient from './DossierVenteUserClient'

export default async function DossierVenteDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: dossier } = await supabaseAdmin
    .from('dossiers_vente')
    .select('*, bien:biens(id, titre, ville, photo_principale, prix, adresse), acheteur:profiles!acheteur_id(id, nom, phone), vendeur:profiles!vendeur_id(id, nom, phone), promesse:promesses_vente(id, statut, pdf_url, token_acheteur, token_vendeur)')
    .eq('id', params.id)
    .or(`acheteur_id.eq.${user.id},vendeur_id.eq.${user.id}`)
    .single()

  if (!dossier) redirect('/mon-espace/ventes')

  return <DossierVenteUserClient dossier={dossier as any} userId={user.id} />
}
