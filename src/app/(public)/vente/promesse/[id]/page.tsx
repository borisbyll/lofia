import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import PromesseVenteClient from './PromesseVenteClient'

interface Props { params: { id: string } }

export default async function PromesseVentePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/connexion?next=/vente/promesse/${params.id}`)

  const { data: promesse } = await supabaseAdmin
    .from('promesses_vente')
    .select('*, bien:biens(titre,ville,photo_principale), acheteur:profiles!acheteur_id(nom,phone), vendeur:profiles!vendeur_id(nom,phone)')
    .eq('id', params.id)
    .single()

  if (!promesse) redirect('/mon-espace/ventes')
  if (promesse.acheteur_id !== user.id && promesse.vendeur_id !== user.id) redirect('/mon-espace/ventes')

  return <PromesseVenteClient promesse={promesse as any} userId={user.id} />
}
