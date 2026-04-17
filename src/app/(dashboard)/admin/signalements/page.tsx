'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flag, CheckCircle, Trash2, Eye, Loader2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Signalement {
  id: string
  raison: string
  detail: string | null
  traite: boolean
  created_at: string
  bien: { id: string; titre: string; slug: string; statut: string; owner_id: string } | null
  user: { nom: string } | null
}

export default function AdminSignalementsPage() {
  const [signalements, setSignalements] = useState<Signalement[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [filter,    setFilter]    = useState<'all' | 'non_traite' | 'traite'>('non_traite')

  useEffect(() => { loadSignalements() }, [])

  const loadSignalements = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('signalements')
      .select(`
        id, raison, detail, traite, created_at,
        bien:biens!bien_id(id, titre, slug, statut, owner_id),
        user:profiles!user_id(nom)
      `)
      .order('created_at', { ascending: false })
    setSignalements((data as any) ?? [])
    setLoading(false)
  }

  const marquerTraite = async (id: string) => {
    setLoadingId(id)
    await supabase.from('signalements').update({ traite: true }).eq('id', id)
    setSignalements(prev => prev.map(s => s.id === id ? { ...s, traite: true } : s))
    toast.success('Signalement traité')
    setLoadingId(null)
  }

  const suspendUser = async (ownerId: string, bienId: string, sigId: string) => {
    if (!confirm('Suspendre ce propriétaire ? Son annonce sera archivée.')) return
    setLoadingId(sigId)
    await Promise.all([
      supabase.from('biens').update({ statut: 'archive' }).eq('id', bienId),
      supabase.from('signalements').update({ traite: true }).eq('id', sigId),
    ])
    toast.success('Propriétaire suspendu et annonce archivée')
    loadSignalements()
    setLoadingId(null)
  }

  const filtered = signalements.filter(s => {
    if (filter === 'non_traite') return !s.traite
    if (filter === 'traite') return s.traite
    return true
  })

  const nonTraites = signalements.filter(s => !s.traite).length

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Signalements</h1>
        {nonTraites > 0 && (
          <p className="text-sm text-red-500 font-semibold mt-0.5">{nonTraites} en attente de traitement</p>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        {([
          { v: 'non_traite' as const, l: 'Non traités', n: nonTraites },
          { v: 'traite'     as const, l: 'Traités',     n: signalements.filter(s => s.traite).length },
          { v: 'all'        as const, l: 'Tous',         n: signalements.length },
        ]).map(t => (
          <button key={t.v} onClick={() => setFilter(t.v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
              filter === t.v ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>
            {t.l}
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full',
              filter === t.v ? 'bg-white/20' : 'bg-gray-200')}>
              {t.n}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Flag size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500">Aucun signalement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const bienData = s.bien as any
            const userData = s.user as any
            return (
              <div key={s.id} className={cn(
                'bg-white rounded-2xl border shadow-sm p-5',
                !s.traite ? 'border-red-200' : 'border-gray-100'
              )}>
                <div className="flex items-start gap-3 mb-3">
                  <Flag size={16} className={!s.traite ? 'text-red-500 flex-shrink-0 mt-0.5' : 'text-gray-300 flex-shrink-0 mt-0.5'} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn('font-bold text-sm', !s.traite ? 'text-red-700' : 'text-gray-500')}>
                        {s.raison}
                      </span>
                      {s.traite
                        ? <span className="badge badge-success text-xs">Traité</span>
                        : <span className="badge badge-danger text-xs">Non traité</span>
                      }
                    </div>
                    <p className="text-xs text-gray-500">
                      Signalé par <strong>{userData?.nom ?? '—'}</strong> le {formatDate(s.created_at)}
                    </p>
                    {bienData && (
                      <p className="text-xs text-gray-600 mt-1">
                        Annonce : <strong>{bienData.titre}</strong>
                        {' · '}
                        <span className={cn('font-medium',
                          bienData.statut === 'publie' ? 'text-green-500' : 'text-red-400')}>
                          {bienData.statut}
                        </span>
                      </p>
                    )}
                    {s.detail && (
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mt-2 border border-gray-100">
                        {s.detail}
                      </p>
                    )}
                  </div>
                </div>

                {!s.traite && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                    {bienData && (
                      <Link href={`/biens/${bienData.slug}`} target="_blank"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors">
                        <Eye size={12} /> Voir annonce
                      </Link>
                    )}
                    <button onClick={() => marquerTraite(s.id)} disabled={loadingId === s.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50">
                      {loadingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Traité
                    </button>
                    {bienData?.statut === 'publie' && (
                      <button onClick={() => suspendUser(bienData.owner_id, bienData.id, s.id)} disabled={loadingId === s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                        {loadingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Suspendre l'annonce
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
