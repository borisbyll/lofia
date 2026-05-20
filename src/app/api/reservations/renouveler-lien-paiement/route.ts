import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Renouvelle le lien de paiement (2h) pour une demande confirmée expirée
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { demande_id } = await request.json()
    if (!demande_id) return NextResponse.json({ error: 'demande_id requis' }, { status: 400 })

    const { data: demande } = await supabaseAdmin
      .from('demandes_reservation')
      .select('id, locataire_id, statut, tentatives_paiement')
      .eq('id', demande_id)
      .single()

    if (!demande) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (demande.locataire_id !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    if (demande.statut !== 'confirmee') return NextResponse.json({ error: 'La demande n\'est pas en statut confirmé' }, { status: 400 })

    const lien_paiement_expire_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('demandes_reservation')
      .update({
        lien_paiement_expire_at,
        tentatives_paiement: 0, // repart à zéro
      })
      .eq('id', demande_id)

    return NextResponse.json({ success: true, lien_paiement_expire_at })
  } catch (err) {
    console.error('[renouveler-lien-paiement]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
