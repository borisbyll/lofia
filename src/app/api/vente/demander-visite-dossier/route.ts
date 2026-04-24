import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { genererRefVente } from '@/lib/utils/references'
import { genererCodeVisite } from '@/lib/utils/codes'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { bien_id, message } = await req.json()
    if (!bien_id) return NextResponse.json({ error: 'bien_id requis' }, { status: 400 })

    const { data: bien } = await supabaseAdmin
      .from('biens')
      .select('id, owner_id, titre, statut, categorie')
      .eq('id', bien_id)
      .single()

    if (!bien || bien.statut !== 'publie') return NextResponse.json({ error: 'Bien non disponible' }, { status: 404 })
    if (bien.owner_id === session.user.id) return NextResponse.json({ error: 'Vous ne pouvez pas faire une demande sur votre propre bien' }, { status: 400 })
    if (bien.categorie !== 'vente') return NextResponse.json({ error: 'Ce bien n\'est pas en vente' }, { status: 400 })

    const { data: existant } = await supabaseAdmin
      .from('dossiers_vente')
      .select('id')
      .eq('bien_id', bien_id)
      .eq('acheteur_id', session.user.id)
      .not('statut', 'in', '(expire,refuse)')
      .maybeSingle()

    if (existant) return NextResponse.json({ error: 'Une demande est déjà en cours pour ce bien' }, { status: 409 })

    const reference = genererRefVente()
    const code_visite = genererCodeVisite()

    const { data: dossier, error } = await supabaseAdmin
      .from('dossiers_vente')
      .insert({
        bien_id,
        acheteur_id: session.user.id,
        vendeur_id: bien.owner_id,
        reference,
        code_visite,
        statut: 'demande_recue',
        message: message ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('notifications').insert({
      user_id: bien.owner_id,
      type: 'nouvelle_demande_visite_vente',
      titre: 'Nouvelle demande de visite (vente)',
      corps: `Un acheteur souhaite visiter "${bien.titre}"`,
      lien: `/mon-espace/ventes/${dossier.id}`,
    })

    return NextResponse.json({ success: true, dossier_id: dossier.id, reference })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
