import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { appliquerEvenementScore } from '@/lib/locataires/gestion-score'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { reservation_id, bien_id, proprietaire_id, bien_titre, note, commentaire, type } = body

    if (!reservation_id || !bien_id || !proprietaire_id || !note) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const { data: resa } = await supabaseAdmin
      .from('reservations')
      .select('locataire_id, proprietaire_id')
      .eq('id', reservation_id)
      .single()

    if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

    const isLocataire = resa.locataire_id === session.user.id
    const isProprietaire = resa.proprietaire_id === session.user.id
    if (!isLocataire && !isProprietaire)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { error: avisError } = await supabaseAdmin.from('avis').insert({
      reservation_id,
      bien_id,
      auteur_id: session.user.id,
      proprietaire_id,
      sujet_id: proprietaire_id,
      type: type ?? 'locataire_note_proprio',
      note,
      commentaire: commentaire?.trim() || null,
    })

    if (avisError) {
      if (avisError.code === '23505')
        return NextResponse.json({ error: 'Vous avez déjà laissé un avis pour cette réservation' }, { status: 409 })
      throw avisError
    }

    // CDC : +5 si locataire laisse avis ≥ 4 étoiles
    if (isLocataire && note >= 4) {
      await appliquerEvenementScore(
        session.user.id,
        'avis_positif',
        reservation_id,
        `Avis positif laissé (${note}⭐)`
      ).catch(err => console.error('[score avis+]', err))
    }

    // CDC : -10 si propriétaire note locataire ≤ 2 étoiles
    if (isProprietaire && note <= 2) {
      await appliquerEvenementScore(
        resa.locataire_id,
        'avis_negatif',
        reservation_id,
        `Avis négatif reçu du propriétaire (${note}⭐)`
      ).catch(err => console.error('[score avis-]', err))
    }

    const destinataire = isLocataire ? proprietaire_id : resa.locataire_id
    await supabaseAdmin.from('notifications').insert({
      user_id: destinataire,
      type: 'avis_nouveau',
      titre: '⭐ Nouvel avis reçu',
      corps: `Vous avez reçu un avis de ${note} étoile${note > 1 ? 's' : ''} pour "${bien_titre ?? 'votre bien'}".`,
      lien: '/mon-espace',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[avis/soumettre]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
