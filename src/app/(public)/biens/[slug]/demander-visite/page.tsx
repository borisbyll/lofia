import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DemanderVisiteLongueDureeClient from './DemanderVisiteLongueDureeClient'

interface Props { params: { slug: string } }

export default async function DemanderVisiteLongueDureePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/connexion?next=/biens/${params.slug}/demander-visite`)

  const { data: bien } = await supabase
    .from('biens')
    .select('id, titre, ville, quartier, photo_principale, prix, owner_id, statut, type_location')
    .eq('slug', params.slug)
    .eq('statut', 'publie')
    .eq('type_location', 'longue_duree')
    .single()

  if (!bien) notFound()
  if (bien.owner_id === user.id) redirect(`/biens/${params.slug}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('nom, phone')
    .eq('id', user.id)
    .single()

  return <DemanderVisiteLongueDureeClient bien={bien as any} userId={user.id} profile={profile as any} />
}
