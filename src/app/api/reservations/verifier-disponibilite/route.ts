import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { bien_id, date_arrivee, date_depart } = await request.json()

    if (!bien_id || !date_arrivee || !date_depart) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    if (new Date(date_depart) <= new Date(date_arrivee)) {
      return NextResponse.json({ error: 'Date de départ invalide' }, { status: 400 })
    }

    // Vérifier chevauchement dans disponibilites (type = reserve ou bloque)
    const { data: conflitsDispo } = await supabaseAdmin
      .from('disponibilites')
      .select('id')
      .eq('bien_id', bien_id)
      .in('type', ['reserve', 'bloque'])
      .lt('date_debut', date_depart)
      .gt('date_fin',   date_arrivee)

    if (conflitsDispo && conflitsDispo.length > 0) {
      return NextResponse.json({ disponible: false })
    }

    // Vérifier aussi les réservations en_attente (paiement non encore confirmé)
    // afin d'éviter le double booking pendant la fenêtre de paiement
    const { data: conflitsResa } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('bien_id', bien_id)
      .not('statut', 'in', '(annulee,expiree)')
      .lt('date_debut', date_depart)
      .gt('date_fin',   date_arrivee)

    if (conflitsResa && conflitsResa.length > 0) {
      return NextResponse.json({ disponible: false })
    }

    // Récupérer le prix nuit du bien
    const { data: bien } = await supabaseAdmin
      .from('biens')
      .select('prix, titre')
      .eq('id', bien_id)
      .single()

    if (!bien) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    const debut    = new Date(date_arrivee)
    const fin      = new Date(date_depart)
    const nbNuits  = Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24))
    const prixNuit = bien.prix
    const total    = prixNuit * nbNuits
    const commission = Math.round(total * 0.09)
    const montantProprio = total - Math.round(total * 0.03)

    return NextResponse.json({
      disponible: true,
      prix_nuit:           prixNuit,
      nb_nuits:            nbNuits,
      montant_total:       total,
      commission_lofia:    commission,
      montant_proprietaire: montantProprio,
    })
  } catch (err) {
    console.error('[verifier-disponibilite]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
