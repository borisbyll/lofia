import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_request: Request, { params }: { params: { bien_id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: bien } = await supabaseAdmin.from('biens').select('owner_id').eq('id', params.bien_id).single()
    if (!bien || bien.owner_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { data: stats } = await supabaseAdmin
      .from('stats_biens')
      .select('*')
      .eq('bien_id', params.bien_id)
      .order('date', { ascending: false })
      .limit(30)

    const { data: sponsorisations } = await supabaseAdmin
      .from('sponsorisations')
      .select('formule, date_debut, date_fin, statut, montant')
      .eq('bien_id', params.bien_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ stats: stats ?? [], sponsorisations: sponsorisations ?? [] })
  } catch (err) {
    console.error('[sponsoring/stats]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
