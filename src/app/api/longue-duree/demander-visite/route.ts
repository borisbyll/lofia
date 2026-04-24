import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { genererRefLongueDuree } from '@/lib/utils/references'
import { genererCodeVisite } from '@/lib/utils/codes'
import { monetisation } from '@/lib/config/monetisation'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { bien_id, message } = await req.json()
    if (!bien_id) return NextResponse.json({ error: 'bien_id requis' }, { status: 400 })

    const { data: bien } = await supabaseAdmin
      .from('biens')
      .select('id, owner_id, titre, statut, type_location')
      .eq('id', bien_id)
      .single()

    if (!bien || bien.statut !== 'publie') return NextResponse.json({ error: 'Bien non disponible' }, { status: 404 })
    if (bien.owner_id === session.user.id) return NextResponse.json({ error: 'Vous ne pouvez pas faire une demande sur votre propre bien' }, { status: 400 })

    const { data: existant } = await supabaseAdmin
      .from('dossiers_longue_duree')
      .select('id')
      .eq('bien_id', bien_id)
      .eq('locataire_id', session.user.id)
      .not('statut', 'in', '(expire,refuse)')
      .maybeSingle()

    if (existant) return NextResponse.json({ error: 'Une demande est déjà en cours pour ce bien' }, { status: 409 })

    const reference = genererRefLongueDuree()
    const code_visite = genererCodeVisite()
    const frais_visite = monetisation.longue_duree.frais_visite

    const { data: dossier, error } = await supabaseAdmin
      .from('dossiers_longue_duree')
      .insert({
        bien_id,
        locataire_id: session.user.id,
        proprietaire_id: bien.owner_id,
        reference,
        code_visite,
        frais_visite,
        statut: 'demande_recue',
        message: message ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('notifications').insert({
      user_id: bien.owner_id,
      type: 'nouvelle_demande_visite',
      titre: 'Nouvelle demande de visite',
      corps: `Un locataire souhaite visiter "${bien.titre}"`,
      lien: `/mon-espace/locations/${dossier.id}`,
    })

    return NextResponse.json({ success: true, dossier_id: dossier.id, reference })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
