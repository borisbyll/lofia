import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { reservation_id, heure } = await request.json()
  if (!reservation_id || !heure) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { data: resa } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('id', reservation_id)
    .eq('locataire_id', session.user.id)
    .single()

  if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

  await supabaseAdmin
    .from('reservations')
    .update({ heure_arrivee_prevue: heure })
    .eq('id', reservation_id)

  return NextResponse.json({ success: true })
}
