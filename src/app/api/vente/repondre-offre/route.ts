import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { offre_id, statut, prix_accepte, message } = await request.json()
    if (!offre_id || !statut) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    if (!['acceptee', 'refusee', 'contre_offre'].includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const { data: offre } = await supabaseAdmin.from('offres_achat').select('*').eq('id', offre_id).single()
    if (!offre) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })
    if (offre.vendeur_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    await supabaseAdmin.from('offres_achat').update({
      statut,
      prix_accepte: prix_accepte ?? offre.prix_propose,
      message_vendeur: message,
      updated_at: new Date().toISOString(),
    }).eq('id', offre_id)

    // Si acceptée → générer la promesse automatiquement
    if (statut === 'acceptee') {
      await supabaseAdmin.from('demandes_visite_vente').update({ statut: 'offre_faite', updated_at: new Date().toISOString() }).eq('id', offre.demande_visite_id)
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: offre.acheteur_id,
      type: 'offre_repondue',
      titre: statut === 'acceptee' ? 'Offre acceptée !' : statut === 'refusee' ? 'Offre refusée' : 'Contre-offre reçue',
      corps: statut === 'acceptee'
        ? `Votre offre a été acceptée. La promesse de vente va être générée.`
        : statut === 'contre_offre' && prix_accepte
        ? `Contre-offre à ${prix_accepte.toLocaleString('fr-FR')} FCFA.`
        : 'Votre offre a été refusée.',
      lien: `/mon-espace/ventes/${offre.demande_visite_id}`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[vente/repondre-offre]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
