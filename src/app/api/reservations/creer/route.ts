import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'
const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY
const FEDAPAY_BASE   = FEDAPAY_SECRET?.startsWith('sk_live') ? 'https://api.fedapay.com' : 'https://sandbox-api.fedapay.com'

export async function POST(request: Request) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { bien_id, date_arrivee, date_depart } = await request.json()
    if (!bien_id || !date_arrivee || !date_depart) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Vérifier disponibilité
    const dispo = await fetch(`${APP_URL}/api/reservations/verifier-disponibilite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bien_id, date_arrivee, date_depart }),
    }).then(r => r.json())

    if (!dispo.disponible) {
      return NextResponse.json({ error: 'Ce bien n\'est pas disponible pour ces dates' }, { status: 409 })
    }

    // Récupérer bien + proprio
    const { data: bien } = await supabaseAdmin
      .from('biens')
      .select('owner_id, titre, prix')
      .eq('id', bien_id)
      .single()

    if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    if (bien.owner_id === user.id) return NextResponse.json({ error: 'Vous ne pouvez pas réserver votre propre bien' }, { status: 400 })

    // Créer réservation en BDD (statut en_attente)
    const { data: resa, error: resaErr } = await supabaseAdmin
      .from('reservations')
      .insert({
        bien_id,
        locataire_id:   user.id,
        proprietaire_id: bien.owner_id,
        date_debut:     date_arrivee,
        date_fin:       date_depart,
        nb_nuits:       dispo.nb_nuits,
        prix_total:     dispo.montant_total,
        commission:     dispo.commission_lofia,
        commission_voyageur: Math.round(dispo.montant_total * 0.08),
        commission_hote:     Math.round(dispo.montant_total * 0.03),
        montant_proprio:     dispo.montant_proprietaire,
        prix_nuit:      dispo.prix_nuit,
        statut:         'en_attente',
        paiement_effectue: false,
      })
      .select()
      .single()

    if (resaErr) return NextResponse.json({ error: resaErr.message }, { status: 500 })

    // Récupérer profil locataire pour FedaPay
    const { data: profil } = await supabaseAdmin.from('profiles').select('nom, phone').eq('id', user.id).single()

    // Créer transaction FedaPay
    const fedaRes = await fetch(`${FEDAPAY_BASE}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FEDAPAY_SECRET}`,
      },
      body: JSON.stringify({
        description: `Réservation LOFIA — ${bien.titre}`,
        amount:      dispo.montant_total,
        currency:    { iso: 'XOF' },
        callback_url: `${APP_URL}/mon-espace/reservations`,
        customer:    { firstname: (profil as any)?.nom ?? 'Client', phone_number: { number: (profil as any)?.phone ?? '', country: 'TG' } },
        metadata:    { type: 'reservation_courte_duree', reservation_id: resa.id, bien_id },
      }),
    })

    if (!fedaRes.ok) {
      await supabaseAdmin.from('reservations').delete().eq('id', resa.id)
      return NextResponse.json({ error: 'Erreur création paiement' }, { status: 502 })
    }

    const fedaData  = await fedaRes.json()
    const token     = fedaData.v1?.token ?? fedaData.token
    const paiementUrl = `${FEDAPAY_BASE.replace('api', 'checkout')}/payment-page/${token}`

    await supabaseAdmin.from('reservations').update({ fedapay_transaction_id: String(fedaData.v1?.id ?? fedaData.id) }).eq('id', resa.id)

    return NextResponse.json({ success: true, reservation_id: resa.id, paiement_url: paiementUrl })
  } catch (err) {
    console.error('[reservations/creer]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
