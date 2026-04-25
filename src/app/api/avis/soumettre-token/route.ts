import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { appliquerEvenementScore } from '@/lib/locataires/gestion-score'

// CDC v2 §3.2 — Soumission d'avis via token (sans connexion requise)
// Token = base64url(reservation_id:user_id:type) — vérifié côté serveur
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, reservation_id, bien_id, proprietaire_id, type, note, commentaire } = body

    if (!token || !reservation_id || !bien_id || !note) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Vérifier le token
    let decoded: string
    try {
      decoded = Buffer.from(token, 'base64url').toString('utf8')
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const parts = decoded.split(':')
    if (parts.length < 3) return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    const [tok_reservation_id, user_id, tok_type] = parts

    if (tok_reservation_id !== reservation_id) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Vérifier la réservation
    const { data: resa } = await supabaseAdmin
      .from('reservations')
      .select('locataire_id, proprietaire_id')
      .eq('id', reservation_id)
      .single()

    if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    if (resa.locataire_id !== user_id && resa.proprietaire_id !== user_id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier si avis déjà laissé
    const { data: existant } = await supabaseAdmin
      .from('avis')
      .select('id')
      .eq('reservation_id', reservation_id)
      .eq('auteur_id', user_id)
      .maybeSingle()

    if (existant) {
      return NextResponse.json({ error: 'Vous avez déjà laissé un avis pour cette réservation' }, { status: 409 })
    }

    const typeAvis = tok_type ?? type ?? 'locataire_note_proprio'

    const { error: avisError } = await supabaseAdmin.from('avis').insert({
      reservation_id,
      bien_id,
      auteur_id: user_id,
      proprietaire_id,
      sujet_id: proprietaire_id,
      type: typeAvis,
      note,
      commentaire: commentaire?.trim() || null,
    })

    if (avisError) {
      if (avisError.code === '23505') {
        return NextResponse.json({ error: 'Avis déjà laissé' }, { status: 409 })
      }
      throw avisError
    }

    const isLocataire = resa.locataire_id === user_id

    // CDC : +5 si locataire laisse avis ≥ 4 étoiles
    if (isLocataire && note >= 4) {
      await appliquerEvenementScore(user_id, 'avis_positif', reservation_id, `Avis positif (${note}⭐)`)
        .catch(e => console.error('[score avis+ token]', e))
    }

    // CDC : -10 si proprio note locataire ≤ 2 étoiles
    if (!isLocataire && note <= 2) {
      await appliquerEvenementScore(resa.locataire_id, 'avis_negatif', reservation_id, `Avis négatif reçu (${note}⭐)`)
        .catch(e => console.error('[score avis- token]', e))
    }

    // Notification au destinataire
    const destinataire = isLocataire ? proprietaire_id : resa.locataire_id
    await supabaseAdmin.from('notifications').insert({
      user_id: destinataire,
      type: 'avis_nouveau',
      titre: '⭐ Nouvel avis reçu',
      corps: `Vous avez reçu un avis de ${note} étoile${note > 1 ? 's' : ''}.`,
      lien: '/mon-espace',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[avis/soumettre-token]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
