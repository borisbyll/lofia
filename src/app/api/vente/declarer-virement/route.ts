import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { dossier_id, reference_virement } = await req.json()
    if (!dossier_id) return NextResponse.json({ error: 'dossier_id requis' }, { status: 400 })

    const { data: dossier } = await supabaseAdmin
      .from('dossiers_vente')
      .select('id, statut, acheteur_id, vendeur_id, bien:biens(titre)')
      .eq('id', dossier_id)
      .single()

    if (!dossier) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    if (dossier.acheteur_id !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    if (!['promesse_signee', 'virement_en_attente'].includes(dossier.statut)) {
      return NextResponse.json({ error: 'Action non applicable dans ce statut' }, { status: 409 })
    }

    const { error } = await supabaseAdmin
      .from('dossiers_vente')
      .update({ statut: 'virement_en_attente', reference_virement: reference_virement ?? null, virement_declare_at: new Date().toISOString() })
      .eq('id', dossier_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('notifications').insert({
      user_id: dossier.vendeur_id,
      type: 'virement_declare',
      titre: 'Virement déclaré',
      corps: `L'acheteur déclare avoir effectué le virement pour "${(dossier.bien as any)?.titre}". Confirmez la réception.`,
      lien: `/vente/virement/${dossier_id}`,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
