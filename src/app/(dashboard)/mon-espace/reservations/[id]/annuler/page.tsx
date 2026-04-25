import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnnulationClient from './AnnulationClient'

export default async function AnnulationPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/connexion?next=/mon-espace/reservations/${params.id}/annuler`)

  const { data: resa } = await supabase
    .from('reservations')
    .select('*, biens(titre, slug, photos, ville)')
    .eq('id', params.id)
    .eq('locataire_id', session.user.id)
    .single()

  if (!resa) redirect('/mon-espace/reservations')

  return <AnnulationClient reservation={resa} />
}
