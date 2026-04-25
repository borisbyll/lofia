import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import PayerDemandeClient from './PayerDemandeClient'

interface Props { params: { id: string } }

export default async function PayerDemandePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/connexion?next=/reservations/payer/${params.id}`)

  const { data: demande } = await supabaseAdmin
    .from('demandes_reservation')
    .select('*, biens(id, titre, prix, photos, photo_principale, ville)')
    .eq('id', params.id)
    .single()

  if (!demande) notFound()
  if (demande.locataire_id !== session.user.id) notFound()
  if (demande.statut !== 'confirmee') redirect(`/reservations/demandes/${params.id}`)

  // Vérifier expiration
  if (demande.lien_paiement_expire_at && new Date(demande.lien_paiement_expire_at) < new Date()) {
    redirect(`/reservations/demandes/${params.id}`)
  }

  return <PayerDemandeClient demande={demande} />
}
