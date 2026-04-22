import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import MisesEnRelationClient from './MisesEnRelationClient'

export default async function MisesEnRelationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: mers } = await supabaseAdmin
    .from('mises_en_relation')
    .select('*, bien:biens(id, titre, ville, photo_principale), locataire:profiles!mises_en_relation_locataire_id_fkey(id, nom, phone), proprietaire:profiles!mises_en_relation_proprietaire_id_fkey(id, nom, phone)')
    .or(`locataire_id.eq.${user.id},proprietaire_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return <MisesEnRelationClient mers={(mers ?? []) as any[]} userId={user.id} />
}
