import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import VisiteVenteDetailClient from './VisiteVenteDetailClient'

export default async function VisiteVenteDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: dvv } = await supabaseAdmin
    .from('demandes_visite_vente')
    .select('*, bien:biens(id, titre, ville, photos, prix, photo_principale), acheteur:profiles!demandes_visite_vente_acheteur_id_fkey(id, nom, phone), vendeur:profiles!demandes_visite_vente_vendeur_id_fkey(id, nom, phone)')
    .eq('id', params.id)
    .or(`acheteur_id.eq.${user.id},vendeur_id.eq.${user.id}`)
    .single()

  if (!dvv) redirect('/mon-espace/ventes')

  const { data: offre } = await supabaseAdmin
    .from('offres_achat')
    .select('*')
    .eq('demande_visite_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return <VisiteVenteDetailClient dvv={dvv as any} offre={offre as any} userId={user.id} />
}
