import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: resa } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    if (resa.locataire_id !== user.id && resa.proprietaire_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (resa.statut === 'annulee') {
      return NextResponse.json({ error: 'Déjà annulée' }, { status: 400 })
    }

    // Politique remboursement
    const now           = new Date()
    const dateArrivee   = new Date(resa.date_debut)
    const heuresAvant   = (dateArrivee.getTime() - now.getTime()) / (1000 * 60 * 60)
    const tauxRembours  = heuresAvant > 48 ? 1.0 : heuresAvant > 0 ? 0.5 : 0

    await supabaseAdmin.from('reservations').update({
      statut:           'annulee',
      motif_annulation: `Annulé par ${resa.locataire_id === user.id ? 'le locataire' : 'le propriétaire'}`,
      date_annulation:  now.toISOString(),
    }).eq('id', params.id)

    // Libérer les dates
    await supabaseAdmin.from('disponibilites').delete().eq('reservation_id', params.id)

    return NextResponse.json({
      success: true,
      taux_remboursement: tauxRembours,
      montant_rembourse:  Math.round(resa.prix_total * tauxRembours),
    })
  } catch (err) {
    console.error('[reservations/annuler]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
