import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import MiseEnRelationDetailClient from './MiseEnRelationDetailClient'

export default async function MiseEnRelationDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: mer } = await supabaseAdmin
    .from('mises_en_relation')
    .select('*, bien:biens(id, titre, ville, adresse, quartier, photo_principale, prix, type_bien), locataire:profiles!mises_en_relation_locataire_id_fkey(id, nom, phone, avatar_url), proprietaire:profiles!mises_en_relation_proprietaire_id_fkey(id, nom, phone, avatar_url)')
    .eq('id', params.id)
    .or(`locataire_id.eq.${user.id},proprietaire_id.eq.${user.id}`)
    .single()

  if (!mer) redirect('/mon-espace/mises-en-relation')

  const { data: contrat } = await supabaseAdmin
    .from('contrats_location')
    .select('id, statut, numero_contrat')
    .eq('mise_en_relation_id', params.id)
    .maybeSingle()

  return <MiseEnRelationDetailClient mer={mer as any} contrat={contrat as any} userId={user.id} />
}
