import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContratListeClient from './ContratListeClient'

export default async function ContratsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion?next=/mon-espace/contrats')

  // Charger tous les contrats (les deux rôles) — le client filtre selon le mode
  const { data: contrats } = await supabase
    .from('contrats_location')
    .select('*, bien:biens(titre, ville), locataire:profiles!contrats_location_locataire_id_fkey(nom), proprietaire:profiles!contrats_location_proprietaire_id_fkey(nom)')
    .or(`locataire_id.eq.${user.id},proprietaire_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return <ContratListeClient contrats={contrats ?? []} userId={user.id} />
}
