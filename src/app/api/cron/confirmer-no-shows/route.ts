import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { appliquerEvenementScore } from '@/lib/locataires/gestion-score'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const maintenant = new Date()
    const seuilConfirmation = new Date(maintenant.getTime() - 3 * 60 * 60 * 1000) // J+3h

    // Réservations avec rappel envoyé, non confirmées, arrivée il y a 3h+
    const { data: noShows } = await supabaseAdmin
      .from('reservations')
      .select('id, bien_id, locataire_id, proprietaire_id, date_debut, date_fin, prix_total, commission, montant_proprio, biens(titre)')
      .eq('statut', 'en_cours')
      .eq('arrivee_confirmee', false)
      .eq('no_show_rappel_envoye', true)
      .eq('no_show_detecte', false)
      .lte('date_debut', seuilConfirmation.toISOString().split('T')[0])

    if (!noShows || noShows.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    let count = 0

    for (const resa of noShows) {
      const bien = Array.isArray(resa.biens) ? resa.biens[0] : resa.biens as { titre: string } | null
      const titreBien = (bien as { titre?: string } | null)?.titre ?? 'l\'hébergement'

      // Marquer no-show
      await supabaseAdmin
        .from('reservations')
        .update({
          no_show_detecte: true,
          statut: 'annulee',
        })
        .eq('id', resa.id)

      // Enregistrer l'annulation (0% remboursement)
      await supabaseAdmin.from('annulations').insert({
        reservation_id: resa.id,
        initiateur: 'systeme',
        type: 'no_show',
        montant_total_paye: resa.prix_total,
        commission_lofia_initiale: resa.commission ?? 0,
        montant_rembourse: 0,
        pourcentage_rembourse: 0,
        retenu_par_lofia: resa.commission ?? 0,
        remboursement_effectue: true,
      })

      // Libérer les dates
      await supabaseAdmin
        .from('disponibilites')
        .delete()
        .eq('bien_id', resa.bien_id)
        .eq('date_debut', resa.date_debut)
        .eq('date_fin', resa.date_fin)

      // Impact score -40
      await appliquerEvenementScore(
        resa.locataire_id,
        'no_show',
        resa.id,
        'No-show confirmé automatiquement après 3h'
      ).catch(err => console.error('[score no-show]', err))

      // Notifications
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: resa.locataire_id,
          type: 'no_show_confirme',
          titre: 'Réservation annulée — Non-présentation',
          corps: `Votre réservation pour "${titreBien}" a été annulée pour non-présentation. Aucun remboursement n'est possible. Votre profil a été mis à jour.`,
          lien: '/mon-espace/reservations',
        },
        {
          user_id: resa.proprietaire_id,
          type: 'no_show_confirme',
          titre: 'No-show confirmé',
          corps: `Le locataire ne s'est pas présenté pour "${titreBien}". Ces dates sont maintenant libérées. Le paiement vous sera versé.`,
          lien: '/mon-espace/reservations',
        },
      ])

      count++
    }

    return NextResponse.json({ processed: count })
  } catch (err) {
    console.error('[confirmer-no-shows]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
