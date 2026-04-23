import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MisesEnRelationClient from './MisesEnRelationClient'

export default async function MisesEnRelationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')
  return <MisesEnRelationClient />
}
