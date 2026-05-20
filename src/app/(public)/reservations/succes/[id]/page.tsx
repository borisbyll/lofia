import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SuccesClient from './SuccesClient'

export default async function SuccesPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/connexion?next=/reservations/succes/${params.id}`)

  const { data: resa } = await supabaseAdmin
    .from('reservations')
    .select(`
      id, date_debut, date_fin, nb_nuits, prix_total, heure_arrivee_prevue,
      bien:biens!bien_id(titre, ville, adresse, latitude, longitude, photos),
      proprietaire:profiles!proprietaire_id(nom, phone)
    `)
    .eq('id', params.id)
    .eq('locataire_id', session.user.id)
    .single()

  if (!resa) redirect('/mon-espace/reservations')

  return <SuccesClient resa={resa as any} />
}
