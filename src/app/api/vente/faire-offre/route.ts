import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifNouvelleOffre } from '@/lib/notifications/whatsapp'
import { formatPrix } from '@/lib/utils'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { demande_visite_id, prix_propose, message } = await request.json()
    if (!demande_visite_id || !prix_propose) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const { data: dvv } = await supabaseAdmin
      .from('demandes_visite_vente')
      .select('*, bien:biens(titre)')
      .eq('id', demande_visite_id)
      .single()

    if (!dvv) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (dvv.acheteur_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    if (!dvv.visite_confirmee_acheteur || !dvv.visite_confirmee_vendeur) {
      return NextResponse.json({ error: 'La visite doit être confirmée avant de faire une offre' }, { status: 400 })
    }

    const { data: offre, error } = await supabaseAdmin
      .from('offres_achat')
      .insert({
        demande_visite_id,
        bien_id:     dvv.bien_id,
        acheteur_id: user.id,
        vendeur_id:  dvv.vendeur_id,
        prix_propose,
        message_acheteur: message,
        statut: 'en_attente',
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('demandes_visite_vente').update({ statut: 'offre_faite', updated_at: new Date().toISOString() }).eq('id', demande_visite_id)

    const { data: vendeur } = await supabaseAdmin.from('profiles').select('phone').eq('id', dvv.vendeur_id).single()
    if ((vendeur as any)?.phone) {
      await notifNouvelleOffre({
        telVendeur: (vendeur as any).phone,
        titreBien:  (dvv.bien as any)?.titre ?? '',
        montant:    formatPrix(prix_propose).replace(' FCFA', ''),
        lien:       `${APP_URL}/mon-espace/ventes/${demande_visite_id}`,
      })
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: dvv.vendeur_id,
      type: 'nouvelle_offre_achat',
      titre: 'Nouvelle offre d\'achat',
      corps: `Une offre de ${formatPrix(prix_propose)} a été reçue pour votre bien.`,
      lien: `/mon-espace/ventes/${demande_visite_id}`,
    })

    return NextResponse.json({ success: true, offre_id: offre.id })
  } catch (err) {
    console.error('[vente/faire-offre]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
