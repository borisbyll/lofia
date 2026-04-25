import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { appliquerEvenementScore } from '@/lib/locataires/gestion-score'

// Vercel Cron — quotidien (limite Hobby plan)
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'lofia-cron'}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  // confirme + paiement effectué → en_sejour si date_debut = today
  const { data: aCommencer } = await supabaseAdmin
    .from('reservations')
    .update({ statut: 'en_sejour' })
    .lte('date_debut', today)
    .gte('date_fin',   today)
    .eq('statut',      'confirme')
    .eq('paiement_effectue', true)
    .select('id')

  // en_sejour dont date_fin < today → termine
  // CDC : déclenche +10 points "Réservation honorée (séjour terminé sans incident)"
  const { data: aTerminer } = await supabaseAdmin
    .from('reservations')
    .update({ statut: 'termine' })
    .lt('date_fin', today)
    .eq('statut',   'en_sejour')
    .select('id, locataire_id')

  let scoresAppliques = 0
  if (aTerminer && aTerminer.length > 0) {
    for (const resa of aTerminer) {
      if (!resa.locataire_id) continue
      await appliquerEvenementScore(
        resa.locataire_id,
        'reservation_honoree',
        resa.id,
        'Séjour terminé sans incident'
      ).catch(err => console.error('[score termine]', err))
      scoresAppliques++
    }
  }

  return NextResponse.json({
    ok: true,
    commences: aCommencer?.length ?? 0,
    termines: aTerminer?.length ?? 0,
    scores_appliques: scoresAppliques,
  })
}
