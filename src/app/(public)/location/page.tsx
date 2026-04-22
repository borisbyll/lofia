import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import LocationClient from './LocationClient'
import BienCardSkeleton from '@/components/biens/BienCardSkeleton'
import type { Bien } from '@/types/immobilier'

export const revalidate = 300

export const metadata = {
  title: 'Louer — Maisons, villas et appartements en location au Togo',
  description: 'Louez une maison, villa, appartement ou studio au Togo. Location courte durée (vacances) et longue durée à Lomé et dans tout le Togo. Réservation sécurisée.',
  alternates: { canonical: 'https://lofia.vercel.app/location' },
  openGraph: {
    title: 'Louer — Maisons, villas et appartements en location au Togo',
    description: 'Location courte et longue durée au Togo. Maisons, villas, appartements à Lomé et partout au Togo. Réservation sécurisée.',
    url: 'https://lofia.vercel.app/location',
    siteName: 'LOFIA.',
    locale: 'fr_TG',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Louer un bien au Togo — LOFIA.',
    description: 'Location courte et longue durée au Togo. Réservation en ligne sécurisée.',
  },
}

export default async function LocationPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('biens')
    .select('id,slug,titre,categorie,type_bien,type_location,prix,prix_type,ville,commune,quartier,photos,photo_principale,superficie,nb_salons,nb_chambres,nb_salles_bain,vues,favoris_count,statut,is_featured,owner_id,latitude,longitude,proprietaire:profiles!owner_id(id,nom,avatar_url,identite_verifiee)')
    .eq('statut', 'publie')
    .eq('categorie', 'location')
    .order('score_tri', { ascending: false })
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
      <LocationClient initialBiens={initialBiens} />
    </Suspense>
  )
}
