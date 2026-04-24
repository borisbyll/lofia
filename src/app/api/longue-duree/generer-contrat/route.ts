import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { genererNumeroContrat } from '@/lib/utils/codes'
import { notifContratPret } from '@/lib/notifications/whatsapp'
import { formatDate } from '@/lib/utils'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { ContratLDPDF } from '@/lib/pdf/ContratLocationLongueDuree'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { mise_en_relation_id, dossier_id, loyer_mensuel, charges_mensuelles = 0, duree_mois, date_debut, depot_garantie, frais_dossier: frais_input, conditions_particulieres } = await request.json()
    const sourceId = mise_en_relation_id ?? dossier_id
    if (!sourceId || !loyer_mensuel || !duree_mois || !date_debut) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    let mer: any = null
    if (mise_en_relation_id) {
      const { data } = await supabaseAdmin
        .from('mises_en_relation')
        .select('*, bien:biens(id, titre, adresse, quartier, ville, type_bien, superficie, equipements), locataire:profiles!mises_en_relation_locataire_id_fkey(id, nom, phone), proprietaire:profiles!mises_en_relation_proprietaire_id_fkey(id, nom, phone)')
        .eq('id', mise_en_relation_id)
        .single()
      mer = data
      if (!mer) return NextResponse.json({ error: 'Mise en relation introuvable' }, { status: 404 })
      if (mer.proprietaire_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    } else {
      const { data } = await supabaseAdmin
        .from('dossiers_longue_duree')
        .select('*, bien:biens(id, titre, adresse, quartier, ville, type_bien, superficie, equipements), locataire:profiles!locataire_id(id, nom, phone), proprietaire:profiles!proprietaire_id(id, nom, phone)')
        .eq('id', dossier_id)
        .single()
      mer = data
      if (!mer) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }

    const bien       = mer.bien as any
    const locataire  = mer.locataire as any
    const proprio    = mer.proprietaire as any
    const finDate    = new Date(date_debut); finDate.setMonth(finDate.getMonth() + duree_mois)
    const frais_dossier   = frais_input ?? Math.round(loyer_mensuel * 0.5)
    const numeroContrat   = genererNumeroContrat()
    const adresse         = [bien.adresse, bien.quartier, bien.ville].filter(Boolean).join(', ')
    const token_loc = crypto.randomUUID()
    const token_pro = crypto.randomUUID()

    // Générer PDF
    const pdfEl = React.createElement(ContratLDPDF, {
      data: {
        numeroContrat, dateContrat: formatDate(new Date().toISOString()),
        nomProprio: proprio.nom ?? '', telProprio: proprio.phone ?? '',
        nomLocataire: locataire.nom ?? '', telLocataire: locataire.phone ?? '',
        adresseBien: adresse, typeBien: bien.type_bien ?? '',
        superficie: bien.superficie, equipements: bien.equipements ?? [],
        loyerMensuel: loyer_mensuel, charges: charges_mensuelles,
        depotGarantie: depot_garantie ?? loyer_mensuel * 2,
        dureeeMois: duree_mois,
        dateDebut: formatDate(date_debut),
        dateFin: formatDate(finDate.toISOString()),
        conditionsParticulieres: conditions_particulieres,
        fraisDossier: frais_dossier,
      }
    }) as any

    const pdfBuffer = Buffer.from(await renderToBuffer(pdfEl))
    const fileName  = `${mer.locataire_id}/${mer.proprietaire_id}/${Date.now()}.pdf`

    const { error: uploadErr } = await supabaseAdmin.storage.from('contrats').upload(fileName, pdfBuffer, { contentType: 'application/pdf' })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('contrats').getPublicUrl(fileName)

    const { data: contrat, error: contratErr } = await supabaseAdmin
      .from('contrats_location')
      .insert({
        ...(mise_en_relation_id ? { mise_en_relation_id } : { dossier_id }),
        bien_id: bien.id, locataire_id: mer.locataire_id, proprietaire_id: mer.proprietaire_id,
        numero_contrat: numeroContrat, loyer_mensuel, charges_mensuelles, duree_mois,
        date_debut, date_fin: finDate.toISOString().split('T')[0],
        depot_garantie: depot_garantie ?? loyer_mensuel * 2,
        conditions_particulieres, frais_dossier,
        token_signature_locataire: token_loc, token_signature_proprietaire: token_pro,
        pdf_url: urlData.publicUrl, statut: 'en_attente_signatures',
      })
      .select().single()

    if (contratErr) return NextResponse.json({ error: contratErr.message }, { status: 500 })

    if (mise_en_relation_id) {
      await supabaseAdmin.from('mises_en_relation').update({ statut: 'contrat_en_cours', updated_at: new Date().toISOString() }).eq('id', mise_en_relation_id)
    } else if (dossier_id) {
      await supabaseAdmin.from('dossiers_longue_duree').update({ statut: 'contrat_en_cours' }).eq('id', dossier_id)
    }

    await notifContratPret({
      telLoc: locataire.phone ?? '', telPro: proprio.phone ?? '',
      lienSignLoc: `${APP_URL}/api/longue-duree/signer?token=${token_loc}`,
      lienSignPro: `${APP_URL}/api/longue-duree/signer?token=${token_pro}`,
      lienPdf: urlData.publicUrl,
    })

    await supabaseAdmin.from('notifications').insert([
      { user_id: mer.locataire_id,   type: 'contrat_a_signer', titre: 'Contrat à signer', corps: `Votre contrat ${numeroContrat} est prêt. Signez-le depuis votre espace.`, lien: `/mon-espace/contrats/${contrat.id}` },
      { user_id: mer.proprietaire_id, type: 'contrat_a_signer', titre: 'Contrat à signer', corps: `Le contrat ${numeroContrat} a été généré et envoyé. Signez-le aussi.`, lien: `/mon-espace/contrats/${contrat.id}` },
    ])

    return NextResponse.json({ success: true, contrat_id: contrat.id, pdf_url: urlData.publicUrl })
  } catch (err) {
    console.error('[longue-duree/generer-contrat]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
