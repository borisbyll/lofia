import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { dossier_id } = await req.json()
    if (!dossier_id) return NextResponse.json({ error: 'dossier_id requis' }, { status: 400 })

    const { data: dossier } = await supabaseAdmin
      .from('dossiers_vente')
      .select('id, statut, vendeur_id, acheteur_id, bien:biens(titre)')
      .eq('id', dossier_id)
      .single()

    if (!dossier) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    if (dossier.vendeur_id !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    if (dossier.statut !== 'virement_en_attente') {
      return NextResponse.json({ error: 'Action non applicable dans ce statut' }, { status: 409 })
    }

    const { error } = await supabaseAdmin
      .from('dossiers_vente')
      .update({ statut: 'virement_confirme', reception_confirmee_at: new Date().toISOString() })
      .eq('id', dossier_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('notifications').insert({
      user_id: dossier.acheteur_id,
      type: 'reception_confirmee',
      titre: 'Réception confirmée',
      corps: `Le vendeur a confirmé la réception du virement pour "${(dossier.bien as any)?.titre}". La vente va être finalisée.`,
      lien: `/mon-espace/ventes/${dossier_id}`,
    })

    return NextResponse.json({ success: true, statut: 'virement_confirme' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
