import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token  = searchParams.get('token')
  const partie = searchParams.get('partie')

  if (!token) return NextResponse.redirect(`${APP_URL}/confirmation-signature?error=token_manquant`)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnu'
  const signedAt = new Date().toISOString()

  const field = partie === 'vendeur'
    ? { signature_vendeur: true, ip_signature_vendeur: ip, signed_at_vendeur: signedAt }
    : { signature_acheteur: true, ip_signature_acheteur: ip, signed_at_acheteur: signedAt }

  const tokenField = partie === 'vendeur' ? 'token_signature_vendeur' : 'token_signature_acheteur'

  const { data: promesse, error } = await supabaseAdmin
    .from('promesses_vente')
    .update({ ...field, updated_at: new Date().toISOString() })
    .eq(tokenField, token)
    .select()
    .single()

  if (error || !promesse) return NextResponse.redirect(`${APP_URL}/confirmation-signature?error=token_invalide`)

  if (promesse.signature_acheteur && promesse.signature_vendeur) {
    await supabaseAdmin
      .from('promesses_vente')
      .update({ statut: 'signe', updated_at: new Date().toISOString() })
      .eq('id', promesse.id)

    await supabaseAdmin
      .from('biens')
      .update({ statut: 'archive', updated_at: new Date().toISOString() })
      .eq('id', promesse.bien_id)

    await supabaseAdmin.from('notifications').insert([
      {
        user_id: promesse.acheteur_id,
        type: 'promesse_signee',
        titre: 'Promesse de vente signée !',
        corps: `La promesse ${promesse.numero_promesse} a été signée par les deux parties.`,
        lien: `/mon-espace/ventes/promesse/${promesse.id}`,
      },
      {
        user_id: promesse.vendeur_id,
        type: 'promesse_signee',
        titre: 'Promesse de vente signée !',
        corps: `La promesse ${promesse.numero_promesse} est complète. Les deux parties ont signé.`,
        lien: `/mon-espace/ventes/promesse/${promesse.id}`,
      },
    ])
  }

  return NextResponse.redirect(`${APP_URL}/confirmation-signature?success=true`)
}
