import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §1.2 — Annulation d'une demande par le locataire (avant confirmation)
// Palier 0 : aucun paiement, score neutre
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { demande_id } = await request.json()
    if (!demande_id) return NextResponse.json({ error: 'demande_id requis' }, { status: 400 })

    const { data: demande } = await supabaseAdmin
      .from('demandes_reservation')
      .select('*, biens(titre)')
      .eq('id', demande_id)
      .single()

    if (!demande) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (demande.locataire_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (!['en_attente', 'confirmee'].includes(demande.statut)) {
      return NextResponse.json({ error: 'Cette demande ne peut plus être annulée' }, { status: 400 })
    }

    const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens as { titre?: string } | null
    const titreBien = (bien as { titre?: string } | null)?.titre ?? 'le bien'

    await supabaseAdmin
      .from('demandes_reservation')
      .update({ statut: 'annulee_locataire' })
      .eq('id', demande_id)

    // Notification propriétaire
    await supabaseAdmin.from('notifications').insert({
      user_id: demande.proprietaire_id,
      type: 'demande_annulee',
      titre: 'Demande annulée par le locataire',
      corps: `Le locataire a annulé sa demande pour "${titreBien}" (${demande.date_arrivee} au ${demande.date_depart}).`,
      lien: `/mon-espace/reservations`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[annuler-demande]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
