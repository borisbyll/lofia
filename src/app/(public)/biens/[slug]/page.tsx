import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import BienDetailClient from './BienDetailClient'
import type { Bien } from '@/types/immobilier'
import { BRAND } from '@/lib/brand'
import { formatPrix } from '@/lib/utils'

// Revalidation ISR toutes les 10 minutes
export const revalidate = 600

interface Props { params: { slug: string } }

// cache() déduplique la requête si generateMetadata + page l'appellent au même rendu
const getBien = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('biens')
    .select('*, proprietaire:profiles!owner_id(id,nom,avatar_url,identite_verifiee,bio,created_at)')
    .eq('slug', slug)
    .eq('statut', 'publie')
    .single()
  return data as Bien | null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bien = await getBien(params.slug)
  if (!bien) return { title: 'Bien non trouvé' }

  const baseUrl = `https://${BRAND.domaine}`
  const url = `${baseUrl}/biens/${bien.slug}`
  const prixFormate = formatPrix(bien.prix)
  const suffix = bien.categorie === 'location'
    ? (bien.type_location === 'courte_duree' ? '/nuit' : '/mois')
    : ''
  const localisation = [bien.quartier, bien.ville].filter(Boolean).join(', ')
  const description = bien.description?.slice(0, 155)
    || `${bien.type_bien} à ${localisation} — ${prixFormate}${suffix}`
  const ogTitle = `${bien.titre} — ${prixFormate}${suffix}`
  const images = bien.photo_principale
    ? [{ url: bien.photo_principale, width: 1200, height: 630, alt: bien.titre }]
    : []

  return {
    title: bien.titre,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: BRAND.name,
      images,
      locale: 'fr_TG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: images.map(i => i.url),
    },
  }
}

export default async function BienDetailPage({ params }: Props) {
  const bien = await getBien(params.slug)
  if (!bien) notFound()

  const supabase = await createClient()

  // Incrémenter les vues (fire-and-forget)
  void supabase.rpc('increment_vues', { p_bien_id: bien.id })

  // Avis + similaires en parallèle
  const [{ data: avis }, { data: similaires }] = await Promise.all([
    supabase
      .from('avis')
      .select('id, note, commentaire, created_at, auteur:profiles!auteur_id(nom,avatar_url)')
      .eq('bien_id', bien.id)
      .eq('type', 'locataire_note_proprio')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('biens')
      .select('id, slug, titre, categorie, type_bien, type_location, prix, prix_type, ville, commune, photos, photo_principale, vues, favoris_count, statut, created_at, owner_id, proprietaire:profiles!owner_id(id,nom,avatar_url,identite_verifiee)')
      .eq('statut', 'publie')
      .eq('categorie', bien.categorie)
      .eq('ville', bien.ville)
      .neq('id', bien.id)
      .limit(4),
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: bien.titre,
    description: bien.description || undefined,
    url: `https://${BRAND.domaine}/biens/${bien.slug}`,
    image: bien.photo_principale || undefined,
    offers: {
      '@type': 'Offer',
      price: bien.prix,
      priceCurrency: 'XOF',
      availability: 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: bien.ville,
      addressCountry: 'TG',
      streetAddress: [bien.quartier, bien.commune].filter(Boolean).join(', ') || undefined,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BienDetailClient bien={bien} avis={(avis || []) as any} similaires={(similaires || []) as unknown as Bien[]} />
    </>
  )
}
