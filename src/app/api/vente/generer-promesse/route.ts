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

    const { offre_id, conditions, date_limite_signature } = await request.json()
    if (!offre_id) return NextResponse.json({ error: 'offre_id manquant' }, { status: 400 })

    const { data: offre } = await supabaseAdmin
      .from('offres_achat')
      .select('*, bien:biens(id, titre, adresse, quartier, ville, type_bien, superficie), acheteur:profiles!offres_achat_acheteur_id_fkey(id, nom, phone), vendeur:profiles!offres_achat_vendeur_id_fkey(id, nom, phone)')
      .eq('id', offre_id)
      .single()

    if (!offre) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })
    if (offre.vendeur_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    if (offre.statut !== 'acceptee') return NextResponse.json({ error: 'L\'offre doit être acceptée' }, { status: 400 })

    const bien    = offre.bien as any
    const acheteur = offre.acheteur as any
    const vendeur  = offre.vendeur as any
    const adresse  = [bien.adresse, bien.quartier, bien.ville].filter(Boolean).join(', ')
    const numero   = genererNumeroPromesse()
    const prixVente = offre.prix_accepte ?? offre.prix_propose
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
    const fileName  = `${offre.vendeur_id}/${offre.acheteur_id}/${Date.now()}.pdf`

    const { error: uploadErr } = await supabaseAdmin.storage.from('contrats').upload(fileName, pdfBuffer, { contentType: 'application/pdf' })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('contrats').getPublicUrl(fileName)

    const { data: promesse, error: pErr } = await supabaseAdmin
      .from('promesses_vente')
      .insert({
        offre_id, bien_id: bien.id, acheteur_id: offre.acheteur_id, vendeur_id: offre.vendeur_id,
        numero_promesse: numero, prix_vente: prixVente, commission_lofia: 0,
        token_signature_acheteur: token_a, token_signature_vendeur: token_v,
        conditions, date_limite_signature,
        pdf_url: urlData.publicUrl, statut: 'en_attente_signatures',
      })
      .select().single()

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

    await supabaseAdmin.from('notifications').insert([
      { user_id: offre.acheteur_id, type: 'promesse_a_signer', titre: 'Promesse de vente à signer', corps: `La promesse ${numero} est prête. Signez-la depuis votre espace.`, lien: `/mon-espace/ventes/promesse/${promesse.id}` },
      { user_id: offre.vendeur_id,  type: 'promesse_a_signer', titre: 'Promesse de vente à signer', corps: `La promesse ${numero} a été générée. Signez-la aussi.`, lien: `/mon-espace/ventes/promesse/${promesse.id}` },
    ])

    return NextResponse.json({ success: true, promesse_id: promesse.id, pdf_url: urlData.publicUrl })
  } catch (err) {
    console.error('[vente/generer-promesse]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
