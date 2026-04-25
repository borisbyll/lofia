import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §1.3 — Mode Niveau 2 "Confirmation instantanée"
// Paiement immédiat → réservation créée → dates bloquées
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { bien_id, date_arrivee, date_depart } = await request.json()
    if (!bien_id || !date_arrivee || !date_depart) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const { data: bien } = await supabaseAdmin
      .from('biens')
      .select('id, titre, owner_id, prix')
      .eq('id', bien_id)
      .eq('statut', 'publie')
      .single()

    if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    if (bien.owner_id === session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas réserver votre propre bien' }, { status: 400 })
    }

    // Vérifier le score locataire (bloquer suspendu/banni)
    const { data: score } = await supabaseAdmin
      .from('scores_locataires')
      .select('suspendu, banni, niveau')
      .eq('locataire_id', session.user.id)
      .maybeSingle()

    if (score?.banni) return NextResponse.json({ error: 'Votre compte est suspendu définitivement.' }, { status: 403 })
    if (score?.suspendu) return NextResponse.json({ error: 'Votre compte est temporairement suspendu.' }, { status: 403 })

    // Vérifier disponibilité
    const { data: conflit } = await supabaseAdmin
      .from('disponibilites')
      .select('id')
      .eq('bien_id', bien_id)
      .or(`and(date_debut.lte.${date_arrivee},date_fin.gte.${date_arrivee}),and(date_debut.lte.${date_depart},date_fin.gte.${date_depart})`)
      .maybeSingle()

    if (conflit) return NextResponse.json({ error: 'Ces dates ne sont plus disponibles.' }, { status: 409 })

    const d1 = new Date(date_arrivee)
    const d2 = new Date(date_depart)
    const nb_nuits = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
    const prix_nuit = bien.prix ?? 0
    const COMMISSION_VOYAGEUR = 0.09
    const montant_total = Math.round(prix_nuit * nb_nuits * (1 + COMMISSION_VOYAGEUR))
    const commission = Math.round(prix_nuit * nb_nuits * COMMISSION_VOYAGEUR)
    const montant_proprio = prix_nuit * nb_nuits - Math.round(prix_nuit * nb_nuits * 0.03)

    // Créer la transaction FedaPay
    const fedapayRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-fedapay-transaction`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          amount: montant_total,
          description: `Réservation instantanée LOFIA — ${bien.titre} (${date_arrivee} → ${date_depart})`,
          customer_email: session.user.email,
          metadata: { type: 'instantanee', bien_id, locataire_id: session.user.id, proprietaire_id: bien.owner_id, date_arrivee, date_depart },
        }),
      }
    )

    if (!fedapayRes.ok) {
      const err = await fedapayRes.json().catch(() => ({}))
      return NextResponse.json({ error: err.error ?? 'Erreur création paiement' }, { status: 502 })
    }

    const { payment_url, transaction_id } = await fedapayRes.json()

    return NextResponse.json({ success: true, payment_url, transaction_id })
  } catch (err) {
    console.error('[creer-instantanee]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
