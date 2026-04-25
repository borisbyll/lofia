import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §1.2 — Refus par le propriétaire via token (sans connexion)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const motif = searchParams.get('motif') ?? ''

    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

    const { data: demande } = await supabaseAdmin
      .from('demandes_reservation')
      .select('*, biens(titre)')
      .eq('token_refus', token)
      .single()

    if (!demande) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    if (demande.statut !== 'en_attente') {
      return NextResponse.json({
        error: `Cette demande a déjà été traitée (statut : ${demande.statut})`,
        statut: demande.statut,
      }, { status: 409 })
    }

    const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens as { titre?: string } | null
    const titreBien = (bien as { titre?: string } | null)?.titre ?? 'votre hébergement'

    await supabaseAdmin
      .from('demandes_reservation')
      .update({ statut: 'refusee', motif_refus: motif || 'Le bien n\'est pas disponible à ces dates.' })
      .eq('id', demande.id)

    // Notification locataire
    await supabaseAdmin.from('notifications').insert({
      user_id: demande.locataire_id,
      type: 'demande_refusee',
      titre: 'Demande non retenue',
      corps: `Votre demande pour "${titreBien}" n'a pas pu être confirmée. ${motif ? `Raison : ${motif}` : 'Le bien n\'est pas disponible à ces dates.'}`,
      lien: `/mon-espace/reservations`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[refuser-demande]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST pour refus avec formulaire complet
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, motif } = body

    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

    const { data: demande } = await supabaseAdmin
      .from('demandes_reservation')
      .select('*, biens(titre)')
      .eq('token_refus', token)
      .single()

    if (!demande) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })
    if (demande.statut !== 'en_attente') {
      return NextResponse.json({ error: 'Demande déjà traitée', statut: demande.statut }, { status: 409 })
    }

    const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens as { titre?: string } | null
    const titreBien = (bien as { titre?: string } | null)?.titre ?? 'votre hébergement'

    await supabaseAdmin
      .from('demandes_reservation')
      .update({ statut: 'refusee', motif_refus: motif?.trim() || 'Le bien n\'est pas disponible.' })
      .eq('id', demande.id)

    await supabaseAdmin.from('notifications').insert({
      user_id: demande.locataire_id,
      type: 'demande_refusee',
      titre: 'Demande non retenue',
      corps: `Votre demande pour "${titreBien}" n'a pas pu être confirmée. ${motif ? `Raison : ${motif}` : ''}`,
      lien: `/mon-espace/reservations`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[refuser-demande POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
