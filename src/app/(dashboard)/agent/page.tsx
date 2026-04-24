import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AgentDashboardClient from './AgentDashboardClient'

export default async function AgentDashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/connexion?next=/agent')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, nom, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['agent', 'moderateur', 'admin'].includes(profile.role ?? '')) {
    redirect('/mon-espace')
  }

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, nom, prenom, telephone, email, actif')
    .eq('email', session.user.email ?? '')
    .maybeSingle()

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: visitesMois },
    { data: dossiersLD },
    { data: dossiersVente },
  ] = await Promise.all([
    supabaseAdmin
      .from('dossiers_longue_duree')
      .select('id, statut, date_visite, bien:biens(titre, ville), locataire:profiles!locataire_id(nom, phone)')
      .eq('agent_id', agent?.id ?? '')
      .gte('date_visite', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .order('date_visite', { ascending: true }),
    supabaseAdmin
      .from('dossiers_longue_duree')
      .select('id, reference, statut, date_visite, bien:biens(titre, ville), locataire:profiles!locataire_id(nom, phone)')
      .eq('agent_id', agent?.id ?? '')
      .not('statut', 'in', '(contrat_signe,expire,refuse)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('dossiers_vente')
      .select('id, reference, statut, date_visite, bien:biens(titre, ville), acheteur:profiles!acheteur_id(nom, phone)')
      .eq('agent_id', agent?.id ?? '')
      .not('statut', 'in', '(vendu,expire,refuse)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return (
    <AgentDashboardClient
      agent={agent}
      profile={profile}
      visitesMois={(visitesMois ?? []) as any[]}
      dossiersLD={(dossiersLD ?? []) as any[]}
      dossiersVente={(dossiersVente ?? []) as any[]}
    />
  )
}
