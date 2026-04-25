import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ForceMajeureClient from './ForceMajeureClient'

export default async function ForceMajeurePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/connexion?next=/mon-espace/reservations/${params.id}/force-majeure`)

  const { data: resa } = await supabase
    .from('reservations')
    .select('*, biens(titre, slug, ville)')
    .eq('id', params.id)
    .eq('locataire_id', session.user.id)
    .single()

  if (!resa) redirect('/mon-espace/reservations')

  const annulables = ['en_attente', 'confirmee', 'en_cours', 'force_majeure_en_cours']
  if (!annulables.includes(resa.statut)) redirect('/mon-espace/reservations')

  return <ForceMajeureClient reservation={resa} />
}
