import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const maintenant = new Date()
    const seuilRappel = new Date(maintenant.getTime() - 2 * 60 * 60 * 1000) // J+2h

    // Réservations confirmées dont l'arrivée était il y a 2h+
    // et dont le rappel no-show n'a pas encore été envoyé
    const { data: resasSansRappel } = await supabaseAdmin
      .from('reservations')
      .select('id, bien_id, locataire_id, proprietaire_id, date_debut, biens(titre)')
      .eq('statut', 'en_cours')
      .eq('arrivee_confirmee', false)
      .eq('no_show_rappel_envoye', false)
      .lte('date_debut', seuilRappel.toISOString().split('T')[0])

    if (!resasSansRappel || resasSansRappel.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    let count = 0

    for (const resa of resasSansRappel) {
      const bien = Array.isArray(resa.biens) ? resa.biens[0] : resa.biens as { titre: string } | null
      const titreBien = (bien as { titre?: string } | null)?.titre ?? 'votre hébergement'

      // Marquer le rappel comme envoyé (éviter les doublons)
      await supabaseAdmin
        .from('reservations')
        .update({ no_show_rappel_envoye: true })
        .eq('id', resa.id)

      // Notification in-app au locataire
      await supabaseAdmin.from('notifications').insert({
        user_id: resa.locataire_id,
        type: 'no_show_rappel',
        titre: 'Votre hébergement vous attend',
        corps: `Votre réservation pour "${titreBien}" a commencé. Confirmez votre arrivée ou annulez si vous n'arrivez plus.`,
        lien: `/mon-espace/reservations`,
      })

      count++
    }

    return NextResponse.json({ processed: count })
  } catch (err) {
    console.error('[detecter-no-shows]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
