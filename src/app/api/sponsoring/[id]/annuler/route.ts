import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: spon } = await supabaseAdmin.from('sponsorisations').select('*').eq('id', params.id).single()
    if (!spon) return NextResponse.json({ error: 'Sponsorisation introuvable' }, { status: 404 })
    if (spon.user_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    await supabaseAdmin.from('sponsorisations').update({ statut: 'annule' }).eq('id', params.id)
    await supabaseAdmin.from('biens').update({ niveau_sponsoring: 'standard', score_tri: 0, sponsoring_actif_jusqu: null }).eq('id', spon.bien_id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[sponsoring/annuler]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
