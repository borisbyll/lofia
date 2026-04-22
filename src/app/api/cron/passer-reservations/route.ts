import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Vercel Cron — toutes les heures
export async function GET(request: Request) {
  // Sécurité basique : header secret
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'lofia-cron'}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  // en_attente confirmée + paiement effectué → en_sejour si date_debut = today
  const { data: aCommencer } = await supabaseAdmin
    .from('reservations')
    .update({ statut: 'en_sejour' })
    .lte('date_debut', today)
    .gte('date_fin',   today)
    .eq('statut',      'confirme')
    .eq('paiement_effectue', true)
    .select('id')

  // en_sejour dont date_fin < today → terminee
  const { data: aTerminer } = await supabaseAdmin
    .from('reservations')
    .update({ statut: 'termine' })
    .lt('date_fin', today)
    .eq('statut',   'en_sejour')
    .select('id')

  return NextResponse.json({
    ok:       true,
    commences: aCommencer?.length ?? 0,
    termines:  aTerminer?.length ?? 0,
  })
}
