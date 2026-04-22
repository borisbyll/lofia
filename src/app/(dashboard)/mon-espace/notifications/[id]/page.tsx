import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import NotificationDetailClient from './NotificationDetailClient'

export default async function NotificationDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: notif } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!notif) redirect('/mon-espace/notifications')

  // Marquer comme lue
  if (!notif.lu) {
    await supabaseAdmin.from('notifications').update({ lu: true }).eq('id', params.id)
  }

  return <NotificationDetailClient notif={notif as any} />
}
