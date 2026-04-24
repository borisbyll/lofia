import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AnnoncesVenteClient from './AnnoncesVenteClient'

export default async function AnnoncesVentePage() {
  const supabase = await createClient()
  const { data: biens } = await supabaseAdmin
    .from('biens')
    .select('id, titre, ville, prix, photo_principale, created_at, statut_moderation, motif_rejet, proprietaire:profiles!owner_id(nom, phone)')
    .eq('categorie', 'vente')
    .eq('statut_moderation', 'en_attente_validation')
    .order('created_at', { ascending: true })

  return <AnnoncesVenteClient biens={(biens ?? []) as any[]} />
}
