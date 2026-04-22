import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifContratSigne, notifFraisDossier } from '@/lib/notifications/whatsapp'
import { formatPrix } from '@/lib/utils'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function GET(request: Request) {
  const { searchParams, headers } = new URL(request.url) as any
  const token = new URL(request.url).searchParams.get('token')
  const ip    = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'

  if (!token) return NextResponse.redirect(`${APP_URL}/mon-espace/contrats?error=token_manquant`)

  const { data: contrat } = await supabaseAdmin
    .from('contrats_location')
    .select('*, locataire:profiles!contrats_location_locataire_id_fkey(id, nom, phone), proprietaire:profiles!contrats_location_proprietaire_id_fkey(id, nom, phone)')
    .or(`token_signature_locataire.eq.${token},token_signature_proprietaire.eq.${token}`)
    .single()

  if (!contrat) return NextResponse.redirect(`${APP_URL}/mon-espace/contrats?error=token_invalide`)

  const estLocataire = contrat.token_signature_locataire === token
  const now = new Date().toISOString()

  const update = estLocataire
    ? { signe_par_locataire: true, date_signature_locataire: now, ip_signature_locataire: ip }
    : { signe_par_proprietaire: true, date_signature_proprietaire: now, ip_signature_proprietaire: ip }

  const { data: updated } = await supabaseAdmin
    .from('contrats_location')
    .update({ ...update, updated_at: now })
    .eq('id', contrat.id)
    .select()
    .single()

  const locSigne = updated?.signe_par_locataire
  const proSigne = updated?.signe_par_proprietaire

  if (locSigne && proSigne) {
    // Les deux ont signé → attente paiement frais dossier (par le proprio)
    await supabaseAdmin.from('contrats_location').update({ statut: 'en_attente_paiement', updated_at: now }).eq('id', contrat.id)

    const pro = contrat.proprietaire as any
    if (pro?.phone) {
      await notifFraisDossier({
        telPro: pro.phone,
        montant: formatPrix(contrat.frais_dossier).replace(' FCFA', ''),
        lienPaiement: `${APP_URL}/mon-espace/contrats/${contrat.id}/payer-frais`,
      })
    }

    await supabaseAdmin.from('notifications').insert([
      { user_id: contrat.locataire_id,   type: 'contrat_en_attente_paiement', titre: 'Contrat signé', corps: 'Les deux parties ont signé. En attente du règlement des frais de dossier par le bailleur.', lien: `/mon-espace/contrats/${contrat.id}` },
      { user_id: contrat.proprietaire_id, type: 'frais_dossier_a_payer', titre: 'Frais de dossier à régler', corps: `Veuillez régler les frais de dossier (${formatPrix(contrat.frais_dossier)}) pour finaliser le contrat.`, lien: `/mon-espace/contrats/${contrat.id}/payer-frais` },
    ])
  }

  return NextResponse.redirect(`${APP_URL}/mon-espace/contrats/${contrat.id}?signe=true`)
}
