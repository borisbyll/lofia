import { supabaseAdmin } from '@/lib/supabase/admin'

export type EvenementScore =
  | 'reservation_honoree'
  | 'annulation_retractation'
  | 'annulation_avant_confirmation'
  | 'annulation_72h'
  | 'annulation_24_72h'
  | 'annulation_moins_24h'
  | 'no_show'
  | 'force_majeure_validee'
  | 'force_majeure_refusee'
  | 'avis_positif'
  | 'avis_negatif'
  | 'degradation'
  | 'comportement_irrespectueux'
  | 'fausse_declaration_fm'
  | 'recuperation_naturelle'
  | 'bonus_consecutif'

export type NiveauLocataire =
  | 'platine'
  | 'or'
  | 'standard'
  | 'vigilance'
  | 'alerte'
  | 'suspendu'
  | 'banni'

const VARIATIONS: Record<EvenementScore, number> = {
  reservation_honoree: 10,
  annulation_retractation: 0,
  annulation_avant_confirmation: 0,  // CDC: pas de pénalité avant confirmation proprio
  annulation_72h: -5,
  annulation_24_72h: -15,
  annulation_moins_24h: -25,
  no_show: -40,
  force_majeure_validee: 0,
  force_majeure_refusee: 0,
  avis_positif: 5,
  avis_negatif: -10,
  degradation: -30,
  comportement_irrespectueux: -20,   // CDC v2 §5.2
  fausse_declaration_fm: -50,        // CDC v2 §5.2
  recuperation_naturelle: 0,
  bonus_consecutif: 15,
}

const SCORE_MAX = 150
const SCORE_SUSPENSION = 10
const SCORE_BAN = -30

function scoreToNiveau(score: number): NiveauLocataire {
  if (score >= 130) return 'platine'
  if (score >= 100) return 'or'
  if (score >= 70) return 'standard'
  if (score >= 40) return 'vigilance'
  if (score >= 10) return 'alerte'
  return 'suspendu'
}

export async function appliquerEvenementScore(
  locataireId: string,
  evenement: EvenementScore,
  reservationId?: string,
  notes?: string
): Promise<{ nouveau_score: number; nouveau_niveau: NiveauLocataire; suspendu: boolean; banni: boolean }> {
  // Récupérer ou créer le score
  let { data: scoreData } = await supabaseAdmin
    .from('scores_locataires')
    .select('*')
    .eq('locataire_id', locataireId)
    .single()

  if (!scoreData) {
    const { data: created } = await supabaseAdmin
      .from('scores_locataires')
      .insert({ locataire_id: locataireId, score: 100, niveau: 'or' })
      .select()
      .single()
    scoreData = created
  }

  if (!scoreData) throw new Error('Impossible de créer le score locataire')

  const variation = VARIATIONS[evenement]
  const score_avant = scoreData.score
  let score_apres = Math.min(SCORE_MAX, score_avant + variation)

  // Mise à jour des compteurs
  const updates: Record<string, number | boolean | string | null> = {}

  if (evenement === 'reservation_honoree') {
    updates.sejours_honores = (scoreData.sejours_honores ?? 0) + 1
    // Bonus 3 réservations consécutives
    const nouvellesHonor = (scoreData.sejours_honores ?? 0) + 1
    if (nouvellesHonor > 0 && nouvellesHonor % 3 === 0) {
      score_apres = Math.min(SCORE_MAX, score_apres + VARIATIONS.bonus_consecutif)
      await supabaseAdmin.from('historique_score_locataire').insert({
        locataire_id: locataireId,
        evenement: 'bonus_consecutif',
        variation: VARIATIONS.bonus_consecutif,
        score_avant: score_apres - VARIATIONS.bonus_consecutif,
        score_apres,
        reservation_id: reservationId ?? null,
        notes: '3 réservations consécutives honorées',
      })
    }
  } else if (evenement === 'annulation_retractation') {
    updates.reservations_annulees_retractation = (scoreData.reservations_annulees_retractation ?? 0) + 1
  } else if (evenement === 'annulation_72h') {
    updates.reservations_annulees_72h = (scoreData.reservations_annulees_72h ?? 0) + 1
  } else if (evenement === 'annulation_24_72h') {
    updates.reservations_annulees_24_72h = (scoreData.reservations_annulees_24_72h ?? 0) + 1
  } else if (evenement === 'annulation_moins_24h') {
    updates.reservations_annulees_moins_24h = (scoreData.reservations_annulees_moins_24h ?? 0) + 1
  } else if (evenement === 'no_show') {
    updates.no_shows = (scoreData.no_shows ?? 0) + 1
  } else if (evenement === 'force_majeure_validee') {
    updates.force_majeures_validees = (scoreData.force_majeures_validees ?? 0) + 1
  } else if (evenement === 'force_majeure_refusee') {
    updates.force_majeures_refusees = (scoreData.force_majeures_refusees ?? 0) + 1
  }

  // Calcul du niveau et gestion suspension/ban
  let nouveau_niveau = scoreToNiveau(score_apres)
  let suspendu = scoreData.suspendu ?? false
  let banni = scoreData.banni ?? false
  let nombre_suspensions = scoreData.nombre_suspensions ?? 0

  if (score_apres < SCORE_BAN || nombre_suspensions >= 3) {
    banni = true
    nouveau_niveau = 'banni'
    // Récupérer le téléphone pour blacklist
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', locataireId)
      .single()
    if (profile?.phone) updates.telephone_blackliste = profile.phone
    updates.banni = true
  } else if (score_apres < SCORE_SUSPENSION && !scoreData.suspendu) {
    suspendu = true
    nombre_suspensions += 1
    nouveau_niveau = 'suspendu'
    const suspendu_jusqu = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    updates.suspendu = true
    updates.suspendu_jusqu = suspendu_jusqu
    updates.nombre_suspensions = nombre_suspensions
  }

  updates.score = score_apres
  updates.niveau = nouveau_niveau

  // Enregistrer l'historique
  if (variation !== 0) {
    await supabaseAdmin.from('historique_score_locataire').insert({
      locataire_id: locataireId,
      evenement,
      variation,
      score_avant,
      score_apres,
      reservation_id: reservationId ?? null,
      notes: notes ?? null,
    })
  }

  // Mettre à jour le score
  await supabaseAdmin
    .from('scores_locataires')
    .update(updates)
    .eq('locataire_id', locataireId)

  return { nouveau_score: score_apres, nouveau_niveau, suspendu, banni }
}

export async function getOuCreerScore(locataireId: string) {
  const { data } = await supabaseAdmin
    .from('scores_locataires')
    .select('*')
    .eq('locataire_id', locataireId)
    .single()

  if (data) return data

  const { data: created } = await supabaseAdmin
    .from('scores_locataires')
    .insert({ locataire_id: locataireId, score: 100, niveau: 'or' })
    .select()
    .single()

  return created
}

export async function recalculerNiveau(locataireId: string) {
  const { data } = await supabaseAdmin
    .from('scores_locataires')
    .select('score, suspendu, banni')
    .eq('locataire_id', locataireId)
    .single()

  if (!data) return

  const niveau = data.banni ? 'banni'
    : data.suspendu ? 'suspendu'
    : scoreToNiveau(data.score)

  await supabaseAdmin
    .from('scores_locataires')
    .update({ niveau })
    .eq('locataire_id', locataireId)
}
