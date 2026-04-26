import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import DecisionClient from './DecisionClient'

interface Props { params: { token: string } }

export default async function DecisionPage({ params }: Props) {
  const { token } = params

  // Chercher la demande par token de confirmation (proprio confirme)
  // ou token de refus (proprio refuse)
  const { data: demande } = await supabaseAdmin
    .from('demandes_reservation')
    .select(`
      id, statut, date_arrivee, date_depart, nb_nuits, montant_total,
      message_locataire, expire_at, token_confirmation, token_refus,
      bien:biens(id, titre, photos, photo_principale, ville, quartier),
      locataire:profiles!demandes_reservation_locataire_id_fkey(nom, avatar_url)
    `)
    .or(`token_confirmation.eq.${token},token_refus.eq.${token}`)
    .maybeSingle()

  if (!demande) redirect('/404')

  const isConfirmToken = demande.token_confirmation === token

  return <DecisionClient demande={demande as any} token={token} isConfirmToken={isConfirmToken} />
}
