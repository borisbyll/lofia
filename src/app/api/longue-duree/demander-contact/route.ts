import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { genererCodeVisite } from '@/lib/utils/codes'
import { notifMiseEnRelation } from '@/lib/notifications/whatsapp'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { bien_id, message } = await request.json()
    if (!bien_id) return NextResponse.json({ error: 'bien_id manquant' }, { status: 400 })

    const { data: bien } = await supabaseAdmin
      .from('biens')
      .select('id, titre, adresse, quartier, ville, owner_id, categorie, type_location, proprietaire:profiles!biens_owner_id_fkey(id, nom, phone)')
      .eq('id', bien_id)
      .eq('statut', 'publie')
      .single()

    if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    if (bien.owner_id === user.id) return NextResponse.json({ error: 'Vous ne pouvez pas contacter votre propre annonce' }, { status: 400 })
    if (bien.categorie !== 'location' || bien.type_location !== 'longue_duree') {
      return NextResponse.json({ error: 'Ce bien n\'est pas en location longue durée' }, { status: 400 })
    }

    // Vérifier qu'aucune mise en relation active n'existe déjà
    const { data: existing } = await supabaseAdmin
      .from('mises_en_relation')
      .select('id, code_visite')
      .eq('bien_id', bien_id)
      .eq('locataire_id', user.id)
      .not('statut', 'in', '("annule","expire")')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ code_visite: existing.code_visite, already_exists: true })
    }

    const code_visite       = genererCodeVisite()
    const token_confirmation = crypto.randomUUID()
    const proprio = Array.isArray(bien.proprietaire) ? bien.proprietaire[0] : bien.proprietaire as any

    const { data: mer, error } = await supabaseAdmin
      .from('mises_en_relation')
      .insert({
        bien_id,
        locataire_id:    user.id,
        proprietaire_id: bien.owner_id,
        code_visite,
        token_confirmation,
        statut: 'en_attente',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const adresse = [bien.adresse, bien.quartier, bien.ville].filter(Boolean).join(', ')
    const { data: loc } = await supabaseAdmin.from('profiles').select('phone').eq('id', user.id).single()

    const lienBase = `${APP_URL}/api/longue-duree/confirmer-visite?token=${token_confirmation}`
    await notifMiseEnRelation({
      telLoc:  (loc as any)?.phone ?? '',
      telPro:  proprio?.phone ?? '',
      codeVisite: code_visite,
      adresse,
      lienLoc: `${lienBase}&partie=locataire`,
      lienPro: `${lienBase}&partie=proprietaire`,
    })

    // Notification dashboard proprio
    await supabaseAdmin.from('notifications').insert({
      user_id: bien.owner_id,
      type:    'nouvelle_demande_visite',
      titre:   'Nouvelle demande de visite',
      corps:   `Un locataire souhaite visiter votre bien "${bien.titre}". Code de visite : ${code_visite}`,
      lien:    `/mon-espace/mises-en-relation/${mer.id}`,
    })

    return NextResponse.json({ success: true, code_visite, id: mer.id })
  } catch (err) {
    console.error('[longue-duree/demander-contact]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
