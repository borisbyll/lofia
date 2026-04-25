import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 — Rappel au proprio si sa demande expire dans < 3h ET rappel pas encore envoyé
// Cron toutes les 30min (adapté en quotidien sur Hobby plan)
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'lofia-cron'}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const now = new Date()
  const dans3h = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString()

  const { data: demandes } = await supabaseAdmin
    .from('demandes_reservation')
    .select('id, proprietaire_id, locataire_id, biens(titre), date_arrivee, date_depart, expire_at, montant_total')
    .eq('statut', 'en_attente')
    .eq('rappel_3h_envoye', false)
    .lt('expire_at', dans3h)
    .gt('expire_at', now.toISOString())

  let count = 0
  if (demandes && demandes.length > 0) {
    for (const demande of demandes) {
      const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens as { titre?: string } | null
      const titreBien = (bien as { titre?: string } | null)?.titre ?? 'hébergement'
      const expireStr = new Date(demande.expire_at).toLocaleString('fr-FR')

      await supabaseAdmin.from('notifications').insert({
        user_id: demande.proprietaire_id,
        type: 'rappel_demande_expire',
        titre: '⏰ Demande de réservation expirante',
        corps: `Une demande pour "${titreBien}" (${demande.date_arrivee} → ${demande.date_depart}) expire le ${expireStr}. Répondez maintenant.`,
        lien: `/mon-espace/reservations`,
      })

      await supabaseAdmin
        .from('demandes_reservation')
        .update({ rappel_3h_envoye: true })
        .eq('id', demande.id)

      count++
    }
  }

  return NextResponse.json({ ok: true, rappels_envoyes: count })
}
