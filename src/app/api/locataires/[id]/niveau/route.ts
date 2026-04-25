import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Accessible par n'importe quel utilisateur authentifié (pour les propriétaires)
    const { data: score } = await supabaseAdmin
      .from('scores_locataires')
      .select('niveau, reservations_honorees, suspendu, banni')
      .eq('locataire_id', params.id)
      .single()

    if (!score) {
      // Locataire sans historique = niveau or par défaut
      return NextResponse.json({ niveau: 'or', reservations_honorees: 0, suspendu: false, banni: false })
    }

    // JAMAIS exposer le score chiffré — uniquement le niveau et les compteurs publics
    return NextResponse.json({
      niveau: score.niveau,
      reservations_honorees: score.reservations_honorees,
      suspendu: score.suspendu,
      banni: score.banni,
    })
  } catch (err) {
    console.error('[locataires/niveau]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
