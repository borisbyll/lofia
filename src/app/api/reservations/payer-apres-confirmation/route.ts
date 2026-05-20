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
    const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens as { titre?: string; owner_id?: string } | null
    const titreBien = (bien as { titre?: string } | null)?.titre ?? 'hébergement'

    if (tentatives >= 3) {
      await supabaseAdmin.from('demandes_reservation').update({ statut: 'annulee_systeme' }).eq('id', demande_id)
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: session.user.id,
          type: 'paiement_echec_max',
          titre: 'Demande annulée — 3 tentatives échouées',
          corps: `Après 3 tentatives infructueuses, votre demande pour "${titreBien}" a été annulée. Vous pouvez soumettre une nouvelle demande.`,
          lien: `/mon-espace/reservations`,
        },
        {
          user_id: demande.proprietaire_id,
          type: 'paiement_echec_max',
          titre: '⚠️ Réservation non finalisée',
          corps: `Le locataire n'a pas finalisé le paiement pour "${titreBien}" après 3 tentatives. La demande a été annulée — les dates sont à nouveau disponibles.`,
          lien: `/mon-espace/reservations`,
        },
      ])
      return NextResponse.json({ error: 'Maximum 3 tentatives atteint. Demande annulée.' }, { status: 400 })
    }

    // Incrémenter les tentatives
    await supabaseAdmin
      .from('demandes_reservation')
      .update({ tentatives_paiement: tentatives + 1 })
      .eq('id', demande_id)

    // Appel direct FedaPay API
    const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY
    const isSandbox = !FEDAPAY_SECRET?.startsWith('sk_live')
    const FEDAPAY_BASE = isSandbox ? 'https://sandbox-api.fedapay.com' : 'https://api.fedapay.com'
    const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

    const { data: profil } = await supabaseAdmin
      .from('profiles')
      .select('nom, phone')
      .eq('id', session.user.id)
      .single()

    const nomClient   = (profil as any)?.nom ?? 'Client'
    const phoneClient = (profil as any)?.phone ?? null
    const amount      = Math.round(Number(demande.montant_total))

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide pour le paiement' }, { status: 400 })
    }

    const customer: Record<string, unknown> = { firstname: nomClient }
    if (phoneClient) customer.phone_number = { number: String(phoneClient), country: 'TG' }

    const fedaRes = await fetch(`${FEDAPAY_BASE}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FEDAPAY_SECRET}`,
      },
      body: JSON.stringify({
        description: `Réservation LOFIA — ${titreBien} (${demande.date_arrivee} → ${demande.date_depart})`,
        amount,
        currency: { iso: 'XOF' },
        callback_url: `${APP_URL}/mon-espace/reservations`,
        customer,
        metadata: {
          type: 'demande_courte_duree',
          demande_id: demande.id,
          bien_id: demande.bien_id,
          locataire_id: session.user.id,
          proprietaire_id: demande.proprietaire_id,
          date_arrivee: demande.date_arrivee,
          date_depart: demande.date_depart,
        },
      }),
    })

    if (!fedaRes.ok) {
      const errBody = await fedaRes.text().catch(() => '')
      console.error('[payer-apres-confirmation] FedaPay error', fedaRes.status, errBody)
      let errMsg = 'Erreur création paiement FedaPay'
      try { errMsg = JSON.parse(errBody)?.message ?? errMsg } catch {}
      return NextResponse.json({ error: errMsg }, { status: 502 })
    }

    const fedaData = await fedaRes.json()
    // FedaPay retourne la transaction sous la clé "v1/transaction" (avec slash)
    const tx = fedaData?.['v1/transaction'] ?? fedaData?.v1?.transaction ?? fedaData?.transaction
    const transaction_id = String(tx?.id ?? '')
    const payment_url = tx?.payment_url ?? null

    if (!payment_url) {
      console.error('[payer-apres-confirmation] payment_url manquant', JSON.stringify(fedaData))
      return NextResponse.json({ error: 'Erreur création lien de paiement' }, { status: 502 })
    }

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
