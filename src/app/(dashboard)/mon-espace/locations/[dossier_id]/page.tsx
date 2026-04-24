import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import DossierLocationClient from './DossierLocationClient'

interface Props { params: { dossier_id: string } }

export default async function DossierLocationPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/connexion?next=/mon-espace/locations/${params.dossier_id}`)

  const { data: dossier } = await supabaseAdmin
    .from('dossiers_longue_duree')
    .select('*, bien:biens(titre,ville,photo_principale,prix), locataire:profiles!locataire_id(nom,phone), proprietaire:profiles!proprietaire_id(nom,phone), contrat:contrats_location(id,numero_contrat,statut,pdf_url,total_premier_paiement,paiement_effectue)')
    .eq('id', params.dossier_id)
    .single()

  if (!dossier) redirect('/mon-espace/locations')
  if (dossier.locataire_id !== user.id && dossier.proprietaire_id !== user.id) redirect('/mon-espace/locations')

  return <DossierLocationClient dossier={dossier as any} userId={user.id} />
}
