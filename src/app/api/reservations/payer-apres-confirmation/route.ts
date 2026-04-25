import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §1.2 Étape 4 — Paiement après confirmation proprio
// Max 3 tentatives. Lien expire 2h après confirmation.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { demande_id } = await request.json()
    if (!demande_id) return NextResponse.json({ error: 'demande_id requis' }, { status: 400 })

    const { data: demande } = await supabaseAdmin
      .from('demandes_reservation')
      .select('*, biens(titre, owner_id)')
      .eq('id', demande_id)
      .single()

    if (!demande) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (demande.locataire_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (demande.statut !== 'confirmee') {
      return NextResponse.json({ error: 'Cette demande n\'est pas en attente de paiement' }, { status: 400 })
    }

    // Vérifier expiration du lien de paiement (2h)
    if (demande.lien_paiement_expire_at && new Date(demande.lien_paiement_expire_at) < new Date()) {
      await supabaseAdmin.from('demandes_reservation').update({ statut: 'expiree' }).eq('id', demande_id)
      return NextResponse.json({ error: 'Le lien de paiement a expiré. Soumettez une nouvelle demande.' }, { status: 410 })
    }

    // Vérifier nb de tentatives (max 3)
    const tentatives = demande.tentatives_paiement ?? 0
    if (tentatives >= 3) {
      await supabaseAdmin.from('demandes_reservation').update({ statut: 'annulee_systeme' }).eq('id', demande_id)
      await supabaseAdmin.from('notifications').insert({
        user_id: session.user.id,
        type: 'paiement_echec_max',
        titre: 'Demande annulée',
        corps: 'Après 3 tentatives infructueuses, votre demande a été annulée. Vous pouvez soumettre une nouvelle demande.',
        lien: `/mon-espace/reservations`,
      })
      return NextResponse.json({ error: 'Maximum 3 tentatives atteint. Demande annulée.' }, { status: 400 })
    }

    const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens as { titre?: string; owner_id?: string } | null
    const titreBien = (bien as { titre?: string } | null)?.titre ?? 'hébergement'

    // Incrémenter les tentatives
    await supabaseAdmin
      .from('demandes_reservation')
      .update({ tentatives_paiement: tentatives + 1 })
      .eq('id', demande_id)

    // Appel Edge Function FedaPay
    const fedapayRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-fedapay-transaction`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          amount: demande.montant_total,
          description: `Réservation LOFIA — ${titreBien} (${demande.date_arrivee} → ${demande.date_depart})`,
          customer_email: session.user.email,
          metadata: { demande_id: demande.id, type: 'demande_courte_duree' },
        }),
      }
    )

    if (!fedapayRes.ok) {
      const err = await fedapayRes.json().catch(() => ({}))
      return NextResponse.json({ error: err.error ?? 'Erreur création paiement FedaPay' }, { status: 502 })
    }

    const { payment_url, transaction_id } = await fedapayRes.json()

    await supabaseAdmin
      .from('demandes_reservation')
      .update({ fedapay_transaction_id: transaction_id })
      .eq('id', demande_id)

    return NextResponse.json({
      success: true,
      payment_url,
      transaction_id,
      tentatives_restantes: 3 - (tentatives + 1),
    })
  } catch (err) {
    console.error('[payer-apres-confirmation]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
