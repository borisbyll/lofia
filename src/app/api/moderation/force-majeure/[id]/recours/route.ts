import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §4.4 — Recours suite à un refus FM (une seule fois, transmis à l'admin)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { motif_recours } = await request.json()
    if (!motif_recours?.trim()) {
      return NextResponse.json({ error: 'Le motif de recours est requis' }, { status: 400 })
    }

    const { data: fm } = await supabaseAdmin
      .from('demandes_force_majeure')
      .select('*, reservations(biens(titre))')
      .eq('id', params.id)
      .single()

    if (!fm) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (fm.locataire_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (fm.statut !== 'refusee') {
      return NextResponse.json({ error: 'Le recours n\'est disponible que pour une demande refusée' }, { status: 400 })
    }
    if (!fm.recours_possible || fm.recours_soumis) {
      return NextResponse.json({ error: 'Le recours a déjà été soumis ou n\'est plus disponible' }, { status: 400 })
    }

    await supabaseAdmin
      .from('demandes_force_majeure')
      .update({ recours_soumis: true, motif_recours: motif_recours.trim(), statut: 'en_recours' })
      .eq('id', params.id)

    // Notifier les admins
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      await supabaseAdmin.from('notifications').insert(
        admins.map(admin => ({
          user_id: admin.id,
          type: 'recours_force_majeure',
          titre: 'Recours force majeure reçu',
          corps: `Un locataire conteste la décision de refus de sa demande force majeure. À examiner.`,
          lien: `/admin/force-majeure`,
        }))
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[recours FM]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
