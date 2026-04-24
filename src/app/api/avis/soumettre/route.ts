import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { token, note, commentaire } = await req.json()

    if (!token || !note || note < 1 || note > 5) {
      return NextResponse.json({ error: 'Token et note (1-5) requis' }, { status: 400 })
    }

    const { data: demande } = await supabaseAdmin
      .from('demandes_avis')
      .select('id, auteur_id, sujet_id, bien_id, reservation_id, type, utilisee')
      .eq('token', token)
      .single()

    if (!demande) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    if (demande.utilisee) return NextResponse.json({ error: 'Cet avis a déjà été soumis' }, { status: 409 })

    const { error: insertError } = await supabaseAdmin.from('avis').insert({
      auteur_id: demande.auteur_id,
      sujet_id: demande.sujet_id,
      bien_id: demande.bien_id,
      reservation_id: demande.reservation_id,
      note,
      commentaire: commentaire ?? null,
      type: demande.type,
    })

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    await supabaseAdmin.from('demandes_avis').update({ utilisee: true }).eq('token', token)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
