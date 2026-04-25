import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Appelé par le propriétaire depuis son dashboard
// Déclenche le flux de vérification no-show (rappel locataire J+2h)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: resa } = await supabaseAdmin
      .from('reservations')
      .select('*, biens(titre)')
      .eq('id', params.id)
      .single()

    if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    if (resa.proprietaire_id !== session.user.id)
      return NextResponse.json({ error: 'Seul le propriétaire peut signaler un no-show' }, { status: 403 })

    if (resa.arrivee_confirmee)
      return NextResponse.json({ error: 'Le locataire est déjà arrivé' }, { status: 400 })

    if (!['confirme', 'en_cours', 'en_sejour'].includes(resa.statut))
      return NextResponse.json({ error: 'Statut incompatible avec un no-show' }, { status: 400 })

    if (resa.no_show_rappel_envoye)
      return NextResponse.json({ error: 'Le rappel a déjà été envoyé', deja_envoye: true })

    const bien = Array.isArray(resa.biens) ? resa.biens[0] : resa.biens as { titre?: string } | null
    const titreBien = (bien as { titre?: string } | null)?.titre ?? 'votre hébergement'

    // Marquer le rappel comme envoyé (flag CDC : un seul rappel)
    await supabaseAdmin
      .from('reservations')
      .update({ no_show_rappel_envoye: true })
      .eq('id', params.id)

    // Notification in-app au locataire (simule le WhatsApp du CDC)
    await supabaseAdmin.from('notifications').insert({
      user_id: resa.locataire_id,
      type: 'no_show_rappel',
      titre: 'Votre hébergement vous attend',
      corps: `Votre réservation pour "${titreBien}" a commencé. Votre hôte vous attend. Confirmez votre arrivée ou annulez si vous n'arrivez plus. Sans réponse, votre réservation sera marquée comme non-présentation.`,
      lien: '/mon-espace/reservations',
    })

    // Notification au propriétaire : confirmation que le rappel est envoyé
    await supabaseAdmin.from('notifications').insert({
      user_id: session.user.id,
      type: 'no_show_rappel_envoye',
      titre: 'Rappel envoyé au locataire',
      corps: `Un rappel a été envoyé à votre locataire pour "${titreBien}". Si aucune réponse sous 1h, le no-show sera confirmable.`,
      lien: '/mon-espace/reservations',
    })

    return NextResponse.json({ success: true, rappel_envoye: true })
  } catch (err) {
    console.error('[signaler-no-show]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
