import { supabaseAdmin } from '@/lib/supabase/admin'

export type TypeDoublon = 'certain' | 'probable' | 'alerte_fraude' | null

export interface ResultatDoublon {
  doublon:           boolean
  type:              TypeDoublon
  bien_existant_id?: string
  message?:          string
}

interface ParamsDoublon {
  adresse:         string
  quartier:        string
  prix:            number
  superficie?:     number
  proprietaire_id: string
}

export async function verifierDoublons(bien: ParamsDoublon): Promise<ResultatDoublon> {
  // CERTAIN : même propriétaire + même adresse
  if (bien.adresse) {
    const { data: certain } = await supabaseAdmin
      .from('biens')
      .select('id')
      .eq('owner_id', bien.proprietaire_id)
      .ilike('adresse', bien.adresse.trim())
      .in('statut', ['publie', 'en_attente'])
      .maybeSingle()

    if (certain) return {
      doublon: true,
      type: 'certain',
      bien_existant_id: certain.id,
      message: 'Vous avez déjà une annonce active pour ce bien.',
    }
  }

  // PROBABLE : même propriétaire + même quartier + même prix + même superficie
  if (bien.quartier && bien.prix) {
    const query = supabaseAdmin
      .from('biens')
      .select('id')
      .eq('owner_id', bien.proprietaire_id)
      .eq('quartier', bien.quartier)
      .eq('prix', bien.prix)
      .in('statut', ['publie', 'en_attente'])

    if (bien.superficie) query.eq('superficie', bien.superficie)

    const { data: probable } = await query.maybeSingle()

    if (probable) return {
      doublon: true,
      type: 'probable',
      bien_existant_id: probable.id,
      message: 'Un bien similaire existe déjà dans votre portefeuille.',
    }
  }

  // ALERTE FRAUDE : même adresse, propriétaire différent → alerter modérateur
  if (bien.adresse) {
    const { data: fraude } = await supabaseAdmin
      .from('biens')
      .select('id, owner_id')
      .ilike('adresse', bien.adresse.trim())
      .neq('owner_id', bien.proprietaire_id)
      .in('statut', ['publie', 'en_attente'])
      .maybeSingle()

    if (fraude) {
      // Alerte silencieuse au modérateur — ne bloque pas la publication
      void supabaseAdmin.from('notifications').insert({
        user_id: null,
        type:    'alerte',
        titre:   '⚠️ Doublon suspect détecté',
        corps:   `Adresse "${bien.adresse}" déjà enregistrée par un autre propriétaire (bien ${fraude.id}).`,
        lien:    `/moderateur/signalements`,
      })
    }
  }

  return { doublon: false, type: null }
}
