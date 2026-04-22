import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { genererCodeVisiteVente } from '@/lib/utils/codes'
import { notifDemandeVisite } from '@/lib/notifications/whatsapp'

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
      .select('id, titre, adresse, quartier, ville, owner_id, categorie, proprietaire:profiles!biens_owner_id_fkey(id, nom, phone)')
      .eq('id', bien_id)
      .eq('statut', 'publie')
      .single()

    if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    if (bien.owner_id === user.id) return NextResponse.json({ error: 'Vous êtes le vendeur' }, { status: 400 })
    if (bien.categorie !== 'vente') return NextResponse.json({ error: 'Ce bien n\'est pas en vente' }, { status: 400 })

    // Vérifier doublon actif
    const { data: existing } = await supabaseAdmin
      .from('demandes_visite_vente')
      .select('id, code_visite')
      .eq('bien_id', bien_id)
      .eq('acheteur_id', user.id)
      .not('statut', 'in', '("annule")')
      .maybeSingle()

    if (existing) return NextResponse.json({ code_visite: existing.code_visite, already_exists: true })

    const code_visite        = genererCodeVisiteVente()
    const token_confirmation = crypto.randomUUID()
    const proprio = Array.isArray(bien.proprietaire) ? bien.proprietaire[0] : bien.proprietaire as any

    const { data: dvv, error } = await supabaseAdmin
      .from('demandes_visite_vente')
      .insert({ bien_id, acheteur_id: user.id, vendeur_id: bien.owner_id, code_visite, token_confirmation, message })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const lienConfirm = `${APP_URL}/api/vente/confirmer-visite?token=${token_confirmation}&partie=vendeur`
    if (proprio?.phone) {
      await notifDemandeVisite({ telVendeur: proprio.phone, titreBien: bien.titre, codeVisite: code_visite, lienConfirm })
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: bien.owner_id,
      type: 'demande_visite_vente',
      titre: 'Nouvelle demande de visite (vente)',
      corps: `Un acheteur souhaite visiter "${bien.titre}". Code : ${code_visite}`,
      lien: `/mon-espace/ventes/${dvv.id}`,
    })

    return NextResponse.json({ success: true, code_visite, id: dvv.id })
  } catch (err) {
    console.error('[vente/demander-visite]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
