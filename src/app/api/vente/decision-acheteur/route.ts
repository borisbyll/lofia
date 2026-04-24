import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const reponse = searchParams.get('reponse')

    if (!token || !['oui', 'non'].includes(reponse ?? '')) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const { data: dossier } = await supabaseAdmin
      .from('dossiers_vente')
      .select('id, statut, vendeur_id, bien:biens(titre)')
      .eq('token_acheteur', token)
      .single()

    if (!dossier) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    if (dossier.statut !== 'visite_effectuee') {
      return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 409 })
    }

    const nouveauStatut = reponse === 'oui' ? 'acheteur_interesse' : 'acheteur_refuse'
    const { error } = await supabaseAdmin
      .from('dossiers_vente')
      .update({ statut: nouveauStatut, decision_acheteur: reponse, decision_acheteur_at: new Date().toISOString() })
      .eq('id', dossier.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (reponse === 'oui') {
      await supabaseAdmin.from('notifications').insert({
        user_id: dossier.vendeur_id,
        type: 'acheteur_interesse',
        titre: 'Acheteur intéressé',
        corps: `Un acheteur est intéressé par "${(dossier.bien as any)?.titre}". Donnez votre réponse.`,
        lien: `/mon-espace/ventes/${dossier.id}`,
      })
    }

    return NextResponse.json({ success: true, statut: nouveauStatut })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
