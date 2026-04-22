import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VentesClient from './VentesClient'

export default async function VentesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion?next=/mon-espace/ventes')

  return <VentesClient userId={user.id} />
}
