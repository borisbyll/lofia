import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token  = searchParams.get('token')
  const partie = searchParams.get('partie')

  if (!token) return NextResponse.redirect(`${APP_URL}/confirmation-visite?error=token_manquant`)

  const field = partie === 'vendeur'
    ? { visite_confirmee_vendeur: true }
    : { visite_confirmee_acheteur: true }

  const { data: dvv, error } = await supabaseAdmin
    .from('demandes_visite_vente')
    .update({ ...field, updated_at: new Date().toISOString() })
    .eq('token_confirmation', token)
    .select().single()

  if (error || !dvv) return NextResponse.redirect(`${APP_URL}/confirmation-visite?error=token_invalide`)

  if (dvv.visite_confirmee_acheteur && dvv.visite_confirmee_vendeur) {
    await supabaseAdmin.from('demandes_visite_vente')
      .update({ statut: 'visite_confirmee', updated_at: new Date().toISOString() })
      .eq('id', dvv.id)

    await supabaseAdmin.from('notifications').insert([
      { user_id: dvv.acheteur_id, type: 'visite_vente_confirmee', titre: 'Visite confirmée !', corps: 'Les deux parties ont confirmé. Vous pouvez maintenant faire une offre.', lien: `/mon-espace/ventes/${dvv.id}` },
      { user_id: dvv.vendeur_id,  type: 'visite_vente_confirmee', titre: 'Visite confirmée !', corps: 'Les deux parties ont confirmé la visite.', lien: `/mon-espace/ventes/${dvv.id}` },
    ])
  }

  return NextResponse.redirect(`${APP_URL}/confirmation-visite?success=true`)
}
