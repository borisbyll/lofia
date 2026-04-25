import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import DemandeDetailClient from './DemandeDetailClient'

interface Props { params: { id: string } }

export default async function DemandeDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/connexion?next=/reservations/demandes/${params.id}`)

  const { data: demande } = await supabaseAdmin
    .from('demandes_reservation')
    .select('*, biens(id, titre, prix, photos, photo_principale, ville, adresse)')
    .eq('id', params.id)
    .single()

  if (!demande) notFound()
  if (demande.locataire_id !== session.user.id) notFound()

  return <DemandeDetailClient demande={demande} />
}
