import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifReservationConfirmee, notifContratSigne, notifSponsoringActive } from '@/lib/notifications/whatsapp'
import { formatPrix, formatDate } from '@/lib/utils'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

// ── Vérification en-tête FedaPay (valeur brute dans x-fedapay-signature) ──
function verifierSignature(signature: string | null): boolean {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[Webhook FedaPay] FEDAPAY_WEBHOOK_SECRET non configuré — signature ignorée')
    return true  // Laisser passer si la variable n'est pas encore configurée
  }
  if (!signature) return false
  return signature === secret
}

// ── Handler réservation courte durée ─────────────────────────────────
async function handleReservation(transaction: any) {
  const { reservation_id } = transaction.metadata ?? {}
  if (!reservation_id) return

  const { data: resa } = await supabaseAdmin
    .from('reservations')
    .update({ paiement_effectue: true, fedapay_status: 'approved', paiement_at: new Date().toISOString() })
    .eq('id', reservation_id)
    .select('*, locataire:profiles!reservations_locataire_id_fkey(nom, phone), bien:biens(titre, adresse, quartier, ville)')
    .single()

  if (!resa) return

  // Bloquer les dates dans disponibilites
  await supabaseAdmin.from('disponibilites').insert({
    bien_id:        resa.bien_id,
    date_debut:     resa.date_debut,
    date_fin:       resa.date_fin,
    type:           'reserve',
    reservation_id: resa.id,
  })

  // Notifications
  const bien = resa.bien as any
  const loc  = resa.locataire as any
  if (loc?.phone) {
    await notifReservationConfirmee({
      tel:        loc.phone,
      titreBien:  bien?.titre ?? '',
      dateArrivee: formatDate(resa.date_debut),
      dateDepart:  formatDate(resa.date_fin),
      montant:    formatPrix(resa.prix_total).replace(' FCFA', ''),
      lien:       `${APP_URL}/mon-espace/reservations`,
    })
  }

  // Notifications dashboard
  await supabaseAdmin.from('notifications').insert([
    { user_id: resa.locataire_id,   type: 'paiement_confirme', titre: 'Paiement confirmé', corps: `Votre réservation pour ${bien?.titre ?? 'ce bien'} est confirmée.`, lien: `/mon-espace/reservations` },
    { user_id: resa.proprietaire_id, type: 'nouvelle_reservation', titre: 'Nouvelle réservation', corps: `Vous avez une nouvelle réservation confirmée.`, lien: `/mon-espace/reservations` },
  ])
}

// ── Handler frais dossier longue durée ───────────────────────────────
async function handleFraisDossier(transaction: any) {
  const { contrat_id } = transaction.metadata ?? {}
  if (!contrat_id) return

  const { data: contrat } = await supabaseAdmin
    .from('contrats_location')
    .update({ frais_dossier_paye: true, date_paiement_frais: new Date().toISOString(), statut: 'signe', updated_at: new Date().toISOString() })
    .eq('id', contrat_id)
    .select('*, locataire:profiles!contrats_location_locataire_id_fkey(nom, phone), proprietaire:profiles!contrats_location_proprietaire_id_fkey(nom, phone)')
    .single()

  if (!contrat) return

  const loc = contrat.locataire as any
  const pro = contrat.proprietaire as any

  if (loc?.phone && pro?.phone) {
    await notifContratSigne({
      telLoc:        loc.phone,
      telPro:        pro.phone,
      numeroContrat: contrat.numero_contrat,
      lienPdf:       contrat.pdf_url ?? '',
    })
  }

  await supabaseAdmin.from('notifications').insert([
    { user_id: contrat.locataire_id,   type: 'contrat_signe', titre: 'Contrat finalisé !', corps: `Votre contrat ${contrat.numero_contrat} est signé et archivé.`, lien: `/mon-espace/contrats/${contrat.id}` },
    { user_id: contrat.proprietaire_id, type: 'contrat_signe', titre: 'Contrat finalisé !', corps: `Le contrat est complet. Frais de dossier réglés.`, lien: `/mon-espace/contrats/${contrat.id}` },
  ])
}

// ── Handler sponsoring ───────────────────────────────────────────────
async function handleSponsoring(transaction: any) {
  const { bien_id } = transaction.metadata ?? {}
  const fedapayId   = String(transaction.id)
  if (!bien_id) return

  const { data: sponso } = await supabaseAdmin
    .from('sponsorisations')
    .select('*')
    .eq('fedapay_transaction_id', fedapayId)
    .single()

  if (!sponso) return

  const now     = new Date()
  const scoreMap: Record<string, number> = { boost: 10, premium: 20 }
  const dureeJours: Record<string, number> = { boost: 7, premium: 30 }
  const dateFin = new Date(now.getTime() + (dureeJours[sponso.formule] ?? 30) * 86400000)

  await supabaseAdmin
    .from('sponsorisations')
    .update({ statut: 'actif', date_debut: now.toISOString(), date_fin: dateFin.toISOString(), updated_at: now.toISOString() })
    .eq('id', sponso.id)

  await supabaseAdmin.from('biens').update({
    niveau_sponsoring:      sponso.formule,
    sponsoring_actif_jusqu: dateFin.toISOString(),
    score_tri:              scoreMap[sponso.formule] ?? 0,
    is_featured:            sponso.formule === 'premium',
    updated_at:             now.toISOString(),
  }).eq('id', bien_id)

  const { data: pro } = await supabaseAdmin.from('profiles').select('phone').eq('id', sponso.proprietaire_id).single()
  if ((pro as any)?.phone) {
    const { data: bien } = await supabaseAdmin.from('biens').select('titre').eq('id', bien_id).single()
    await notifSponsoringActive({
      tel:       (pro as any).phone,
      titreBien: (bien as any)?.titre ?? '',
      formule:   sponso.formule,
      dateFin:   formatDate(dateFin.toISOString()),
      lienStats: `${APP_URL}/mon-espace/mes-biens/${bien_id}/sponsoriser`,
    })
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: sponso.proprietaire_id,
    type: 'sponsoring_active',
    titre: 'Sponsoring activé !',
    corps: `Votre annonce est maintenant en formule ${sponso.formule.toUpperCase()}.`,
    lien: `/mon-espace/mes-biens/${bien_id}/sponsoriser`,
  })
}

// ── Handler demande de réservation payée (CDC v2 §1.2) ───────────────
async function handleDemandeReservation(transaction: any) {
  const { demande_id, bien_id, locataire_id, proprietaire_id, date_arrivee, date_depart } = transaction.metadata ?? {}
  if (!demande_id) return

  // Récupérer la demande
  const { data: demande } = await supabaseAdmin
    .from('demandes_reservation')
    .select('*, bien:biens(titre)')
    .eq('id', demande_id)
    .single()

  if (!demande || demande.statut !== 'confirmee') return

  const now = new Date().toISOString()

  // Créer la réservation officielle
  const commission     = Math.round(demande.montant_total * 0.09)
  const montantProprio = demande.montant_total - commission

  const { data: resa, error } = await supabaseAdmin.from('reservations').insert({
    bien_id:          demande.bien_id,
    locataire_id:     demande.locataire_id,
    proprietaire_id:  demande.proprietaire_id,
    date_debut:       demande.date_arrivee,
    date_fin:         demande.date_depart,
    nb_nuits:         demande.nb_nuits,
    prix_nuit:        Math.round(demande.montant_total / demande.nb_nuits),
    prix_total:       demande.montant_total,
    commission,
    montant_proprio:  montantProprio,
    statut:           'confirme',
    paiement_effectue: true,
    fedapay_status:   'approved',
    paiement_at:      now,
  }).select('id').single()

  if (error) { console.error('[webhook/demande] Erreur création réservation', error); return }

  // Marquer demande comme payée
  await supabaseAdmin.from('demandes_reservation')
    .update({ statut: 'payee', updated_at: now })
    .eq('id', demande_id)

  // Bloquer les dates
  await supabaseAdmin.from('disponibilites').insert({
    bien_id:        demande.bien_id,
    date_debut:     demande.date_arrivee,
    date_fin:       demande.date_depart,
    type:           'reserve',
    reservation_id: resa.id,
  })

  const titreBien = (demande.bien as any)?.titre ?? 'ce bien'

  // Notifications
  await supabaseAdmin.from('notifications').insert([
    {
      user_id: demande.locataire_id,
      type: 'paiement_confirme',
      titre: '✅ Paiement confirmé — Réservation validée !',
      corps: `Votre séjour à "${titreBien}" du ${formatDate(demande.date_arrivee)} au ${formatDate(demande.date_depart)} est confirmé. L'adresse exacte vous sera communiquée à l'approche de votre arrivée.`,
      lien: `/mon-espace/reservations`,
    },
    {
      user_id: demande.proprietaire_id,
      type: 'nouvelle_reservation',
      titre: '💰 Paiement reçu — Réservation confirmée',
      corps: `La réservation de "${titreBien}" est confirmée et le paiement de ${formatPrix(montantProprio)} vous sera versé après le séjour.`,
      lien: `/mon-espace/reservations`,
    },
  ])
}

// ── Handler réservation instantanée (CDC v2 §1.3) ────────────────────
async function handleInstantanee(transaction: any) {
  const { bien_id, locataire_id, proprietaire_id, date_arrivee, date_depart } = transaction.metadata ?? {}
  if (!bien_id || !locataire_id) return

  const { data: bien } = await supabaseAdmin.from('biens').select('prix, titre').eq('id', bien_id).single()
  if (!bien) return

  const d1 = new Date(date_arrivee)
  const d2 = new Date(date_depart)
  const nb_nuits = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
  const montant_total  = bien.prix * nb_nuits
  const commission     = Math.round(montant_total * 0.09)
  const montantProprio = montant_total - commission
  const now = new Date().toISOString()

  const { data: resa, error } = await supabaseAdmin.from('reservations').insert({
    bien_id,
    locataire_id,
    proprietaire_id,
    date_debut:       date_arrivee,
    date_fin:         date_depart,
    nb_nuits,
    prix_nuit:        bien.prix,
    prix_total:       montant_total,
    commission,
    montant_proprio:  montantProprio,
    statut:           'confirme',
    paiement_effectue: true,
    fedapay_status:   'approved',
    paiement_at:      now,
  }).select('id').single()

  if (error) { console.error('[webhook/instantanee] Erreur création réservation', error); return }

  await supabaseAdmin.from('disponibilites').insert({
    bien_id, date_debut: date_arrivee, date_fin: date_depart,
    type: 'reserve', reservation_id: resa.id,
  })

  await supabaseAdmin.from('notifications').insert([
    {
      user_id: locataire_id,
      type: 'paiement_confirme',
      titre: '⚡ Réservation instantanée confirmée !',
      corps: `Votre séjour à "${bien.titre}" du ${formatDate(date_arrivee)} au ${formatDate(date_depart)} est confirmé.`,
      lien: `/mon-espace/reservations`,
    },
    {
      user_id: proprietaire_id,
      type: 'nouvelle_reservation',
      titre: '💰 Nouvelle réservation instantanée',
      corps: `Une réservation pour "${bien.titre}" a été confirmée et payée.`,
      lien: `/mon-espace/reservations`,
    },
  ])
}

// ── Handler commission vente ─────────────────────────────────────────
async function handleCommissionVente(transaction: any) {
  const { promesse_id } = transaction.metadata ?? {}
  if (!promesse_id) return
  await supabaseAdmin.from('promesses_vente')
    .update({ commission_payee: true, statut: 'vendu', updated_at: new Date().toISOString() })
    .eq('id', promesse_id)
}

// ── Route principale ─────────────────────────────────────────────────
export async function POST(request: Request) {
  const body      = await request.text()
  const signature = request.headers.get('x-fedapay-signature')

  if (!verifierSignature(signature)) {
    return new NextResponse('Signature invalide', { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return new NextResponse('Corps invalide', { status: 400 })
  }

  if (event.name !== 'transaction.approved') {
    return NextResponse.json({ received: true })
  }

  const transaction     = event.entity ?? event.transaction ?? {}
  const transactionType = transaction.metadata?.type

  try {
    switch (transactionType) {
      case 'reservation_courte_duree':  await handleReservation(transaction);         break
      case 'demande_courte_duree':      await handleDemandeReservation(transaction);  break
      case 'instantanee':               await handleInstantanee(transaction);         break
      case 'frais_dossier_longue_duree': await handleFraisDossier(transaction);      break
      case 'commission_vente':          await handleCommissionVente(transaction);     break
      case 'sponsoring':                await handleSponsoring(transaction);          break
      default:
        console.warn('[Webhook FedaPay] Type inconnu:', transactionType)
    }
  } catch (err) {
    console.error('[Webhook FedaPay] Erreur handler:', transactionType, err)
    // On retourne quand même 200 pour que FedaPay ne réessaie pas indéfiniment
  }

  return NextResponse.json({ received: true })
}
