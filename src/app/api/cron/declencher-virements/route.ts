import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// CDC v2 §3.3 — Virement propriétaire le lendemain du séjour
// Cron quotidien à 8h : détecte réservations avec date_fin = hier, statut=termine, proprio_paye=false
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const hier = new Date()
    hier.setDate(hier.getDate() - 1)
    const dateHier = hier.toISOString().split('T')[0]

    const { data: reservations, error } = await supabaseAdmin
      .from('reservations')
      .select('id, proprietaire_id, montant_proprio, fedapay_transaction_id, biens(titre)')
      .eq('statut', 'termine')
      .eq('proprio_paye', false)
      .lte('date_fin', dateHier)

    if (error) throw error
    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ ok: true, traites: 0 })
    }

    let traites = 0
    let erreurs = 0

    for (const resa of reservations) {
      try {
        // Marquer comme payé (le virement réel FedaPay est manuel en v1)
        const { error: upErr } = await supabaseAdmin
          .from('reservations')
          .update({
            proprio_paye: true,
            proprio_paye_at: new Date().toISOString(),
          })
          .eq('id', resa.id)

        if (upErr) { erreurs++; continue }

        const bien = resa.biens as any
        const montant = resa.montant_proprio ?? 0

        // Notification propriétaire
        await supabaseAdmin.from('notifications').insert({
          user_id: resa.proprietaire_id,
          type: 'virement_effectue',
          titre: '💰 Virement effectué',
          corps: `${montant.toLocaleString('fr-FR')} FCFA ont été virés sur votre compte pour "${bien?.titre ?? 'votre bien'}". Délai de réception : 24-48h selon votre opérateur.`,
          lien: '/mon-espace/reservations',
        })

        traites++
      } catch (e) {
        console.error('[declencher-virements] erreur resa', resa.id, e)
        erreurs++
      }
    }

    return NextResponse.json({ ok: true, traites, erreurs })
  } catch (err) {
    console.error('[cron/declencher-virements]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
