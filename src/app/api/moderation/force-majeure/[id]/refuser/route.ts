import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  calculerRemboursement,
  type PalierAnnulation,
} from '@/lib/reservations/calcul-remboursement'
import { appliquerEvenementScore, type EvenementScore } from '@/lib/locataires/gestion-score'

function palierToEvenement(palier: PalierAnnulation): EvenementScore | null {
  switch (palier) {
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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || !['moderateur', 'admin'].includes(profile.role))
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json()
    const { motif_refus } = body
    if (!motif_refus) return NextResponse.json({ error: 'Motif de refus requis' }, { status: 400 })

    const { data: demande } = await supabaseAdmin
      .from('demandes_force_majeure')
      .select('*, reservations(*)')
      .eq('id', params.id)
      .single()

    if (!demande) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (demande.statut !== 'en_attente' && demande.statut !== 'en_recours')
      return NextResponse.json({ error: 'Cette demande ne peut plus être traitée' }, { status: 400 })

    const resa = (demande as { reservations: Record<string, unknown> }).reservations as {
      id: string; prix_total: number; commission: number; montant_proprio: number;
      locataire_id: string; proprietaire_id: string; date_debut: string; date_fin: string;
      bien_id: string; created_at: string
    }

    // Refuser la demande
    await supabaseAdmin
      .from('demandes_force_majeure')
      .update({
        statut: 'refusee',
        moderateur_id: session.user.id,
        motif_refus,
        date_traitement: new Date().toISOString(),
        recours_possible: true,
      })
      .eq('id', params.id)

    // Appliquer la politique standard selon le délai
    const maintenant = new Date()
    const dateArrivee = new Date(resa.date_debut)
    const dateReservation = new Date(resa.created_at)

    const resultat = calculerRemboursement({
      montant_total: resa.prix_total,
      commission_lofia: resa.commission ?? 0,
      montant_proprietaire: resa.montant_proprio ?? 0,
      date_arrivee: dateArrivee,
      date_reservation: dateReservation,
      date_annulation: maintenant,
      type: 'standard',
    })

    // Enregistrer l'annulation
    await supabaseAdmin.from('annulations').insert({
      reservation_id: demande.reservation_id,
      initiateur: 'locataire',
      type: resultat.palier,
      force_majeure_id: params.id,
      montant_total_paye: resa.prix_total,
      commission_lofia_initiale: resa.commission ?? 0,
      montant_rembourse: resultat.remboursement_locataire,
      pourcentage_rembourse: resultat.pourcentage_rembourse,
      retenu_par_lofia: resultat.retenu_par_lofia,
      remboursement_effectue: false,
    })

    // Annuler la réservation
    await supabaseAdmin
      .from('reservations')
      .update({ statut: 'annulee' })
      .eq('id', demande.reservation_id)

    // Libérer les dates
    await supabaseAdmin
      .from('disponibilites')
      .delete()
      .eq('bien_id', resa.bien_id)
      .eq('date_debut', resa.date_debut)
      .eq('date_fin', resa.date_fin)

    // Score locataire selon le palier
    const evenement = palierToEvenement(resultat.palier)
    if (evenement) {
      await appliquerEvenementScore(
        demande.locataire_id,
        evenement,
        demande.reservation_id,
        `Force majeure refusée — politique standard appliquée`
      ).catch(err => console.error('[score FM refus]', err))
    }

    // Notification locataire
    await supabaseAdmin.from('notifications').insert({
      user_id: demande.locataire_id,
      type: 'force_majeure_refusee',
      titre: 'Demande non retenue',
      corps: `Votre demande d'annulation exceptionnelle n'a pas été retenue. Motif : ${motif_refus}. ${resultat.remboursement_locataire > 0 ? `Remboursement de ${resultat.remboursement_locataire.toLocaleString('fr-FR')} FCFA sous 48h.` : 'Aucun remboursement applicable.'}`,
      lien: '/mon-espace/reservations',
    })

    return NextResponse.json({
      success: true,
      remboursement: resultat.remboursement_locataire,
      palier: resultat.palier,
    })
  } catch (err) {
    console.error('[refuser-force-majeure]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
