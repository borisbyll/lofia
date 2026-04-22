import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ReserverClient from './ReserverClient'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await supabase.from('biens').select('titre').eq('slug', params.slug).single()
  return { title: data ? `Réserver — ${data.titre} · LOFIA.` : 'Réserver · LOFIA.' }
}

export default async function ReserverPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()

  const { data: bien } = await supabase
    .from('biens')
    .select('id, titre, prix, type_location, categorie, photo_principale, ville, quartier, adresse, owner_id, proprietaire:profiles!biens_owner_id_fkey(id, nom, identite_verifiee)')
    .eq('slug', params.slug)
    .eq('statut', 'publie')
    .single()

  if (!bien) notFound()
  if (bien.categorie !== 'location' || bien.type_location !== 'courte_duree') {
    redirect(`/biens/${params.slug}`)
  }

  return <ReserverClient bien={bien as any} />
}
