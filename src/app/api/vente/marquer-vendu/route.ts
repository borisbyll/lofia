import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { promesse_id } = await request.json()
    if (!promesse_id) return NextResponse.json({ error: 'promesse_id manquant' }, { status: 400 })

    const { data: promesse } = await supabaseAdmin
      .from('promesses_vente')
      .select('*')
      .eq('id', promesse_id)
      .single()

    if (!promesse) return NextResponse.json({ error: 'Promesse introuvable' }, { status: 404 })
    if (promesse.vendeur_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    if (promesse.statut !== 'signe') return NextResponse.json({ error: 'La promesse doit être signée' }, { status: 400 })

    await Promise.all([
      supabaseAdmin.from('promesses_vente').update({ statut: 'vendu', updated_at: new Date().toISOString() }).eq('id', promesse_id),
      supabaseAdmin.from('biens').update({ statut: 'archive', updated_at: new Date().toISOString() }).eq('id', promesse.bien_id),
    ])

    await supabaseAdmin.from('notifications').insert([
      {
        user_id: promesse.acheteur_id,
        type: 'vente_finalisee',
        titre: 'Vente finalisée',
        corps: 'Le vendeur a confirmé la finalisation de la vente. Félicitations !',
        lien: `/mon-espace/ventes/promesse/${promesse_id}`,
      },
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[vente/marquer-vendu]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
