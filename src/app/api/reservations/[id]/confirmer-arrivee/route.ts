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

    // Bonus si arrivée avant l'heure prévue
    if (isLocataire && resa.heure_arrivee_prevue && resa.date_debut) {
      const dateArriveePrevu = new Date(`${resa.date_debut}T${resa.heure_arrivee_prevue}`)
      if (maintenant < dateArriveePrevu) {
        await appliquerEvenementScore(
          resa.locataire_id,
          'reservation_honoree',
          params.id,
          'Arrivée confirmée avant l\'heure prévue (+2 pts bonus inclus)'
        ).catch(err => console.error('[score arrivee]', err))
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[confirmer-arrivee]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
