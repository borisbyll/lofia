import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY
const FEDAPAY_BASE   = FEDAPAY_SECRET?.startsWith('sk_live') ? 'https://api.fedapay.com' : 'https://sandbox-api.fedapay.com'
const APP_URL        = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { contrat_id } = await request.json()
    if (!contrat_id) return NextResponse.json({ error: 'contrat_id manquant' }, { status: 400 })

    const { data: contrat } = await supabaseAdmin
      .from('contrats_location')
      .select('*, bien:biens(titre)')
      .eq('id', contrat_id)
      .single()

    if (!contrat) return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    if (contrat.proprietaire_id !== user.id) return NextResponse.json({ error: 'Seul le propriétaire paie les frais de dossier' }, { status: 403 })
    if (contrat.frais_dossier_paye) return NextResponse.json({ error: 'Frais déjà réglés' }, { status: 400 })

    const { data: profil } = await supabaseAdmin.from('profiles').select('nom, phone').eq('id', user.id).single()

    const fedaRes = await fetch(`${FEDAPAY_BASE}/v1/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FEDAPAY_SECRET}` },
      body: JSON.stringify({
        description: `Frais de dossier LOFIA — ${(contrat.bien as any)?.titre ?? ''}`,
        amount:       contrat.frais_dossier,
        currency:     { iso: 'XOF' },
        callback_url: `${APP_URL}/mon-espace/contrats/${contrat_id}`,
        customer:     { firstname: (profil as any)?.nom ?? 'Propriétaire', phone_number: { number: (profil as any)?.phone ?? '', country: 'TG' } },
        metadata:     { type: 'frais_dossier_longue_duree', contrat_id },
      }),
    })

    if (!fedaRes.ok) return NextResponse.json({ error: 'Erreur création paiement' }, { status: 502 })

    const fedaData = await fedaRes.json()
    const txn      = fedaData.v1?.transaction ?? fedaData.v1 ?? fedaData
    const token    = txn?.token
    if (!token) {
      console.error('[payer-frais-dossier] Token manquant dans réponse FedaPay:', JSON.stringify(fedaData))
      return NextResponse.json({ error: 'Impossible de créer le paiement FedaPay' }, { status: 502 })
    }
    const checkoutBase = FEDAPAY_BASE.replace('sandbox-api', 'sandbox-checkout').replace('//api.', '//checkout.')
    const paiementUrl  = `${checkoutBase}/payment-page/${token}`

    await supabaseAdmin.from('contrats_location').update({ fedapay_frais_dossier_id: String(txn?.id ?? '') }).eq('id', contrat_id)

    return NextResponse.json({ success: true, paiement_url: paiementUrl })
  } catch (err) {
    console.error('[longue-duree/payer-frais-dossier]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
