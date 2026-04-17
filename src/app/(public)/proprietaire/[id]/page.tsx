import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient as createServerClient } from '@/lib/supabase/server'
import ProprietaireClient from './ProprietaireClient'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('nom, bio')
    .eq('id', params.id)
    .single()
  if (!data) return { title: 'Propriétaire — LOFIA.' }
  const description = data.bio?.slice(0, 155) || `Consultez les biens publiés par ${data.nom} sur LOFIA., la plateforme immobilière du Togo.`
  return {
    title: `${data.nom} — Propriétaire`,
    description,
    openGraph: {
      title: `${data.nom} — Propriétaire sur LOFIA.`,
      description,
      siteName: 'LOFIA.',
      locale: 'fr_TG',
      type: 'profile',
    },
  }
}

export default async function ProprietairePage({ params }: Props) {
  const supabase = await createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nom, bio, avatar_url, identite_verifiee, is_diaspora, created_at')
    .eq('id', params.id)
    .single()

  if (!profile) notFound()

  const { data: biens } = await supabase
    .from('biens')
    .select(`
      id, slug, titre, categorie, type_bien, type_location,
      prix, prix_type, ville, commune, photos, vues, favoris_count,
      statut, created_at, owner_id,
      proprietaire:profiles!owner_id(id, nom, avatar_url, identite_verifiee),
      avis:avis(note)
    `)
    .eq('owner_id', params.id)
    .eq('statut', 'publie')
    .order('created_at', { ascending: false })

  return <ProprietaireClient profile={profile as any} biens={(biens as any) ?? []} />
}
