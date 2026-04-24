import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { motif } = await req.json()
    if (!motif?.trim()) return NextResponse.json({ error: 'Motif requis' }, { status: 400 })

    const { data: bien } = await supabaseAdmin
      .from('biens')
      .select('id, owner_id, titre')
      .eq('id', params.id)
      .single()

    if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })

    const { error } = await supabaseAdmin
      .from('biens')
      .update({ statut: 'rejete', note_moderation: motif, modere_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('notifications').insert({
      user_id: bien.owner_id,
      type: 'bien_rejete',
      titre: 'Annonce refusée',
      corps: `Votre annonce "${bien.titre}" a été refusée. Motif : ${motif}`,
      lien: `/mon-espace/mes-biens`,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
