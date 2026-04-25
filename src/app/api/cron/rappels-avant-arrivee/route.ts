import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §2.1 — Rappel J-1 aux locataires et propriétaires
// Cron quotidien à 9h
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'lofia-cron'}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const demain = new Date()
  demain.setDate(demain.getDate() + 1)
  const dateDemain = demain.toISOString().split('T')[0]

  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id, locataire_id, proprietaire_id, date_debut, heure_arrivee_prevue, rappel_j1_envoye, biens(titre, adresse, latitude, longitude), profiles!locataire_id(nom, phone)')
    .eq('date_debut', dateDemain)
    .in('statut', ['confirme', 'en_cours'])
    .eq('paiement_effectue', true)
    .eq('rappel_j1_envoye', false)

  let count = 0
  if (reservations && reservations.length > 0) {
    for (const resa of reservations) {
      const bien = Array.isArray(resa.biens) ? resa.biens[0] : resa.biens as { titre?: string; adresse?: string } | null
      const titreBien = (bien as { titre?: string } | null)?.titre ?? 'hébergement'
      const heure = resa.heure_arrivee_prevue ?? '14:00'

      await supabaseAdmin.from('notifications').insert([
        {
          user_id: resa.locataire_id,
          type: 'rappel_arrivee_j1',
          titre: '🏠 Votre séjour commence demain !',
          corps: `Rappel — "${titreBien}" vous attend demain à partir de ${heure}. Bon séjour !`,
          lien: `/mon-espace/reservations`,
        },
        {
          user_id: resa.proprietaire_id,
          type: 'rappel_arrivee_j1_proprio',
          titre: '📅 Votre locataire arrive demain',
          corps: `Rappel — Arrivée prévue demain à partir de ${heure} pour "${titreBien}". Assurez-vous que le bien est prêt.`,
          lien: `/mon-espace/reservations`,
        },
      ])

      await supabaseAdmin
        .from('reservations')
        .update({ rappel_j1_envoye: true })
        .eq('id', resa.id)

      count++
    }
  }

  return NextResponse.json({ ok: true, rappels_envoyes: count })
}
