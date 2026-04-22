import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import PromesseDetailClient from './PromesseDetailClient'

export default async function PromesseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: promesse } = await supabaseAdmin
    .from('promesses_vente')
    .select('*, bien:biens(titre, ville), acheteur:profiles!promesses_vente_acheteur_id_fkey(nom, phone), vendeur:profiles!promesses_vente_vendeur_id_fkey(nom, phone)')
    .eq('id', params.id)
    .or(`acheteur_id.eq.${user.id},vendeur_id.eq.${user.id}`)
    .single()

  if (!promesse) redirect('/mon-espace/ventes')

  return <PromesseDetailClient promesse={promesse as any} userId={user.id} />
}
