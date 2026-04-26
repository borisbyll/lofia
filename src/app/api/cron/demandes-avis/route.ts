import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §3.1 — Demande d'avis automatique le lendemain du séjour
// Cron quotidien à 10h : génère token_avis + notifie locataire et propriétaire
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const hier = new Date()
    hier.setDate(hier.getDate() - 1)
    const dateHier = hier.toISOString().split('T')[0]

    // Réservations terminées hier sans avis déjà envoyé
    const { data: reservations, error } = await supabaseAdmin
      .from('reservations')
      .select('id, locataire_id, proprietaire_id, bien_id, rappel_avis_envoye, biens(titre, slug)')
      .in('statut', ['termine', 'terminee'])
      .lte('date_fin', dateHier)
      .gte('date_fin', dateHier)
      .eq('rappel_avis_envoye', false)

    if (error) throw error
    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ ok: true, traites: 0 })
    }

    let traites = 0

    for (const resa of reservations) {
      try {
        const bien = resa.biens as any

        // Vérifier si avis locataire déjà laissé
        const { data: avisLoc } = await supabaseAdmin
          .from('avis')
          .select('id')
          .eq('reservation_id', resa.id)
          .eq('auteur_id', resa.locataire_id)
          .maybeSingle()

        // Vérifier si avis proprio déjà laissé
        const { data: avisProp } = await supabaseAdmin
          .from('avis')
          .select('id')
          .eq('reservation_id', resa.id)
          .eq('auteur_id', resa.proprietaire_id)
          .maybeSingle()

        // Token locataire note proprio : base64url(reservation_id:locataire_id:locataire_note_proprio)
        const tokenLoc = Buffer.from(
          `${resa.id}:${resa.locataire_id}:locataire_note_proprio`
        ).toString('base64url')

        // Token proprio note locataire : base64url(reservation_id:proprietaire_id:proprio_note_locataire)
        const tokenProp = Buffer.from(
          `${resa.id}:${resa.proprietaire_id}:proprio_note_locataire`
        ).toString('base64url')

        const lienAvis = process.env.APP_URL ?? 'https://lofia.vercel.app'

        // Notifier le locataire si pas encore noté
        if (!avisLoc) {
          await supabaseAdmin.from('notifications').insert({
            user_id: resa.locataire_id,
            type: 'avis_demande',
            titre: '⭐ Comment s\'était votre séjour ?',
            corps: `Votre séjour à "${bien?.titre ?? 'votre bien'}" est terminé. Donnez votre avis en 1 min — ça aide toute la communauté LOFIA.`,
            lien: `/avis/${tokenLoc}`,
          })
        }

        // Notifier le propriétaire si pas encore noté
        if (!avisProp) {
          await supabaseAdmin.from('notifications').insert({
            user_id: resa.proprietaire_id,
            type: 'avis_demande',
            titre: '📝 Notez votre locataire',
            corps: `Donnez votre avis sur ce séjour pour aider la communauté LOFIA.`,
            lien: `/avis/${tokenProp}`,
          })
        }

        // Marquer rappel_avis_envoye = true pour ne pas re-envoyer demain (le rappel sera géré par /cron/rappels-avis à J+3)
        await supabaseAdmin
          .from('reservations')
          .update({ rappel_avis_envoye: true })
          .eq('id', resa.id)

        traites++
      } catch (e) {
        console.error('[demandes-avis] erreur resa', resa.id, e)
      }
    }

    return NextResponse.json({ ok: true, traites })
  } catch (err) {
    console.error('[cron/demandes-avis]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
