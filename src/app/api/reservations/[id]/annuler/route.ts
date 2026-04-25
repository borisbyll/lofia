import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  calculerRemboursement,
  type TypeAnnulation,
  type PalierAnnulation,
} from '@/lib/reservations/calcul-remboursement'
import { appliquerEvenementScore, type EvenementScore } from '@/lib/locataires/gestion-score'

function palierToEvenement(palier: PalierAnnulation): EvenementScore | null {
  switch (palier) {
    case 'retractation': return 'annulation_retractation'
    case 'standard_72h': return 'annulation_72h'
    case 'standard_24_72h': return 'annulation_24_72h'
    case 'standard_moins_24h': return 'annulation_moins_24h'
    case 'no_show': return 'no_show'
    default: return null
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const type: TypeAnnulation = body.type ?? 'standard'

    const { data: resa } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

    const isLocataire = resa.locataire_id === session.user.id
    const isProprietaire = resa.proprietaire_id === session.user.id
    if (!isLocataire && !isProprietaire)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const statutsAnnulables = ['en_attente', 'confirmee', 'en_cours']
    if (!statutsAnnulables.includes(resa.statut))
      return NextResponse.json({ error: 'Cette réservation ne peut pas être annulée' }, { status: 400 })

    const maintenant = new Date()
    const dateArrivee = new Date(resa.date_debut)
    const dateReservation = new Date(resa.created_at)
    const annulationType: TypeAnnulation = isProprietaire ? 'proprietaire' : type

    const resultat = calculerRemboursement({
      montant_total: resa.prix_total,
      commission_lofia: resa.commission ?? 0,
      montant_proprietaire: resa.montant_proprio ?? 0,
      date_arrivee: dateArrivee,
      date_reservation: dateReservation,
      date_annulation: maintenant,
      type: annulationType,
    })

    // Enregistrer l'annulation
    await supabaseAdmin.from('annulations').insert({
      reservation_id: params.id,
      initiateur: isProprietaire ? 'proprietaire' : 'locataire',
      type: resultat.palier,
      montant_total_paye: resa.prix_total,
      commission_lofia_initiale: resa.commission ?? 0,
      montant_rembourse: resultat.remboursement_locataire,
      pourcentage_rembourse: resultat.pourcentage_rembourse,
      retenu_par_lofia: resultat.retenu_par_lofia,
      remboursement_effectue: false,
    })

    // Mettre à jour la réservation
    await supabaseAdmin
      .from('reservations')
      .update({ statut: 'annulee' })
      .eq('id', params.id)

    // Libérer les dates dans disponibilites
    await supabaseAdmin
      .from('disponibilites')
      .delete()
      .eq('bien_id', resa.bien_id)
      .eq('date_debut', resa.date_debut)
      .eq('date_fin', resa.date_fin)

    // Impact score (locataire uniquement, pas si propriétaire annule)
    if (isLocataire) {
      const evenement = palierToEvenement(resultat.palier)
      if (evenement) {
        await appliquerEvenementScore(resa.locataire_id, evenement, params.id)
          .catch(err => console.error('[score]', err))
      }
    }

    // Notifications
    const msgLocataire = resultat.remboursement_locataire > 0
      ? `Réservation annulée. Remboursement de ${resultat.remboursement_locataire.toLocaleString('fr-FR')} FCFA sous 48h.`
      : 'Réservation annulée. Aucun remboursement applicable selon notre politique.'

    await supabaseAdmin.from('notifications').insert([
      {
        user_id: resa.locataire_id,
        type: 'reservation_annulee',
        titre: 'Annulation confirmée',
        corps: msgLocataire,
        lien: '/mon-espace/reservations',
      },
      {
        user_id: resa.proprietaire_id,
        type: 'reservation_annulee',
        titre: 'Réservation annulée',
        corps: `La réservation du ${new Date(resa.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${new Date(resa.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} a été annulée. Ces dates sont à nouveau disponibles.`,
        lien: '/mon-espace/reservations',
      },
    ])

    return NextResponse.json({
      success: true,
      remboursement: resultat.remboursement_locataire,
      palier: resultat.palier,
      pourcentage: resultat.pourcentage_rembourse,
    })
  } catch (err) {
    console.error('[reservations/annuler]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
