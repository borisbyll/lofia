import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const APP_URL = process.env.APP_URL ?? 'https://lofia.vercel.app'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token  = searchParams.get('token')
  const partie = searchParams.get('partie') // 'locataire' | 'proprietaire'

  if (!token) return NextResponse.redirect(`${APP_URL}/confirmation-visite?error=token_manquant`)

  const field = partie === 'proprietaire'
    ? { visite_confirmee_proprietaire: true }
    : { visite_confirmee_locataire: true }

  const { data: mer, error } = await supabaseAdmin
    .from('mises_en_relation')
    .update({ ...field, updated_at: new Date().toISOString() })
    .eq('token_confirmation', token)
    .select()
    .single()

  if (error || !mer) return NextResponse.redirect(`${APP_URL}/confirmation-visite?error=token_invalide`)

  if (mer.visite_confirmee_locataire && mer.visite_confirmee_proprietaire) {
    await supabaseAdmin.from('mises_en_relation').update({
      statut: 'visite_confirmee',
      date_visite_confirmee: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', mer.id)

    // Notifier les deux parties
    await supabaseAdmin.from('notifications').insert([
      { user_id: mer.locataire_id,   type: 'visite_confirmee', titre: 'Visite confirmée !', corps: 'Les deux parties ont confirmé la visite. Le propriétaire va préparer le contrat.', lien: `/mon-espace/mises-en-relation/${mer.id}` },
      { user_id: mer.proprietaire_id, type: 'visite_confirmee', titre: 'Visite confirmée !', corps: 'Les deux parties ont confirmé la visite. Vous pouvez maintenant générer le contrat.', lien: `/mon-espace/mises-en-relation/${mer.id}` },
    ])
  }

  return NextResponse.redirect(`${APP_URL}/confirmation-visite?success=true&id=${mer.id}`)
}
