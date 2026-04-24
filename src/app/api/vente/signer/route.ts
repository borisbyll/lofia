import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) return NextResponse.json({ error: 'Token requis' }, { status: 400 })

    const { data: promesse } = await supabaseAdmin
      .from('promesses_vente')
      .select('id, statut, token_acheteur, token_vendeur, acheteur_id, vendeur_id, signe_acheteur_at, signe_vendeur_at, dossier:dossiers_vente(id, bien:biens(titre))')
      .or(`token_acheteur.eq.${token},token_vendeur.eq.${token}`)
      .single()

    if (!promesse) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })

    const isAcheteur = promesse.token_acheteur === token
    const isVendeur = promesse.token_vendeur === token

    if (isAcheteur && promesse.signe_acheteur_at) return NextResponse.json({ error: 'Déjà signé' }, { status: 409 })
    if (isVendeur && promesse.signe_vendeur_at) return NextResponse.json({ error: 'Déjà signé' }, { status: 409 })

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    const now = new Date().toISOString()

    const update: Record<string, string> = {}
    if (isAcheteur) { update.signe_acheteur_at = now; update.ip_acheteur = ip }
    if (isVendeur)  { update.signe_vendeur_at  = now; update.ip_vendeur  = ip }

    const estCompletementSigne = isAcheteur
      ? !!promesse.signe_vendeur_at
      : !!promesse.signe_acheteur_at

    if (estCompletementSigne) update.statut = 'signe'

    const { error } = await supabaseAdmin
      .from('promesses_vente')
      .update(update)
      .eq('id', promesse.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (estCompletementSigne) {
      const dossierId = (promesse.dossier as any)?.id
      if (dossierId) {
        await supabaseAdmin.from('dossiers_vente').update({ statut: 'promesse_signee' }).eq('id', dossierId)
      }
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: promesse.acheteur_id,
          type: 'promesse_signee',
          titre: 'Promesse de vente signée',
          corps: 'Les deux parties ont signé. Procédez au virement bancaire.',
          lien: `/vente/virement/${dossierId}`,
        },
        {
          user_id: promesse.vendeur_id,
          type: 'promesse_signee',
          titre: 'Promesse de vente signée',
          corps: 'Les deux parties ont signé. Attendez le virement de l\'acheteur.',
          lien: `/vente/virement/${dossierId}`,
        },
      ])
    }

    return NextResponse.json({ success: true, signe: true, complet: estCompletementSigne })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
