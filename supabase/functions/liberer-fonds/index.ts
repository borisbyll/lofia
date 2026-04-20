// Supabase Edge Function — Cron toutes les 5 minutes
// 1. Libère les fonds séquestre 24h après check-in
// 2. Termine les réservations dont date_fin est dépassée

import { createClient } from '@supabase/supabase-js'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1. Libération des fonds séquestre
  const { data: liberees, error: errFonds } = await supabase.rpc('liberer_fonds_sequestre')
  if (errFonds) console.error('Erreur libération fonds:', errFonds.message)

  // 2. Terminer les séjours expirés
  const { data: terminees, error: errTermine } = await supabase.rpc('terminer_sejours_expires')
  if (errTermine) console.error('Erreur terminaison séjours:', errTermine.message)

  console.log(`Fonds libérés: ${liberees ?? 0} | Séjours terminés: ${terminees ?? 0}`)

  return new Response(
    JSON.stringify({ liberees: liberees ?? 0, terminees: terminees ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
