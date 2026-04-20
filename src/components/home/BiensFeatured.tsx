import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import BienCard from '@/components/biens/BienCard'
import type { Bien } from '@/types/immobilier'

// Cache côté Next.js — partagé avec la revalidation ISR de la page d'accueil
export const revalidate = 300

async function getBiensFeatured() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('biens')
    .select('id,slug,titre,categorie,type_bien,type_location,prix,prix_type,ville,commune,photos,photo_principale,vues,favoris_count,statut,is_featured,publie_at,created_at,owner_id,proprietaire:profiles!owner_id(id,nom,avatar_url,identite_verifiee)')
    .eq('statut', 'publie')
    .order('is_featured', { ascending: false })
    .order('publie_at', { ascending: false })
    .limit(8)
  return (data || []) as unknown as Bien[]
}

export default async function BiensFeatured() {
  const biens = await getBiensFeatured()
  if (biens.length === 0) return null

  return (
    <section className="section" style={{ background: '#FFFDF5' }}>
      <div className="wrap">
        <div className="flex items-end justify-between mb-6 sm:mb-10">
          <div>
            <h2 className="section-title">Annonces récentes</h2>
            <p className="section-subtitle">Découvrez les dernières annonces publiées sur la plateforme.</p>
          </div>
          <Link
            href="/vente"
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-bold transition-all group"
            style={{ color: '#8B1A2E' }}
          >
            Voir tout
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {biens.map((bien, i) => <BienCard key={bien.id} bien={bien} priority={i === 0} />)}
        </div>

        <div className="flex justify-center mt-8 md:hidden">
          <Link href="/vente" className="btn btn-outline">
            Voir toutes les annonces <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  )
}
