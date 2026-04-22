const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const TOKEN    = process.env.WHATSAPP_API_TOKEN

function normalizePhone(tel: string): string {
  return tel.replace(/\D/g, '').replace(/^00/, '')
}

async function send(to: string, body: string): Promise<void> {
  if (!TOKEN || !PHONE_ID) {
    console.warn('[WhatsApp] Variables manquantes — message non envoyé à', to)
    return
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizePhone(to),
          type: 'text',
          text: { body },
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[WhatsApp] Erreur API:', err)
    }
  } catch (e) {
    console.error('[WhatsApp] Erreur réseau:', e)
  }
}

// ── Courte durée ─────────────────────────────────────────────────────

export async function notifReservationConfirmee(p: { tel: string; titreBien: string; dateArrivee: string; dateDepart: string; montant: string; lien: string }) {
  await send(p.tel, `📅 RÉSERVATION CONFIRMÉE — LOFIA\nBien: ${p.titreBien}\nArrivée: ${p.dateArrivee} | Départ: ${p.dateDepart}\nMontant payé: ${p.montant} FCFA\nDétails: ${p.lien}`)
}

// ── Longue durée ──────────────────────────────────────────────────────

export async function notifMiseEnRelation(p: { telLoc: string; telPro: string; codeVisite: string; adresse: string; lienLoc: string; lienPro: string }) {
  const base = `🏠 MISE EN RELATION — LOFIA\nCode de visite: ${p.codeVisite}\nBien: ${p.adresse}\nValable 7 jours.`
  await send(p.telLoc, `${base}\nConfirmez votre visite ici: ${p.lienLoc}`)
  await send(p.telPro, `${base}\nConfirmez votre visite ici: ${p.lienPro}`)
}

export async function notifContratPret(p: { telLoc: string; telPro: string; lienSignLoc: string; lienSignPro: string; lienPdf: string }) {
  await send(p.telLoc, `✅ CONTRAT PRÊT À SIGNER — LOFIA\nVotre contrat de location est disponible.\nLisez et signez ici: ${p.lienSignLoc}\nPDF: ${p.lienPdf}`)
  await send(p.telPro, `✅ CONTRAT PRÊT À SIGNER — LOFIA\nVotre contrat de location est disponible.\nLisez et signez ici: ${p.lienSignPro}\nPDF: ${p.lienPdf}`)
}

export async function notifContratSigne(p: { telLoc: string; telPro: string; numeroContrat: string; lienPdf: string }) {
  const msg = `🎉 CONTRAT SIGNÉ — LOFIA\nVotre contrat ${p.numeroContrat} est finalisé.\nTéléchargez: ${p.lienPdf}`
  await Promise.all([send(p.telLoc, msg), send(p.telPro, msg)])
}

export async function notifFraisDossier(p: { telPro: string; montant: string; lienPaiement: string }) {
  await send(p.telPro, `💳 FRAIS DE DOSSIER — LOFIA\nVotre contrat est signé.\nEn tant que bailleur, vous devez régler: ${p.montant} FCFA\nPayer ici: ${p.lienPaiement}`)
}

// ── Vente ─────────────────────────────────────────────────────────────

export async function notifDemandeVisite(p: { telVendeur: string; titreBien: string; codeVisite: string; lienConfirm: string }) {
  await send(p.telVendeur, `🏡 DEMANDE DE VISITE — LOFIA\nUn acheteur souhaite visiter: ${p.titreBien}\nCode: ${p.codeVisite}\nConfirmez la visite: ${p.lienConfirm}`)
}

export async function notifNouvelleOffre(p: { telVendeur: string; titreBien: string; montant: string; lien: string }) {
  await send(p.telVendeur, `💰 NOUVELLE OFFRE D'ACHAT — LOFIA\nBien: ${p.titreBien}\nPrix proposé: ${p.montant} FCFA\nRépondre: ${p.lien}`)
}

// ── Sponsoring ────────────────────────────────────────────────────────

export async function notifSponsoringActive(p: { tel: string; titreBien: string; formule: string; dateFin: string; lienStats: string }) {
  await send(p.tel, `⭐ SPONSORING ACTIVÉ — LOFIA\nVotre annonce "${p.titreBien}" est maintenant boostée.\nFormule: ${p.formule.toUpperCase()}\nActive jusqu'au: ${p.dateFin}\nVoir les stats: ${p.lienStats}`)
}

export async function notifSponsoringExpireBientot(p: { tel: string; titreBien: string; lienRenouveler: string }) {
  await send(p.tel, `⚠️ SPONSORING EXPIRE BIENTÔT — LOFIA\nVotre boost pour "${p.titreBien}" expire dans 3 jours.\nRenouveler: ${p.lienRenouveler}`)
}
