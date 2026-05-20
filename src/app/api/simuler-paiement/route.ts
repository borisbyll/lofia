import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatPrix, formatDate } from '@/lib/utils'

// Actif uniquement si FedaPay est en sandbox (clé ne commence pas par sk_live)
function isSandbox() {
  const key = process.env.FEDAPAY_SECRET_KEY ?? ''
  return !key.startsWith('sk_live')
}

export async function POST(request: Request) {
  if (!isSandbox()) {
    return NextResponse.json({ error: 'Simulation désactivée en production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { type, demande_id, reservation_id, bien_id, date_arrivee, date_depart } = await request.json()

  try {
    // ── CDC v2 §1.2 — Demande confirmée, locataire paie ─────────────
    if (type === 'demande_courte_duree') {
      if (!demande_id) return NextResponse.json({ error: 'demande_id requis' }, { status: 400 })

      const { data: demande } = await supabaseAdmin
        .from('demandes_reservation')
        .select('*, bien:biens(titre)')
        .eq('id', demande_id)
        .eq('locataire_id', session.user.id)
        .single()

      if (!demande) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
      if (demande.statut !== 'confirmee') return NextResponse.json({ error: `Statut invalide: ${demande.statut}` }, { status: 400 })

      const now = new Date().toISOString()
      const commission     = Math.round(demande.montant_total * 0.09)
      const montantProprio = demande.montant_total - commission

      const { data: resa, error } = await supabaseAdmin.from('reservations').insert({
        bien_id:          demande.bien_id,
        locataire_id:     demande.locataire_id,
        proprietaire_id:  demande.proprietaire_id,
        date_debut:       demande.date_arrivee,
        date_fin:         demande.date_depart,
        prix_nuit:        Math.round(demande.montant_total / demande.nb_nuits),
        prix_total:       demande.montant_total,
        commission,
        montant_proprio:  montantProprio,
        statut:           'confirme',
        paiement_effectue: true,
        fedapay_status:   'approved',
        paiement_at:      now,
      }).select('id').single()

      if (error) throw error

      await supabaseAdmin.from('demandes_reservation')
        .update({ statut: 'payee', updated_at: now })
        .eq('id', demande_id)

      await supabaseAdmin.from('disponibilites').insert({
        bien_id: demande.bien_id, date_debut: demande.date_arrivee, date_fin: demande.date_depart,
        type: 'reserve', reservation_id: resa.id,
      })

      const titreBien = (demande.bien as any)?.titre ?? 'ce bien'
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: demande.locataire_id,
          type: 'paiement_confirme',
          titre: '✅ [SIMULATION] Paiement confirmé — Réservation validée !',
          corps: `Votre séjour à "${titreBien}" du ${formatDate(demande.date_arrivee)} au ${formatDate(demande.date_depart)} est confirmé.`,
          lien: `/mon-espace/reservations`,
        },
        {
          user_id: demande.proprietaire_id,
          type: 'nouvelle_reservation',
          titre: '💰 [SIMULATION] Paiement reçu — Réservation confirmée',
          corps: `La réservation de "${titreBien}" est confirmée. Montant proprio : ${formatPrix(montantProprio)}.`,
          lien: `/mon-espace/reservations`,
        },
      ])

      return NextResponse.json({ success: true, reservation_id: resa.id })
    }

    // ── CDC v2 §1.3 — Réservation instantanée ───────────────────────
    if (type === 'instantanee') {
      if (!bien_id || !date_arrivee || !date_depart) {
        return NextResponse.json({ error: 'bien_id, date_arrivee, date_depart requis' }, { status: 400 })
      }

      const { data: bien } = await supabaseAdmin.from('biens').select('prix, titre, owner_id').eq('id', bien_id).single()
      if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })

      const d1 = new Date(date_arrivee)
      const d2 = new Date(date_depart)
      const nb_nuits       = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
      const montant_total  = bien.prix * nb_nuits
      const commission     = Math.round(montant_total * 0.09)
      const montantProprio = montant_total - commission
      const now = new Date().toISOString()

      const { data: resa, error } = await supabaseAdmin.from('reservations').insert({
        bien_id,
        locataire_id:     session.user.id,
        proprietaire_id:  bien.owner_id,
        date_debut:       date_arrivee,
        date_fin:         date_depart,
        prix_nuit:        bien.prix,
        prix_total:       montant_total,
        commission,
        montant_proprio:  montantProprio,
        statut:           'confirme',
        paiement_effectue: true,
        fedapay_status:   'approved',
        paiement_at:      now,
      }).select('id').single()

      if (error) throw error

      await supabaseAdmin.from('disponibilites').insert({
        bien_id, date_debut: date_arrivee, date_fin: date_depart,
        type: 'reserve', reservation_id: resa.id,
      })

      await supabaseAdmin.from('notifications').insert([
        {
          user_id: session.user.id,
          type: 'paiement_confirme',
          titre: '⚡ [SIMULATION] Réservation instantanée confirmée !',
          corps: `Votre séjour à "${bien.titre}" du ${formatDate(date_arrivee)} au ${formatDate(date_depart)} est confirmé.`,
          lien: `/mon-espace/reservations`,
        },
        {
          user_id: bien.owner_id,
          type: 'nouvelle_reservation',
          titre: '💰 [SIMULATION] Nouvelle réservation instantanée',
          corps: `Une réservation pour "${bien.titre}" a été confirmée. Montant : ${formatPrix(montantProprio)}.`,
          lien: `/mon-espace/reservations`,
        },
      ])

      return NextResponse.json({ success: true, reservation_id: resa.id })
    }

    // ── Ancien flow — réservation déjà créée, marquer payée ─────────
    if (type === 'reservation_courte_duree') {
      if (!reservation_id) return NextResponse.json({ error: 'reservation_id requis' }, { status: 400 })

      const { data: resa } = await supabaseAdmin
        .from('reservations')
        .update({ paiement_effectue: true, fedapay_status: 'approved', paiement_at: new Date().toISOString() })
        .eq('id', reservation_id)
        .eq('locataire_id', session.user.id)
        .select('*, bien:biens(titre)')
        .single()

      if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

      await supabaseAdmin.from('disponibilites').upsert({
        bien_id: resa.bien_id, date_debut: resa.date_debut, date_fin: resa.date_fin,
        type: 'reserve', reservation_id: resa.id,
      }, { ignoreDuplicates: true })

      await supabaseAdmin.from('notifications').insert([
        { user_id: resa.locataire_id, type: 'paiement_confirme', titre: '✅ [SIMULATION] Paiement confirmé', corps: `Votre réservation est validée.`, lien: `/mon-espace/reservations` },
        { user_id: resa.proprietaire_id, type: 'nouvelle_reservation', titre: '💰 [SIMULATION] Nouvelle réservation', corps: `Vous avez une nouvelle réservation confirmée.`, lien: `/mon-espace/reservations` },
      ])

      return NextResponse.json({ success: true, reservation_id: resa.id })
    }

    return NextResponse.json({ error: 'Type inconnu' }, { status: 400 })
  } catch (err: any) {
    console.error('[simuler-paiement]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
