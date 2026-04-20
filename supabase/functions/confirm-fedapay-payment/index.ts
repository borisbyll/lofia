// Supabase Edge Function — Vérifie le statut FedaPay et confirme la réservation

import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = ['https://lofia.vercel.app', 'https://lofia.com', 'https://www.lofia.com', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const fedapayBase = () => {
  const key = Deno.env.get('FEDAPAY_SECRET_KEY') ?? ''
  return key.startsWith('sk_live') ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1'
}

Deno.serve(async (req) => {
  const CORS = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { reservation_id, transaction_id } = body
    if (!reservation_id || !transaction_id) {
      return new Response(JSON.stringify({ error: 'reservation_id et transaction_id requis' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: resa, error: resaErr } = await supabase
      .from('reservations')
      .select(`
        id, prix_total, commission, montant_proprio,
        date_debut, date_fin, nb_nuits, paiement_effectue,
        proprietaire_id,
        bien:biens(titre)
      `)
      .eq('id', reservation_id)
      .eq('locataire_id', user.id)
      .single()

    if (resaErr || !resa) {
      return new Response(JSON.stringify({ error: 'Réservation introuvable' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (resa.paiement_effectue) {
      return new Response(JSON.stringify({ success: true, status: 'already_paid' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const txResp = await fetch(`${fedapayBase()}/transactions/${transaction_id}`, {
      headers: { 'Authorization': `Bearer ${Deno.env.get('FEDAPAY_SECRET_KEY')}` },
    })

    if (!txResp.ok) {
      const err = await txResp.text()
      return new Response(JSON.stringify({ error: 'Erreur vérification FedaPay', detail: err }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const txData = await txResp.json()
    const tx     = txData['v1/transaction']
    const status = tx?.status ?? 'unknown'

    if (status !== 'approved') {
      return new Response(JSON.stringify({ success: false, status }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('reservations').update({
      paiement_effectue:      true,
      statut:                 'confirme',
      fedapay_status:         'approved',
      fedapay_transaction_id: String(transaction_id),
      paiement_at:            new Date().toISOString(),
    }).eq('id', reservation_id)

    const bien = resa.bien as any
    const fmt  = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })

    // Notifier le locataire : réservation confirmée
    await supabase.from('notifications').insert({
      user_id: user.id,
      type:    'reservation_confirmee',
      titre:   '✅ Réservation confirmée',
      corps:   `Votre réservation pour "${bien?.titre}" est confirmée. Pensez à confirmer votre arrivée le ${fmt(resa.date_debut)}.`,
      lien:    '/mon-espace/reservations',
    })

    // Notifier le propriétaire : paiement reçu en séquestre
    if (resa.proprietaire_id) {
      await supabase.from('notifications').insert({
        user_id: resa.proprietaire_id,
        type:    'paiement_recu',
        titre:   '💰 Paiement reçu — en séquestre',
        corps:   `Le paiement pour "${bien?.titre}" (${fmt(resa.date_debut)} → ${fmt(resa.date_fin)}) a été reçu. Les fonds seront libérés 24h après l'arrivée.`,
        lien:    '/mon-espace/reservations',
      })
    }

    return new Response(JSON.stringify({ success: true, status: 'approved' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Unexpected error:', String(e))
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
