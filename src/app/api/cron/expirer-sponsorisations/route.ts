import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const secret = request.headers.get('x-cron-secret') ?? new URL(request.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const now = new Date().toISOString()

    const { data: expiredSpon } = await supabaseAdmin
      .from('sponsorisations')
      .select('id, bien_id')
      .eq('statut', 'actif')
      .lt('date_fin', now)

    if (expiredSpon && expiredSpon.length > 0) {
      const bienIds = expiredSpon.map(s => s.bien_id)

      await Promise.all([
        supabaseAdmin.from('sponsorisations').update({ statut: 'expire' }).in('id', expiredSpon.map(s => s.id)),
        supabaseAdmin.from('biens').update({ niveau_sponsoring: 'standard', score_tri: 0, sponsoring_actif_jusqu: null }).in('id', bienIds),
      ])
    }

    return NextResponse.json({ success: true, expired: expiredSpon?.length ?? 0 })
  } catch (err) {
    console.error('[cron/expirer-sponsorisations]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
