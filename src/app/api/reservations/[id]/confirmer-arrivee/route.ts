import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { appliquerEvenementScore } from '@/lib/locataires/gestion-score'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const role: 'locataire' | 'proprietaire' = body.role ?? 'locataire'

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

    if (resa.arrivee_confirmee)
      return NextResponse.json({ success: true, message: 'Arrivée déjà confirmée' })

    const maintenant = new Date()

    await supabaseAdmin
      .from('reservations')
      .update({
        arrivee_confirmee: true,
        heure_arrivee_reelle: maintenant.toISOString(),
        statut: 'en_cours',
        check_in_at: maintenant.toISOString(),
      })
      .eq('id', params.id)

    // CDC : +2 points si arrivée avant l'heure prévue (PAS +10 — le +10 est au fin du séjour)
    if (isLocataire && resa.heure_arrivee_prevue && resa.date_debut) {
      const dateArriveePrevue = new Date(`${resa.date_debut}T${resa.heure_arrivee_prevue}`)
      if (maintenant < dateArriveePrevue) {
        // Applique +2 directement sans passer par un évènement nommé
        const { data: scoreData } = await supabaseAdmin
          .from('scores_locataires')
          .select('score')
          .eq('locataire_id', resa.locataire_id)
          .single()

        if (scoreData) {
          const nouveau_score = Math.min(150, scoreData.score + 2)
          await supabaseAdmin
            .from('scores_locataires')
            .update({ score: nouveau_score })
            .eq('locataire_id', resa.locataire_id)

          await supabaseAdmin.from('historique_score_locataire').insert({
            locataire_id: resa.locataire_id,
            evenement: 'reservation_honoree',
            variation: 2,
            score_avant: scoreData.score,
            score_apres: nouveau_score,
            reservation_id: params.id,
            notes: 'Arrivée confirmée avant l\'heure prévue (+2 pts)',
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[confirmer-arrivee]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
