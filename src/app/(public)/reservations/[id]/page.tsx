import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReservationDetailClient from './ReservationDetailClient'

export default async function ReservationDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/connexion?next=/reservations/${params.id}`)

  const { data: resa } = await supabase
    .from('reservations')
    .select(`
      id, statut, date_debut, date_fin, nb_nuits, prix_total, commission,
      montant_proprio, prix_nuit, paiement_effectue, paiement_at, check_in_at,
      fedapay_transaction_id,
      locataire_id, proprietaire_id,
      biens (
        id, titre, slug, adresse, ville, commune, quartier, latitude, longitude,
        photos, photo_principale, type_bien
      ),
      profiles!reservations_proprietaire_id_fkey (
        id, nom, phone, avatar_url
      )
    `)
    .eq('id', params.id)
    .single()

  if (!resa) redirect('/mon-espace/reservations')

  const userId = session.user.id
  const isLocataire = resa.locataire_id === userId
  const isProprietaire = resa.proprietaire_id === userId

  if (!isLocataire && !isProprietaire) redirect('/mon-espace/reservations')

  return <ReservationDetailClient reservation={resa as any} isLocataire={isLocataire} />
}
