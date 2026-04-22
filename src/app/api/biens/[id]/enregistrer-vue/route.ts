import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const today = new Date().toISOString().split('T')[0]

    await Promise.all([
      supabaseAdmin.rpc('increment_vues', { bien_id_param: params.id }),
      supabaseAdmin.from('stats_biens').upsert(
        { bien_id: params.id, date: today, nombre_vues: 1, nombre_clics_contact: 0 },
        { onConflict: 'bien_id,date', ignoreDuplicates: false }
      ),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[biens/enregistrer-vue]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
