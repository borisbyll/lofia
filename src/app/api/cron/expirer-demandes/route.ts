import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 — Expire les demandes en_attente dont expire_at < now()
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
    .eq('statut', 'en_attente')
    .lt('expire_at', now)
    .select('id, locataire_id, proprietaire_id, biens(titre)')

  let notifCount = 0
  if (expirees && expirees.length > 0) {
    for (const demande of expirees) {
      const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens as { titre?: string } | null
      const titreBien = (bien as { titre?: string } | null)?.titre ?? 'hébergement'

      await supabaseAdmin.from('notifications').insert([
        {
          user_id: demande.locataire_id,
          type: 'demande_expiree',
          titre: 'Demande expirée sans réponse',
          corps: `Votre demande pour "${titreBien}" a expiré sans réponse du propriétaire. Vous pouvez chercher d'autres biens disponibles.`,
          lien: `/location`,
        },
        {
          user_id: demande.proprietaire_id,
          type: 'demande_expiree_proprio',
          titre: 'Demande expirée',
          corps: `Une demande de réservation pour "${titreBien}" a expiré car vous n'avez pas répondu dans les 12h.`,
          lien: `/mon-espace/reservations`,
        },
      ])
      notifCount++
    }
  }

  return NextResponse.json({ ok: true, expirees: expirees?.length ?? 0, notifications: notifCount })
}
