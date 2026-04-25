import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §1.6 — Expire les demandes confirmées dont le lien de paiement (2h) est dépassé
// Cron toutes les heures
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'lofia-cron'}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: expirees } = await supabaseAdmin
    .from('demandes_reservation')
    .update({ statut: 'expiree' })
    .eq('statut', 'confirmee')
    .lt('lien_paiement_expire_at', now)
    .select('id, locataire_id, proprietaire_id, biens(titre), date_arrivee, date_depart')

  let count = 0
  if (expirees && expirees.length > 0) {
    for (const demande of expirees) {
      const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens as { titre?: string } | null
      const titreBien = (bien as { titre?: string } | null)?.titre ?? 'hébergement'

      await supabaseAdmin.from('notifications').insert([
        {
          user_id: demande.locataire_id,
          type: 'lien_paiement_expire',
          titre: 'Lien de paiement expiré',
          corps: `Votre lien de paiement pour "${titreBien}" a expiré. Les dates ont été libérées. Soumettez une nouvelle demande si vous souhaitez toujours réserver.`,
          lien: `/location`,
        },
        {
          user_id: demande.proprietaire_id,
          type: 'lien_paiement_expire_proprio',
          titre: 'Paiement non finalisé',
          corps: `Le locataire n'a pas finalisé son paiement dans le délai imparti. Vos dates du ${demande.date_arrivee} au ${demande.date_depart} sont à nouveau disponibles.`,
          lien: `/mon-espace/reservations`,
        },
      ])
      count++
    }
  }

  return NextResponse.json({ ok: true, expirees: expirees?.length ?? 0, notifications: count })
}
