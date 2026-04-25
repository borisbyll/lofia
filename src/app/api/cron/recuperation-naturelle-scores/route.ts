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
    const il_y_a_6_mois = new Date(maintenant.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
    const il_y_a_12_mois = new Date(maintenant.getTime() - 12 * 30 * 24 * 60 * 60 * 1000)

    // Pénalités > 6 mois : réduire de 50%
    const { data: penalites6mois } = await supabaseAdmin
      .from('historique_score_locataire')
      .select('id, locataire_id, variation, score_apres')
      .lt('variation', 0)
      .lt('created_at', il_y_a_6_mois.toISOString())
      .gte('created_at', il_y_a_12_mois.toISOString())
      .in('evenement', [
        'annulation_72h', 'annulation_24_72h', 'annulation_moins_24h', 'no_show'
      ])

    let processed = 0

    if (penalites6mois) {
      for (const p of penalites6mois) {
        const recuperation = Math.abs(Math.round(p.variation * 0.5))
        if (recuperation <= 0) continue

        const { data: score } = await supabaseAdmin
          .from('scores_locataires')
          .select('score')
          .eq('locataire_id', p.locataire_id)
          .single()

        if (!score) continue

        const nouveau_score = Math.min(150, score.score + recuperation)

        await supabaseAdmin
          .from('scores_locataires')
          .update({ score: nouveau_score })
          .eq('locataire_id', p.locataire_id)

        await supabaseAdmin.from('historique_score_locataire').insert({
          locataire_id: p.locataire_id,
          evenement: 'recuperation_naturelle',
          variation: recuperation,
          score_avant: score.score,
          score_apres: nouveau_score,
          notes: 'Récupération naturelle — pénalité > 6 mois (50%)',
        })

        await recalculerNiveau(p.locataire_id)
        processed++
      }
    }

    // Pénalités > 12 mois : effacer (sans récidive récente)
    const { data: penalites12mois } = await supabaseAdmin
      .from('historique_score_locataire')
      .select('id, locataire_id, variation')
      .lt('variation', 0)
      .lt('created_at', il_y_a_12_mois.toISOString())
      .in('evenement', [
        'annulation_72h', 'annulation_24_72h', 'annulation_moins_24h', 'no_show'
      ])

    if (penalites12mois) {
      for (const p of penalites12mois) {
        // Vérifier l'absence de récidive dans les 12 derniers mois
        const { count } = await supabaseAdmin
          .from('historique_score_locataire')
          .select('id', { count: 'exact', head: true })
          .eq('locataire_id', p.locataire_id)
          .lt('variation', 0)
          .gte('created_at', il_y_a_12_mois.toISOString())

        if ((count ?? 0) > 0) continue // récidive récente → pas d'effacement

        const recuperation = Math.abs(p.variation)

        const { data: score } = await supabaseAdmin
          .from('scores_locataires')
          .select('score')
          .eq('locataire_id', p.locataire_id)
          .single()

        if (!score) continue

        const nouveau_score = Math.min(150, score.score + recuperation)

        await supabaseAdmin
          .from('scores_locataires')
          .update({ score: nouveau_score })
          .eq('locataire_id', p.locataire_id)

        await supabaseAdmin.from('historique_score_locataire').insert({
          locataire_id: p.locataire_id,
          evenement: 'recuperation_naturelle',
          variation: recuperation,
          score_avant: score.score,
          score_apres: nouveau_score,
          notes: 'Récupération naturelle — pénalité > 12 mois sans récidive (100%)',
        })

        await recalculerNiveau(p.locataire_id)
        processed++
      }
    }

    return NextResponse.json({ processed })
  } catch (err) {
    console.error('[recuperation-naturelle-scores]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
