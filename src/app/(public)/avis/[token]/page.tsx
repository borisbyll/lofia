import { supabaseAdmin } from '@/lib/supabase/admin'
import AvisClient from './AvisClient'

interface Props { params: { token: string } }

export default async function AvisPage({ params }: Props) {
  const { data: avis } = await supabaseAdmin
    .from('avis')
    .select('id, bien_id, avis_laisse, token_expire_at, bien:biens(titre, ville, photo_principale)')
    .eq('token_avis', params.token)
    .maybeSingle()

  return <AvisClient avis={avis as any} token={params.token} />
}
