import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import DemanderReservationClient from './DemanderReservationClient'

interface Props { params: { slug: string } }

export default async function DemanderReservationPage({ params }: Props) {
  const { data: bien } = await supabaseAdmin
    .from('biens')
    .select('id, titre, prix, type_location, adresse, ville, photos, photo_principale, owner_id, slug')
    .eq('slug', params.slug)
    .eq('statut', 'publie')
    .single()

  if (!bien) notFound()
  if (bien.type_location !== 'courte_duree') redirect(`/biens/${params.slug}`)

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/connexion?next=/biens/${params.slug}/demander-reservation`)

  return <DemanderReservationClient bien={bien} />
}
