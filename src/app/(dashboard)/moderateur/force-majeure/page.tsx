import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ForceMajeureModerateur from './ForceMajeureModerateur'

export default async function ModerForceMajeurePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['moderateur', 'admin'].includes(profile.role)) redirect('/mon-espace')

  const { data: demandes } = await supabase
    .from('demandes_force_majeure')
    .select('*, reservations(date_debut, date_fin, prix_total, biens(titre)), profiles!locataire_id(nom, phone)')
    .in('statut', ['en_attente', 'en_recours'])
    .order('created_at', { ascending: true })

  const { data: stats } = await supabase
    .from('demandes_force_majeure')
    .select('statut')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const validees = stats?.filter(s => s.statut === 'validee').length ?? 0
  const refusees = stats?.filter(s => s.statut === 'refusee').length ?? 0
  const total = stats?.length ?? 0

  return (
    <ForceMajeureModerateur
      demandes={demandes ?? []}
      statsTotal={total}
      statsValidees={validees}
      statsRefusees={refusees}
    />
  )
}
