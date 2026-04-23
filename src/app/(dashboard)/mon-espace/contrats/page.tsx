import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContratListeClient from './ContratListeClient'

export default async function ContratsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion?next=/mon-espace/contrats')
  return <ContratListeClient />
}
