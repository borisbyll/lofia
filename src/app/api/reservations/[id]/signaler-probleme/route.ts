import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §2.4 — Signalement d'un problème pendant le séjour
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { type_probleme, description, photos_urls } = body

    if (!type_probleme || !description) {
      return NextResponse.json({ error: 'type_probleme et description sont requis' }, { status: 400 })
    }

    const { data: resa } = await supabaseAdmin
      .from('reservations')
      .select('locataire_id, proprietaire_id, statut, biens(titre)')
      .eq('id', params.id)
      .single()

    if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    if (resa.locataire_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (!['confirme', 'en_cours', 'en_sejour'].includes(resa.statut)) {
      return NextResponse.json({ error: 'Vous ne pouvez signaler un problème que pendant votre séjour' }, { status: 400 })
    }

    // Créer le signalement
    const { data: signalement, error: sigErr } = await supabaseAdmin
      .from('signalements_sejour')
      .insert({
        reservation_id: params.id,
        locataire_id: session.user.id,
        type_probleme,
        description: description.trim(),
        photos_urls: photos_urls ?? [],
        statut: 'en_cours',
      })
      .select()
      .single()

    if (sigErr) throw sigErr

    // Marquer la réservation comme ayant un signalement
    await supabaseAdmin
      .from('reservations')
      .update({ signalement_probleme: true })
      .eq('id', params.id)

    const bien = Array.isArray(resa.biens) ? resa.biens[0] : resa.biens as { titre?: string } | null
    const titreBien = (bien as { titre?: string } | null)?.titre ?? 'hébergement'

    // Notifier tous les modérateurs
    const { data: mods } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'moderateur')

    if (mods && mods.length > 0) {
      await supabaseAdmin.from('notifications').insert(
        mods.map(mod => ({
          user_id: mod.id,
          type: 'signalement_sejour',
          titre: '🚨 Signalement en cours de séjour',
          corps: `"${titreBien}" — Problème : ${type_probleme}. Action requise sous 2h.`,
          lien: `/moderateur/signalements`,
        }))
      )
    }

    // Notifier le propriétaire
    await supabaseAdmin.from('notifications').insert({
      user_id: resa.proprietaire_id,
      type: 'signalement_sejour_proprio',
      titre: 'Signalement de votre locataire',
      corps: `Votre locataire a signalé un problème pour "${titreBien}". Notre équipe va intervenir.`,
      lien: `/mon-espace/reservations`,
    })

    return NextResponse.json({ success: true, signalement_id: signalement.id })
  } catch (err) {
    console.error('[signaler-probleme]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
