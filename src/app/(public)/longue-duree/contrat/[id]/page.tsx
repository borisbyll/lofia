import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import ContratLongueDureeClient from './ContratLongueDureeClient'

interface Props { params: { id: string } }

export default async function ContratLongueDureePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/connexion?next=/longue-duree/contrat/${params.id}`)

  const { data: contrat } = await supabaseAdmin
    .from('contrats_location')
    .select('*, bien:biens(titre,ville), locataire:profiles!locataire_id(nom,phone), proprietaire:profiles!proprietaire_id(nom,phone)')
    .eq('id', params.id)
    .single()

  if (!contrat) redirect('/mon-espace/locations')
  if (contrat.locataire_id !== user.id && contrat.proprietaire_id !== user.id) redirect('/mon-espace/locations')

  return <ContratLongueDureeClient contrat={contrat as any} userId={user.id} />
}
