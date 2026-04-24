import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DemanderVisiteVenteClient from './DemanderVisiteVenteClient'

interface Props { params: { slug: string } }

export default async function DemanderVisiteVentePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/connexion?next=/biens/${params.slug}/demander-visite-vente`)

  const { data: bien } = await supabase
    .from('biens')
    .select('id, titre, ville, quartier, photo_principale, prix, owner_id, statut, categorie')
    .eq('slug', params.slug)
    .eq('statut', 'publie')
    .eq('categorie', 'vente')
    .single()

  if (!bien) notFound()
  if (bien.owner_id === user.id) redirect(`/biens/${params.slug}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('nom, phone')
    .eq('id', user.id)
    .single()

  return <DemanderVisiteVenteClient bien={bien as any} userId={user.id} profile={profile as any} />
}
