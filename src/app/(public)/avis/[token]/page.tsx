import { supabaseAdmin } from '@/lib/supabase/admin'
import AvisClient from './AvisClient'

interface Props { params: { token: string } }

// CDC v2 §3.2 — Page de notation accessible sans connexion
// Token = base64url(reservation_id:user_id:type)
export default async function AvisPage({ params }: Props) {
  let reservation_id: string, user_id: string, type: string
  try {
    const decoded = Buffer.from(params.token, 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length < 3) throw new Error()
    ;[reservation_id, user_id, type] = parts
  } catch {
    return <AvisClient avis={null} token={params.token} />
  }

  const { data: resa } = await supabaseAdmin
    .from('reservations')
    .select('id, locataire_id, proprietaire_id, date_debut, date_fin, biens(id, titre, ville, photo_principale, photos)')
    .eq('id', reservation_id)
    .single()

  if (!resa || (resa.locataire_id !== user_id && resa.proprietaire_id !== user_id)) {
    return <AvisClient avis={null} token={params.token} />
  }

  const { data: avisExistant } = await supabaseAdmin
    .from('avis')
    .select('id')
    .eq('reservation_id', reservation_id)
    .eq('auteur_id', user_id)
    .maybeSingle()

  const bien = Array.isArray(resa.biens) ? resa.biens[0] : resa.biens

  const avisData = {
    reservation_id,
    user_id,
    type,
    bien_id: (bien as any)?.id,
    bien_titre: (bien as any)?.titre,
    proprietaire_id: resa.proprietaire_id,
    date_debut: resa.date_debut,
    date_fin: resa.date_fin,
    avis_laisse: !!avisExistant,
    bien: { titre: (bien as any)?.titre, ville: (bien as any)?.ville, photo_principale: (bien as any)?.photo_principale },
  }

  return <AvisClient avis={avisData as any} token={params.token} />
}
