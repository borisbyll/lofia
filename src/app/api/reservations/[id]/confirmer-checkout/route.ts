import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatPrix } from '@/lib/utils'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: resa } = await supabaseAdmin
      .from('reservations')
      .select('*, bien:biens!bien_id(titre)')
      .eq('id', params.id)
      .single()

    if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    if (resa.proprietaire_id !== session.user.id)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    if (resa.checkout_confirme)
      return NextResponse.json({ success: true, message: 'Checkout déjà confirmé' })
    if (resa.statut !== 'en_sejour' && resa.statut !== 'confirme')
      return NextResponse.json({ error: 'Statut de réservation invalide' }, { status: 400 })

    const now = new Date().toISOString()

    await supabaseAdmin.from('reservations').update({
      checkout_confirme:    true,
      checkout_confirme_at: now,
      proprio_paye:         true,
      proprio_paye_at:      now,
      statut:               'termine',
      updated_at:           now,
    }).eq('id', params.id)

    const titreBien = (resa.bien as any)?.titre ?? 'ce bien'

    // Notification locataire — merci + invitation avis
    await supabaseAdmin.from('notifications').insert({
      user_id: resa.locataire_id,
      type:    'sejour_termine',
      titre:   '🙏 Merci d\'avoir choisi LOFIA. !',
      corps:   `Votre séjour à "${titreBien}" est terminé. Nous espérons que votre expérience a été excellente ! Prenez 2 minutes pour évaluer votre hôte — votre avis aide toute la communauté LOFIA.`,
      lien:    `/mon-espace/reservations/${params.id}`,
    })

    // Notification proprio — fonds libérés
    await supabaseAdmin.from('notifications').insert({
      user_id: resa.proprietaire_id,
      type:    'fonds_liberes',
      titre:   '💰 Fonds libérés — checkout confirmé',
      corps:   `Vous avez validé le départ du locataire. Votre revenu de ${formatPrix(resa.montant_proprio)} est libéré et vous sera transféré selon vos coordonnées bancaires.`,
      lien:    `/mon-espace/reservations/${params.id}`,
    })

    // Notification admins
    const { data: admins } = await supabaseAdmin
      .from('profiles').select('id').eq('role', 'admin')
    if (admins?.length) {
      await supabaseAdmin.from('notifications').insert(
        admins.map(a => ({
          user_id: a.id,
          type:    'fonds_liberes_admin',
          titre:   `🔓 Checkout confirmé — ${formatPrix(resa.montant_proprio)}`,
          corps:   `Le propriétaire a validé le check-out pour la réservation ${params.id}. Montant libéré : ${formatPrix(resa.montant_proprio)}.`,
          lien:    '/admin/fonds',
        }))
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[confirmer-checkout]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
