import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { appliquerEvenementScore } from '@/lib/locataires/gestion-score'

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
      locataire_id: string; proprietaire_id: string; date_debut: string; date_fin: string; bien_id: string
    }

    // Valider la demande
    await supabaseAdmin
      .from('demandes_force_majeure')
      .update({
        statut: 'validee',
        moderateur_id: session.user.id,
        date_traitement: new Date().toISOString(),
      })
      .eq('id', params.id)

    // Enregistrer l'annulation (100% remboursement)
    await supabaseAdmin.from('annulations').insert({
      reservation_id: demande.reservation_id,
      initiateur: 'systeme',
      type: 'force_majeure',
      force_majeure_id: params.id,
      montant_total_paye: resa.prix_total,
      commission_lofia_initiale: resa.commission ?? 0,
      montant_rembourse: resa.prix_total,
      pourcentage_rembourse: 100,
      retenu_par_lofia: 0,
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

    // Score neutre (événement force_majeure_validee = 0 pts)
    await appliquerEvenementScore(
      demande.locataire_id,
      'force_majeure_validee',
      demande.reservation_id,
      'Force majeure validée par modérateur'
    ).catch(err => console.error('[score FM]', err))

    // Notifications
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: demande.locataire_id,
        type: 'force_majeure_validee',
        titre: 'Annulation exceptionnelle validée',
        corps: `Votre demande a été validée. Remboursement intégral de ${resa.prix_total.toLocaleString('fr-FR')} FCFA sous 48h.`,
        lien: '/mon-espace/reservations',
      },
      {
        user_id: resa.proprietaire_id,
        type: 'reservation_annulee',
        titre: 'Annulation pour force majeure',
        corps: `La réservation du ${new Date(resa.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${new Date(resa.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} a été annulée pour circonstance exceptionnelle. Ces dates sont libérées.`,
        lien: '/mon-espace/reservations',
      },
    ])

    return NextResponse.json({ success: true, remboursement: resa.prix_total })
  } catch (err) {
    console.error('[valider-force-majeure]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
