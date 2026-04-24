import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { dossier_id, date_visite, agent_id } = await req.json()
    if (!dossier_id || !date_visite) return NextResponse.json({ error: 'dossier_id et date_visite requis' }, { status: 400 })

    const { data: dossier } = await supabaseAdmin
      .from('dossiers_vente')
      .select('id, statut, acheteur_id, vendeur_id, bien:biens(titre)')
      .eq('id', dossier_id)
      .single()

    if (!dossier) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

    const update: Record<string, any> = {
      statut: 'visite_planifiee',
      date_visite,
    }
    if (agent_id) update.agent_id = agent_id

    const { error } = await supabaseAdmin
      .from('dossiers_vente')
      .update(update)
      .eq('id', dossier_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const titre = (dossier.bien as any)?.titre ?? 'votre bien'
    const dateLabel = new Date(date_visite).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

    await supabaseAdmin.from('notifications').insert([
      {
        user_id: dossier.acheteur_id,
        type: 'visite_planifiee',
        titre: 'Visite planifiée (vente)',
        corps: `Votre visite pour "${titre}" est planifiée le ${dateLabel}.`,
        lien: `/mon-espace/ventes/${dossier_id}`,
      },
      {
        user_id: dossier.vendeur_id,
        type: 'visite_planifiee',
        titre: 'Visite planifiée (vente)',
        corps: `Une visite de "${titre}" est planifiée le ${dateLabel}.`,
        lien: `/mon-espace/ventes/${dossier_id}`,
      },
    ])

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
