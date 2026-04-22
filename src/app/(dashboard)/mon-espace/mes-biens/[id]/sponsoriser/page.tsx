import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import SponsoriserClient from './SponsoriserClient'

export default async function SponsoriserPage({ params, searchParams }: { params: { id: string }; searchParams: { success?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: bien } = await supabaseAdmin
    .from('biens')
    .select('id, titre, niveau_sponsoring, sponsoring_actif_jusqu, score_tri, owner_id')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .single()

  if (!bien) redirect('/mon-espace/mes-biens')

  return <SponsoriserClient bien={bien as any} success={searchParams.success === 'true'} />
}
