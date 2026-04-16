import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import BienDetailClient from './BienDetailClient'
import type { Bien } from '@/types/immobilier'

interface Props { params: { slug: string } }

async function getBien(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('biens')
    .select('*, proprietaire:profiles!owner_id(id,nom,phone,avatar_url,identite_verifiee,bio,created_at)')
    .eq('slug', slug)
    .eq('statut', 'publie')
    .single()
  return data as Bien | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bien = await getBien(params.slug)
  if (!bien) return { title: 'Bien non trouvé' }
  return {
    title: bien.titre,
    description: bien.description?.slice(0, 160) || `${bien.type_bien} à ${bien.ville}`,
    openGraph: {
      title: bien.titre,
      images: bien.photo_principale ? [bien.photo_principale] : [],
    },
  }
}

export default async function BienDetailPage({ params }: Props) {
  const bien = await getBien(params.slug)
  if (!bien) notFound()

  // Incrémenter les vues via RPC (atomic, bypass RLS)
  const supabase = await createClient()
  supabase.rpc('increment_vues', { p_bien_id: bien.id }).then(() => {})

  // Charger avis
  const { data: avis } = await supabase
    .from('avis')
    .select('*, auteur:profiles!auteur_id(nom,avatar_url)')
    .eq('bien_id', bien.id)
    .eq('type', 'locataire_note_proprio')
    .order('created_at', { ascending: false })
    .limit(10)

  // Biens similaires
  const { data: similaires } = await supabase
    .from('biens')
    .select('*, proprietaire:profiles!owner_id(id,nom,avatar_url,identite_verifiee)')
    .eq('statut', 'publie')
    .eq('categorie', bien.categorie)
    .eq('ville', bien.ville)
    .neq('id', bien.id)
    .limit(4)

  return <BienDetailClient bien={bien} avis={avis || []} similaires={similaires as Bien[] || []} />
}
