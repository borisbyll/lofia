import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §1.2 Étape 3 — Confirmation par le propriétaire via token (sans connexion)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

    const { data: demande } = await supabaseAdmin
      .from('demandes_reservation')
      .select('*, biens(titre, prix)')
      .eq('token_confirmation', token)
      .single()

    if (!demande) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    if (demande.statut !== 'en_attente') {
      return NextResponse.json({
        error: `Cette demande a déjà été traitée (statut : ${demande.statut})`,
        statut: demande.statut,
      }, { status: 409 })
    }
    if (new Date(demande.expire_at) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 410 })
    }

    // Vérifier que les dates sont toujours disponibles
    const { data: conflit } = await supabaseAdmin
      .from('disponibilites')
      .select('id')
      .eq('bien_id', demande.bien_id)
      .or(`and(date_debut.lte.${demande.date_arrivee},date_fin.gte.${demande.date_arrivee}),and(date_debut.lte.${demande.date_depart},date_fin.gte.${demande.date_depart})`)
      .maybeSingle()

    if (conflit) {
      await supabaseAdmin.from('demandes_reservation').update({ statut: 'annulee_systeme' }).eq('id', demande.id)
      return NextResponse.json({ error: 'Les dates ne sont plus disponibles. La demande a été annulée.' }, { status: 409 })
    }

    const lien_paiement_expire_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('demandes_reservation')
      .update({ statut: 'confirmee', lien_paiement_expire_at })
      .eq('id', demande.id)

    const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens as { titre?: string } | null
    const titreBien = (bien as { titre?: string } | null)?.titre ?? 'votre hébergement'

    // Notification locataire avec lien de paiement
    await supabaseAdmin.from('notifications').insert({
      user_id: demande.locataire_id,
      type: 'demande_confirmee',
      titre: '🎉 Votre demande a été confirmée !',
      corps: `"${titreBien}" — Procédez au paiement maintenant. Ce lien expire dans 2h.`,
      lien: `/reservations/payer/${demande.id}`,
    })

    return NextResponse.json({
      success: true,
      demande_id: demande.id,
      locataire_id: demande.locataire_id,
      lien_paiement_expire_at,
    })
  } catch (err) {
    console.error('[confirmer-demande]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
