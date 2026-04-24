import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { dossier_id, decision } = await req.json()
    if (!dossier_id || !['accepte', 'refuse'].includes(decision)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const { data: dossier } = await supabaseAdmin
      .from('dossiers_longue_duree')
      .select('id, statut, locataire_id, bien:biens(titre)')
      .eq('id', dossier_id)
      .single()

    if (!dossier) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    if (dossier.statut !== 'locataire_interesse') {
      return NextResponse.json({ error: 'Action non applicable dans ce statut' }, { status: 409 })
    }

    const nouveauStatut = decision === 'accepte' ? 'proprietaire_accepte' : 'proprietaire_refuse'
    const { error } = await supabaseAdmin
      .from('dossiers_longue_duree')
      .update({ statut: nouveauStatut, decision_proprietaire: decision, decision_proprietaire_at: new Date().toISOString() })
      .eq('id', dossier_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('notifications').insert({
      user_id: dossier.locataire_id,
      type: 'decision_proprietaire',
      titre: decision === 'accepte' ? 'Demande acceptée !' : 'Demande refusée',
      corps: decision === 'accepte'
        ? `Le propriétaire a accepté votre demande pour "${(dossier.bien as any)?.titre}". Un contrat va être généré.`
        : `Le propriétaire a refusé votre demande pour "${(dossier.bien as any)?.titre}".`,
      lien: `/mon-espace/locations/${dossier_id}`,
    })

    return NextResponse.json({ success: true, statut: nouveauStatut })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
