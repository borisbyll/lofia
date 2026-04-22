import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FORMULES } from '@/lib/sponsoring/formules'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'
const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY ?? ''

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { bien_id, formule_id } = await request.json()
    if (!bien_id || !formule_id) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

    const formule = FORMULES.find(f => f.id === formule_id)
    if (!formule) return NextResponse.json({ error: 'Formule invalide' }, { status: 400 })

    const { data: bien } = await supabaseAdmin.from('biens').select('id, titre, owner_id').eq('id', bien_id).single()
    if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    if (bien.owner_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { data: profil } = await supabaseAdmin.from('profiles').select('nom, phone').eq('id', user.id).single()

    const fedapayUrl = FEDAPAY_SECRET.startsWith('sk_live') ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1'

    const fedRes = await fetch(`${fedapayUrl}/transactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${FEDAPAY_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: `Sponsoring ${formule.nom} — ${(bien as any).titre}`,
        amount: formule.prix,
        currency: { iso: 'XOF' },
        callback_url: `${APP_URL}/mon-espace/mes-biens/${bien_id}/sponsoriser?success=true`,
        customer: { firstname: (profil as any)?.nom ?? '', phone_number: { number: (profil as any)?.phone ?? '', country: 'TG' } },
        metadata: { type: 'sponsoring', bien_id, formule_id, user_id: user.id },
      }),
    })

    if (!fedRes.ok) {
      const err = await fedRes.text()
      console.error('[sponsoring/souscrire] FedaPay error:', err)
      return NextResponse.json({ error: 'Erreur paiement' }, { status: 500 })
    }

    const fedData = await fedRes.json()
    const transaction = fedData.v1?.transaction ?? fedData.transaction

    const tokenRes = await fetch(`${fedapayUrl}/transactions/${transaction.id}/token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${FEDAPAY_SECRET}` },
    })
    const tokenData = await tokenRes.json()
    const paiementUrl = tokenData.v1?.token?.token ? `https://checkout.fedapay.com/${tokenData.v1.token.token}` : null

    const dateDebut = new Date()
    const dateFin   = new Date(dateDebut.getTime() + formule.duree_jours * 86400000)

    const { data: sponso } = await supabaseAdmin.from('sponsorisations').insert({
      bien_id,
      proprietaire_id: user.id,
      formule: formule_id,
      montant: formule.prix,
      date_debut: dateDebut.toISOString(),
      date_fin: dateFin.toISOString(),
      fedapay_transaction_id: String(transaction.id),
      statut: 'en_attente',
    }).select().single()

    return NextResponse.json({ success: true, paiement_url: paiementUrl })
  } catch (err) {
    console.error('[sponsoring/souscrire]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
