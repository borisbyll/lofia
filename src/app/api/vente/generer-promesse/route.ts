import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { genererNumeroPromesse } from '@/lib/utils/codes'
import { formatDate } from '@/lib/utils'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { PromesseVentePDF } from '@/lib/pdf/PromesseVente'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { offre_id, dossier_id, prix_vente: prix_vente_input, conditions, date_limite_signature } = await request.json()
    if (!offre_id && !dossier_id) return NextResponse.json({ error: 'offre_id ou dossier_id manquant' }, { status: 400 })

    let bien: any, acheteur: any, vendeur: any, prixVente: number, sourceAcheteurId: string, sourceVendeurId: string, sourceBienId: string

    if (offre_id) {
      const { data: offre } = await supabaseAdmin
        .from('offres_achat')
        .select('*, bien:biens(id, titre, adresse, quartier, ville, type_bien, superficie), acheteur:profiles!offres_achat_acheteur_id_fkey(id, nom, phone), vendeur:profiles!offres_achat_vendeur_id_fkey(id, nom, phone)')
        .eq('id', offre_id)
        .single()
      if (!offre) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })
      if (offre.vendeur_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
      if (offre.statut !== 'acceptee') return NextResponse.json({ error: 'L\'offre doit être acceptée' }, { status: 400 })
      bien = offre.bien as any; acheteur = offre.acheteur as any; vendeur = offre.vendeur as any
      prixVente = offre.prix_accepte ?? offre.prix_propose
      sourceAcheteurId = offre.acheteur_id; sourceVendeurId = offre.vendeur_id; sourceBienId = (bien as any).id
    } else {
      const { data: dossier } = await supabaseAdmin
        .from('dossiers_vente')
        .select('*, bien:biens(id, titre, adresse, quartier, ville, type_bien, superficie), acheteur:profiles!acheteur_id(id, nom, phone), vendeur:profiles!vendeur_id(id, nom, phone)')
        .eq('id', dossier_id)
        .single()
      if (!dossier) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
      bien = dossier.bien as any; acheteur = dossier.acheteur as any; vendeur = dossier.vendeur as any
      prixVente = prix_vente_input ?? (bien as any).prix ?? 0
      sourceAcheteurId = dossier.acheteur_id; sourceVendeurId = dossier.vendeur_id; sourceBienId = (bien as any).id
    }

    const adresse  = [bien.adresse, bien.quartier, bien.ville].filter(Boolean).join(', ')
    const numero   = genererNumeroPromesse()
    const token_a  = crypto.randomUUID()
    const token_v  = crypto.randomUUID()

    const pdfEl = React.createElement(PromesseVentePDF, {
      data: {
        numeroPromesse: numero,
        datePromesse:   formatDate(new Date().toISOString()),
        nomVendeur:     vendeur.nom ?? '', telVendeur: vendeur.phone ?? '',
        nomAcheteur:    acheteur.nom ?? '', telAcheteur: acheteur.phone ?? '',
        adresseBien: adresse, typeBien: bien.type_bien ?? '',
        superficie:  bien.superficie,
        prixVente, commissionLofia: 0,
        conditions, dateLimite: date_limite_signature ? formatDate(date_limite_signature) : undefined,
      }
    }) as any

    const pdfBuffer = Buffer.from(await renderToBuffer(pdfEl))
    const fileName  = `${sourceVendeurId}/${sourceAcheteurId}/${Date.now()}.pdf`

    const { error: uploadErr } = await supabaseAdmin.storage.from('contrats').upload(fileName, pdfBuffer, { contentType: 'application/pdf' })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('contrats').getPublicUrl(fileName)

    const { data: promesse, error: pErr } = await supabaseAdmin
      .from('promesses_vente')
      .insert({
        ...(offre_id ? { offre_id } : { dossier_id }),
        bien_id: sourceBienId, acheteur_id: sourceAcheteurId, vendeur_id: sourceVendeurId,
        numero_promesse: numero, prix_vente: prixVente, commission_lofia: 0,
        token_acheteur: token_a, token_vendeur: token_v,
        conditions, date_limite_signature,
        pdf_url: urlData.publicUrl, statut: 'en_attente',
      })
      .select().single()

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

    if (dossier_id) {
      await supabaseAdmin.from('dossiers_vente').update({ statut: 'promesse_en_cours' }).eq('id', dossier_id)
    }

    await supabaseAdmin.from('notifications').insert([
      { user_id: sourceAcheteurId, type: 'promesse_a_signer', titre: 'Promesse de vente à signer', corps: `La promesse ${numero} est prête. Signez-la depuis votre espace.`, lien: `/vente/promesse/${promesse.id}` },
      { user_id: sourceVendeurId,  type: 'promesse_a_signer', titre: 'Promesse de vente à signer', corps: `La promesse ${numero} a été générée. Signez-la aussi.`, lien: `/vente/promesse/${promesse.id}` },
    ])

    return NextResponse.json({ success: true, promesse_id: promesse.id, pdf_url: urlData.publicUrl })
  } catch (err) {
    console.error('[vente/generer-promesse]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
