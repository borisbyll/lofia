'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import BienCard from '@/components/biens/BienCard'
import type { Bien } from '@/types/immobilier'

export default function FavorisPage() {
  const { user } = useAuthStore()
  const [biens,   setBiens]   = useState<Bien[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadFavoris()
  }, [user])

  const loadFavoris = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('favoris')
      .select(`
        bien:biens!bien_id(
          id, slug, titre, categorie, type_bien, type_location,
          prix, prix_type, ville, commune, photos,
          vues, favoris_count, statut, created_at,
          proprietaire:profiles!owner_id(id, nom, avatar_url, identite_verifiee),
          avis:avis(note)
        )
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (error) { toast.error('Erreur de chargement'); setLoading(false); return }

    const biensList = (data ?? [])
      .map((f: any) => f.bien)
      .filter(Boolean) as Bien[]
    setBiens(biensList)
    setLoading(false)
  }

  const handleUnfavorite = (id: string) =>
    setBiens(prev => prev.filter(b => b.id !== id))

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Mes favoris</h1>
        <p className="text-sm text-gray-500 mt-0.5">{biens.length} annonce{biens.length > 1 ? 's' : ''} sauvegardée{biens.length > 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton aspect-[4/3] rounded-2xl" />)}
        </div>
      ) : biens.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={48} className="mx-auto mb-4 text-gray-200" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Aucun favori</h2>
          <p className="text-gray-400 text-sm mb-6">Sauvegardez des annonces en cliquant sur le cœur</p>
          <Link href="/vente" className="btn btn-primary">
            Parcourir les annonces
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {biens.map(bien => (
            <BienCard key={bien.id} bien={bien} onUnfavorite={handleUnfavorite} />
          ))}
        </div>
      )}
    </div>
  )
}
