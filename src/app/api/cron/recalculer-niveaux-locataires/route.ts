import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { recalculerNiveau } from '@/lib/locataires/gestion-score'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const maintenant = new Date()

    // Lever les suspensions expirées
    const { data: suspendus } = await supabaseAdmin
      .from('scores_locataires')
      .select('locataire_id')
      .eq('suspendu', true)
      .lte('suspendu_jusqu', maintenant.toISOString())

    let leves = 0

    if (suspendus) {
      for (const s of suspendus) {
        await supabaseAdmin
          .from('scores_locataires')
          .update({ suspendu: false, score: 30, niveau: 'alerte' })
          .eq('locataire_id', s.locataire_id)

        // Notification réactivation
        await supabaseAdmin.from('notifications').insert({
          user_id: s.locataire_id,
          type: 'suspension_levee',
          titre: 'Compte réactivé',
          corps: 'Votre accès LOFIA a été rétabli. Votre profil repart avec un score de base.',
          lien: '/mon-espace/profil',
        })

        leves++
      }
    }

    // Recalculer tous les niveaux
    const { data: tous } = await supabaseAdmin
      .from('scores_locataires')
      .select('locataire_id')

    let recalcules = 0
    if (tous) {
      for (const s of tous) {
        await recalculerNiveau(s.locataire_id)
        recalcules++
      }
    }

    return NextResponse.json({ leves, recalcules })
  } catch (err) {
    console.error('[recalculer-niveaux]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
