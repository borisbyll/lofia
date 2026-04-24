import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import GenererPromesseModClient from './GenererPromesseModClient'

interface Props { params: { id: string } }

export default async function GenererPromesseModPage({ params }: Props) {
  const { data: dossier } = await supabaseAdmin
    .from('dossiers_vente')
    .select('*, bien:biens(titre,ville,prix,adresse), acheteur:profiles!acheteur_id(nom,phone,email), vendeur:profiles!vendeur_id(nom,phone,email)')
    .eq('id', params.id)
    .single()

  if (!dossier) redirect('/moderateur/dossiers/vente')

  return <GenererPromesseModClient dossier={dossier as any} />
}
