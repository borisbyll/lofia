import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import DossierLDModClient from './DossierLDModClient'

interface Props { params: { id: string } }

export default async function DossierLDModPage({ params }: Props) {
  const { data: dossier } = await supabaseAdmin
    .from('dossiers_longue_duree')
    .select('*, bien:biens(titre,ville,prix,photo_principale,adresse,quartier), locataire:profiles!locataire_id(nom,phone,email), proprietaire:profiles!proprietaire_id(nom,phone), agent:agents(nom,prenom,telephone)')
    .eq('id', params.id)
    .single()

  if (!dossier) redirect('/moderateur')

  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('id, nom, prenom, telephone')
    .eq('actif', true)

  return <DossierLDModClient dossier={dossier as any} agents={(agents ?? []) as any[]} />
}
