import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LocationsClient from './LocationsClient'

export default async function LocationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion?next=/mon-espace/locations')
  return <LocationsClient userId={user.id} />
}
