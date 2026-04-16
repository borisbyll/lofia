// Supabase Edge Function — Vérifie auth + ownership et retourne les données de paiement

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://lofia.vercel.app', 'https://logikahome.com', 'https://www.logikahome.com', 'http://localhost:3000']

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

    const { reservation_id } = await req.json()
    if (!reservation_id) {
      return new Response(JSON.stringify({ error: 'reservation_id requis' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: resa, error: resaErr } = await supabase
      .from('reservations')
      .select('id, prix_total, nb_nuits, paiement_effectue')
      .eq('id', reservation_id)
      .eq('locataire_id', user.id)
      .single()

    if (resaErr || !resa) {
      return new Response(JSON.stringify({ error: 'Réservation introuvable' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (resa.paiement_effectue) {
      return new Response(JSON.stringify({ error: 'Déjà payée' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ prix_total: Number(resa.prix_total), reservation_id: resa.id }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('Unexpected error:', String(e))
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
