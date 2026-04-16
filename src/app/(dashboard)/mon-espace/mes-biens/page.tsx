'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Plus, Edit2, Trash2, Archive, Eye, Heart,
  MoreVertical, Home, CheckCircle, Clock, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { formatPrix, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BienItem {
  id: string
  slug: string
  titre: string
  statut: string
  categorie: string
  prix: number
  ville: string
  vues: number
  favoris_count: number
  photos: string[]
  created_at: string
}

const statutConfig: Record<string, { label: string; cls: string; icon: any }> = {
  publie:     { label: 'Publié',      cls: 'badge-success', icon: CheckCircle },
  en_attente: { label: 'En attente', cls: 'badge-warning', icon: Clock },
  rejete:     { label: 'Rejeté',     cls: 'badge-danger',  icon: XCircle },
  brouillon:  { label: 'Brouillon',  cls: 'badge',         icon: Edit2 },
  archive:    { label: 'Archivé',    cls: 'badge',         icon: Archive },
}

export default function MesBiensPage() {
  const { user } = useAuthStore()
  const [biens,   setBiens]   = useState<BienItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<string>('all')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadBiens()
  }, [user])

  const loadBiens = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('biens')
      .select('id, slug, titre, statut, categorie, prix, ville, vues, favoris_count, photos, created_at')
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: false })
    if (error) toast.error('Erreur de chargement')
    else setBiens(data ?? [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? biens : biens.filter(b => b.statut === filter)

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from('biens').update({ statut: 'archive' }).eq('id', id)
    if (error) toast.error('Erreur')
    else { toast.success('Annonce archivée'); setBiens(prev => prev.map(b => b.id === id ? { ...b, statut: 'archive' } : b)) }
    setMenuOpen(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer définitivement cette annonce ?')) return
    const { error } = await supabase.from('biens').delete().eq('id', id)
    if (error) toast.error('Erreur lors de la suppression')
    else { toast.success('Annonce supprimée'); setBiens(prev => prev.filter(b => b.id !== id)) }
    setMenuOpen(null)
  }

  const tabs = [
    { v: 'all',        l: 'Toutes',         count: biens.length },
    { v: 'publie',     l: 'Publiées',       count: biens.filter(b => b.statut === 'publie').length },
    { v: 'en_attente', l: 'En attente',     count: biens.filter(b => b.statut === 'en_attente').length },
    { v: 'rejete',     l: 'Rejetées',       count: biens.filter(b => b.statut === 'rejete').length },
    { v: 'archive',    l: 'Archivées',      count: biens.filter(b => b.statut === 'archive').length },
  ].filter(t => t.v === 'all' || t.count > 0)

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mes annonces</h1>
          <p className="text-sm text-gray-500 mt-0.5">{biens.length} annonce{biens.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/mon-espace/publier"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500 text-white text-sm font-bold hover:bg-accent-600 transition-colors shadow-lg shadow-accent-500/30">
          <Plus size={16} />
          <span className="hidden sm:inline">Nouvelle annonce</span>
          <span className="sm:hidden">Ajouter</span>
        </Link>
      </div>

      {/* Tabs filtres */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
        {tabs.map(t => (
          <button key={t.v} onClick={() => setFilter(t.v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0',
              filter === t.v
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>
            {t.l}
            {t.count > 0 && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full',
                filter === t.v ? 'bg-white/20' : 'bg-gray-200')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Home size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium">
            {filter === 'all' ? 'Aucune annonce pour le moment' : `Aucune annonce "${filter}"`}
          </p>
          {filter === 'all' && (
            <Link href="/mon-espace/publier"
              className="mt-4 inline-flex items-center gap-2 btn btn-primary">
              <Plus size={15} />
              Publier ma première annonce
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(bien => {
            const sc = statutConfig[bien.statut] ?? { label: bien.statut, cls: 'badge', icon: Home }
            const Icon = sc.icon
            return (
              <div key={bien.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm flex gap-4 p-4 relative">
                {/* Photo */}
                <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {bien.photos?.[0] ? (
                    <img src={bien.photos[0]} alt={bien.titre}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Home size={28} />
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate text-sm">{bien.titre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{bien.ville} · {formatDate(bien.created_at)}</p>
                    </div>
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setMenuOpen(menuOpen === bien.id ? null : bien.id)}
                        className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                        <MoreVertical size={16} />
                      </button>
                      {menuOpen === bien.id && (
                        <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-gray-100 z-10 w-44 overflow-hidden">
                          <Link href={`/mon-espace/mes-biens/${bien.id}/modifier`}
                            onClick={() => setMenuOpen(null)}
                            className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                            <Edit2 size={14} /> Modifier
                          </Link>
                          <Link href={`/biens/${bien.slug}`}
                            onClick={() => setMenuOpen(null)}
                            className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                            <Eye size={14} /> Voir l'annonce
                          </Link>
                          {bien.statut !== 'archive' && (
                            <button onClick={() => handleArchive(bien.id)}
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                              <Archive size={14} /> Archiver
                            </button>
                          )}
                          <button onClick={() => handleDelete(bien.id)}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="prix text-sm mt-2">
                    {formatPrix(bien.prix)}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className={cn('badge text-xs flex items-center gap-1', sc.cls)}>
                      <Icon size={10} /> {sc.label}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Eye size={11} /> {bien.vues ?? 0}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Heart size={11} /> {bien.favoris_count ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Click outside to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  )
}
