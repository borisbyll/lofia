'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Home, Eye, CheckCircle, Clock, XCircle, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { formatPrix, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BienAdmin {
  id: string
  slug: string
  titre: string
  statut: string
  categorie: string
  type_bien: string
  prix: number
  ville: string
  vues: number
  created_at: string
  photos: string[]
  proprietaire: { nom: string } | null
}

const statutConfig: Record<string, { label: string; cls: string; icon: any }> = {
  publie:     { label: 'Publié',     cls: 'badge-success', icon: CheckCircle },
  en_attente: { label: 'En attente', cls: 'badge-warning', icon: Clock },
  rejete:     { label: 'Rejeté',    cls: 'badge-danger',  icon: XCircle },
  brouillon:  { label: 'Brouillon', cls: 'badge',         icon: Home },
  archive:    { label: 'Archivé',   cls: 'badge',         icon: Home },
}

export default function BienAdminPage() {
  const [biens,    setBiens]    = useState<BienAdmin[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => { loadBiens() }, [])

  const loadBiens = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('biens')
      .select('id, slug, titre, statut, categorie, type_bien, prix, ville, vues, created_at, photos, proprietaire:profiles!owner_id(nom)')
      .order('created_at', { ascending: false })
    setBiens((data as any) ?? [])
    setLoading(false)
  }

  const changeStatut = async (id: string, statut: string) => {
    setLoadingId(id)
    const { error } = await supabase.from('biens').update({ statut }).eq('id', id)
    if (error) toast.error('Erreur')
    else {
      toast.success('Statut mis à jour')
      setBiens(prev => prev.map(b => b.id === id ? { ...b, statut } : b))
    }
    setLoadingId(null)
  }

  const deleteBien = async (id: string) => {
    if (!confirm('Supprimer définitivement cette annonce ?')) return
    setLoadingId(id)
    const { error } = await supabase.from('biens').delete().eq('id', id)
    if (error) toast.error('Erreur')
    else {
      toast.success('Annonce supprimée')
      setBiens(prev => prev.filter(b => b.id !== id))
    }
    setLoadingId(null)
  }

  const filtered = biens.filter(b => {
    const matchSearch = !search || b.titre.toLowerCase().includes(search.toLowerCase()) || (b.proprietaire as any)?.nom?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || b.statut === filter
    const matchCat = catFilter === 'all' || b.categorie === catFilter
    return matchSearch && matchFilter && matchCat
  })

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Toutes les annonces</h1>
        <p className="text-sm text-gray-500 mt-0.5">{biens.length} annonces sur la plateforme</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher titre ou propriétaire…"
            className="input-field pl-9 text-sm" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field text-sm w-auto">
          <option value="all">Tous statuts</option>
          <option value="publie">Publiés</option>
          <option value="en_attente">En attente</option>
          <option value="rejete">Rejetés</option>
          <option value="archive">Archivés</option>
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input-field text-sm w-auto">
          <option value="all">Toutes catégories</option>
          <option value="vente">Vente</option>
          <option value="location">Location</option>
        </select>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Home size={36} className="mx-auto mb-2 opacity-20" />
            <p>Aucune annonce trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(b => {
              const sc = statutConfig[b.statut] ?? { label: b.statut, cls: 'badge', icon: Home }
              const Icon = sc.icon
              const propData = b.proprietaire as any
              return (
                <div key={b.id} className="p-4 flex items-center gap-4">
                  {/* Photo */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {b.photos?.[0]
                      ? <img src={b.photos[0]} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Home size={18} className="text-gray-300" /></div>
                    }
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{b.titre}</p>
                      <span className={cn('badge text-xs flex items-center gap-1', sc.cls)}>
                        <Icon size={10} /> {sc.label}
                      </span>
                      <span className="badge text-xs capitalize">{b.categorie}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {b.type_bien} · {b.ville} · {formatPrix(b.prix)} · {b.vues} vues
                    </p>
                    <p className="text-xs text-gray-400">
                      Par <strong>{propData?.nom ?? '—'}</strong> · {formatDate(b.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/biens/${b.slug}`} target="_blank"
                      className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <Eye size={14} className="text-gray-600" />
                    </Link>
                    {b.statut === 'en_attente' && (
                      <Link href={`/moderateur/biens/${b.id}`}
                        className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-600 text-xs font-bold hover:bg-primary-100 transition-colors">
                        Examiner
                      </Link>
                    )}
                    {b.statut === 'publie' && (
                      <button onClick={() => changeStatut(b.id, 'archive')} disabled={loadingId === b.id}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50">
                        Archiver
                      </button>
                    )}
                    <button onClick={() => deleteBien(b.id)} disabled={loadingId === b.id}
                      className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-50">
                      {loadingId === b.id
                        ? <Loader2 size={13} className="animate-spin text-red-500" />
                        : <Trash2 size={13} className="text-red-500" />
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
