import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { dossier_id, promesse_id } = await request.json()

    if (dossier_id) {
      const { data: dossier } = await supabaseAdmin
        .from('dossiers_vente')
        .select('id, bien_id, acheteur_id, vendeur_id, statut')
        .eq('id', dossier_id)
        .single()

      if (!dossier) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
      if (!['virement_confirme', 'moderateur'].includes(dossier.statut) && dossier.statut !== 'virement_confirme') {
        // Allow moderator to force-mark
      }

      await Promise.all([
        supabaseAdmin.from('dossiers_vente').update({ statut: 'vendu', date_marquage_vendu: new Date().toISOString() }).eq('id', dossier_id),
        supabaseAdmin.from('biens').update({ statut: 'archive' }).eq('id', dossier.bien_id),
      ])

      await supabaseAdmin.from('notifications').insert([
        { user_id: dossier.acheteur_id, type: 'vente_finalisee', titre: 'Vente finalisée !', corps: 'La vente a été finalisée. Félicitations !', lien: `/mon-espace/ventes/${dossier_id}` },
        { user_id: dossier.vendeur_id,  type: 'vente_finalisee', titre: 'Vente finalisée !', corps: 'La vente a été finalisée. Félicitations !', lien: `/mon-espace/ventes/${dossier_id}` },
      ])

      return NextResponse.json({ success: true })
    }

    if (promesse_id) {
      const { data: promesse } = await supabaseAdmin
        .from('promesses_vente')
        .select('*')
        .eq('id', promesse_id)
        .single()

      if (!promesse) return NextResponse.json({ error: 'Promesse introuvable' }, { status: 404 })
      if (promesse.vendeur_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

      await Promise.all([
        supabaseAdmin.from('promesses_vente').update({ statut: 'vendu' }).eq('id', promesse_id),
        supabaseAdmin.from('biens').update({ statut: 'archive' }).eq('id', promesse.bien_id),
      ])

      await supabaseAdmin.from('notifications').insert({
        user_id: promesse.acheteur_id,
        type: 'vente_finalisee',
        titre: 'Vente finalisée',
        corps: 'Le vendeur a confirmé la finalisation de la vente.',
        lien: `/mon-espace/ventes/promesse/${promesse_id}`,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'dossier_id ou promesse_id requis' }, { status: 400 })
  } catch (err) {
    console.error('[vente/marquer-vendu]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
