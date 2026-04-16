'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flag, CheckCircle, Eye, User, Loader2 } from 'lucide-react'
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
  bien: { id: string; titre: string; slug: string; statut: string } | null
  user: { nom: string } | null
}

export default function SignalementsModPage() {
  const [signalements, setSignalements] = useState<Signalement[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'non_traite' | 'traite' | 'all'>('non_traite')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => { loadSignalements() }, [])

  const loadSignalements = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('signalements')
      .select(`
        id, raison, detail, traite, created_at,
        bien:biens!bien_id(id, titre, slug, statut),
        user:profiles!user_id(nom)
      `)
      .order('created_at', { ascending: false })
    setSignalements((data as any) ?? [])
    setLoading(false)
  }

  const marquerTraite = async (id: string) => {
    setLoadingId(id)
    const { error } = await supabase.from('signalements').update({ traite: true }).eq('id', id)
    if (error) toast.error('Erreur')
    else {
      toast.success('Signalement marqué comme traité')
      setSignalements(prev => prev.map(s => s.id === id ? { ...s, traite: true } : s))
    }
    setLoadingId(null)
  }

  const suspendBien = async (bienId: string, sigId: string) => {
    setLoadingId(sigId)
    const { error } = await supabase.from('biens').update({ statut: 'archive' }).eq('id', bienId)
    if (error) toast.error('Erreur lors de la suspension')
    else {
      await supabase.from('signalements').update({ traite: true }).eq('id', sigId)
      toast.success('Annonce suspendue')
      loadSignalements()
    }
    setLoadingId(null)
  }

  const filtered = signalements.filter(s => {
    if (filter === 'non_traite') return !s.traite
    if (filter === 'traite') return s.traite
    return true
  })

  const nonTraites = signalements.filter(s => !s.traite).length

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Signalements</h1>
        {nonTraites > 0 && (
          <p className="text-sm text-red-500 font-semibold mt-0.5">
            {nonTraites} signalement{nonTraites > 1 ? 's' : ''} non traité{nonTraites > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-5">
        {([
          { v: 'non_traite', l: 'Non traités', n: nonTraites },
          { v: 'traite',     l: 'Traités',     n: signalements.filter(s => s.traite).length },
          { v: 'all',        l: 'Tous',         n: signalements.length },
        ] as const).map(t => (
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

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Flag size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500">Aucun signalement {filter === 'non_traite' ? 'en attente' : ''}</p>
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Motif */}
                    <div className="flex items-center gap-2 mb-2">
                      <Flag size={14} className={s.traite ? 'text-gray-400' : 'text-red-500'} />
                      <span className={cn('text-sm font-bold', s.traite ? 'text-gray-500' : 'text-red-700')}>
                        {s.raison}
                      </span>
                      {s.traite
                        ? <span className="badge badge-success text-xs">Traité</span>
                        : <span className="badge badge-danger text-xs">Non traité</span>
                      }
                    </div>

                    {/* Bien */}
                    {bienData && (
                      <div className="text-xs text-gray-600 mb-1">
                        Annonce : <span className="font-semibold">{bienData.titre}</span>
                        {' · '}
                        <span className={cn('font-medium',
                          bienData.statut === 'archive' ? 'text-red-500' : 'text-green-500')}>
                          {bienData.statut}
                        </span>
                      </div>
                    )}

                    {/* Signaleur */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                      <User size={11} />
                      Signalé par <strong>{userData?.nom ?? '—'}</strong> · {formatDate(s.created_at)}
                    </div>

                    {/* Détail */}
                    {s.detail && (
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        {s.detail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!s.traite && (
                  <div className="flex gap-2 mt-4">
                    {bienData && (
                      <Link href={`/moderateur/biens/${bienData.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors">
                        <Eye size={13} /> Voir l'annonce
                      </Link>
                    )}
                    <button onClick={() => marquerTraite(s.id)} disabled={loadingId === s.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50">
                      {loadingId === s.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      Marquer traité
                    </button>
                    {bienData && bienData.statut === 'publie' && (
                      <button onClick={() => suspendBien(bienData.id, s.id)} disabled={loadingId === s.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                        {loadingId === s.id ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
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
