import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: bien } = await supabaseAdmin
      .from('biens')
      .select('id, owner_id, titre, statut')
      .eq('id', params.id)
      .single()

    if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })

    const { error } = await supabaseAdmin
      .from('biens')
      .update({ statut: 'publie', modere_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('notifications').insert({
      user_id: bien.owner_id,
      type: 'bien_approuve',
      titre: 'Annonce approuvée !',
      corps: `Votre annonce "${bien.titre}" a été approuvée et est maintenant visible.`,
      lien: `/mon-espace/mes-biens`,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
