import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ContratDetailClient from './ContratDetailClient'

export default async function ContratDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { signe?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion?next=/mon-espace/contrats/' + params.id)

  const { data: contrat } = await supabase
    .from('contrats_location')
    .select('*, bien:biens(id, titre, adresse, quartier, ville, type_bien, superficie), locataire:profiles!contrats_location_locataire_id_fkey(id, nom, phone), proprietaire:profiles!contrats_location_proprietaire_id_fkey(id, nom, phone)')
    .eq('id', params.id)
    .single()

  if (!contrat) notFound()

  return <ContratDetailClient contrat={contrat as any} userId={user.id} justSigned={searchParams.signe === 'true'} />
}
