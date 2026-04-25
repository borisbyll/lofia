import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminLocatairesClient from './AdminLocatairesClient'

export default async function AdminLocatairesPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/mon-espace')

  const { data: scores } = await supabase
    .from('scores_locataires')
    .select('*, profiles!locataire_id(nom, phone, email)')
    .order('score', { ascending: true })
    .limit(100)

  return <AdminLocatairesClient scores={scores ?? []} />
}
