import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import VenteClient from './VenteClient'
import BienCardSkeleton from '@/components/biens/BienCardSkeleton'
import type { Bien } from '@/types/immobilier'

export const revalidate = 300

export const metadata = {
  title: 'Acheter — Terrains, maisons et villas en vente au Togo',
  description: 'Achetez un terrain, une maison, une villa ou un immeuble au Togo. Biens vérifiés par nos modérateurs. Lomé, Kara, Sokodé et toutes les villes du Togo.',
  alternates: { canonical: 'https://lofia.vercel.app/vente' },
  openGraph: {
    title: 'Acheter — Terrains, maisons et villas en vente au Togo',
    description: 'Achetez un terrain, une maison, une villa ou un immeuble au Togo. Biens vérifiés. Lomé et partout au Togo.',
    url: 'https://lofia.vercel.app/vente',
    siteName: 'LOFIA.',
    locale: 'fr_TG',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Acheter un bien immobilier au Togo — LOFIA.',
    description: 'Terrains, maisons, villas et immeubles à vendre au Togo.',
  },
}

export default async function VentePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('biens')
    .select('id,slug,titre,categorie,type_bien,prix,prix_type,ville,commune,quartier,photos,photo_principale,superficie,nb_pieces,nb_chambres,nb_salles_bain,vues,favoris_count,statut,is_featured,owner_id,latitude,longitude,proprietaire:profiles!owner_id(id,nom,avatar_url,identite_verifiee)')
    .eq('statut', 'publie')
    .eq('categorie', 'vente')
    .order('is_featured', { ascending: false })
    .order('publie_at', { ascending: false })
    .limit(80)
  const initialBiens = (data || []) as unknown as Bien[]

  return (
    <Suspense fallback={
      <div className="wrap py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <BienCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <VenteClient initialBiens={initialBiens} />
    </Suspense>
  )
}
