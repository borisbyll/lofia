import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY ?? ''
const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { contrat_id } = await req.json()
    if (!contrat_id) return NextResponse.json({ error: 'contrat_id requis' }, { status: 400 })

    const { data: contrat } = await supabaseAdmin
      .from('contrats_location')
      .select('*, dossier:dossiers_longue_duree(id, locataire_id, proprietaire_id), bien:biens(titre)')
      .eq('id', contrat_id)
      .single()

    if (!contrat) return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    if ((contrat.dossier as any)?.locataire_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (contrat.frais_payes) return NextResponse.json({ error: 'Déjà payé' }, { status: 409 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nom, phone')
      .eq('id', session.user.id)
      .single()

    const montant_total = (contrat.loyer_mensuel ?? 0) + (contrat.depot_garantie ?? 0) + (contrat.frais_dossier ?? 0)

    const isSandbox = !FEDAPAY_SECRET.startsWith('sk_live')
    const baseUrl = isSandbox ? 'https://sandbox-api.fedapay.com' : 'https://api.fedapay.com'

    const txRes = await fetch(`${baseUrl}/v1/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FEDAPAY_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: `Premier loyer — ${(contrat.bien as any)?.titre}`,
        amount: montant_total,
        currency: { iso: 'XOF' },
        callback_url: `${APP_URL}/api/webhooks/fedapay`,
        customer: { firstname: (profile?.nom ?? '').split(' ')[0] ?? 'Client', phone_number: { number: profile?.phone ?? '', country: 'TG' } },
        metadata: { type: 'premier_loyer', contrat_id },
      }),
    })

    const tx = await txRes.json()
    if (!txRes.ok) return NextResponse.json({ error: tx.message ?? 'Erreur FedaPay' }, { status: 500 })

    const txId = tx.v1?.transaction?.id ?? tx.transaction?.id
    const paymentToken = tx.v1?.token ?? tx.token

    await supabaseAdmin
      .from('contrats_location')
      .update({ fedapay_transaction_id: String(txId) })
      .eq('id', contrat_id)

    return NextResponse.json({
      success: true,
      payment_url: `${isSandbox ? 'https://sandbox-checkout.fedapay.com' : 'https://checkout.fedapay.com'}/pay/${paymentToken}`,
      montant_total,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
