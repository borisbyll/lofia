import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §3.1 — Rappel unique si avis non laissé 3 jours après le séjour
// Cron quotidien à 14h
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'lofia-cron'}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const il_y_a_3_jours = new Date()
  il_y_a_3_jours.setDate(il_y_a_3_jours.getDate() - 3)
  const date3j = il_y_a_3_jours.toISOString().split('T')[0]

  // Réservations terminées il y a exactement 3 jours, sans avis, rappel pas encore envoyé
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id, locataire_id, proprietaire_id, biens(titre)')
    .eq('statut', 'termine')
    .eq('date_fin', date3j)
    .eq('rappel_avis_envoye', false)

  let count = 0
  if (reservations && reservations.length > 0) {
    for (const resa of reservations) {
      const bien = Array.isArray(resa.biens) ? resa.biens[0] : resa.biens as { titre?: string } | null
      const titreBien = (bien as { titre?: string } | null)?.titre ?? 'votre hébergement'

      // Vérifier si avis déjà laissé
      const { data: avisLoc } = await supabaseAdmin
        .from('avis')
        .select('id')
        .eq('reservation_id', resa.id)
        .eq('auteur_id', resa.locataire_id)
        .maybeSingle()

      if (!avisLoc) {
        await supabaseAdmin.from('notifications').insert({
          user_id: resa.locataire_id,
          type: 'rappel_avis',
          titre: 'N\'oubliez pas votre avis !',
          corps: `Comment s'est passé votre séjour à "${titreBien}" ? Votre avis aide la communauté LOFIA.`,
          lien: `/mon-espace/reservations`,
        })
      }

      // Vérifier si avis proprio déjà laissé
      const { data: avisProp } = await supabaseAdmin
        .from('avis')
        .select('id')
        .eq('reservation_id', resa.id)
        .eq('auteur_id', resa.proprietaire_id)
        .maybeSingle()

      if (!avisProp) {
        await supabaseAdmin.from('notifications').insert({
          user_id: resa.proprietaire_id,
          type: 'rappel_avis_proprio',
          titre: 'Donnez votre avis sur votre locataire',
          corps: `N'oubliez pas de noter votre locataire pour le séjour à "${titreBien}".`,
          lien: `/mon-espace/reservations`,
        })
      }

      await supabaseAdmin
        .from('reservations')
        .update({ rappel_avis_envoye: true })
        .eq('id', resa.id)

      count++
    }
  }

  return NextResponse.json({ ok: true, rappels_envoyes: count })
}
