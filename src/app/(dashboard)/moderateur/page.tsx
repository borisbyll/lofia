'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield, Clock, CheckCircle, XCircle, Eye, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BienAttente {
  id: string
  slug: string
  titre: string
  type_bien: string
  ville: string
  photos: string[]
  created_at: string
  proprietaire: { nom: string } | null
}

interface Stats {
  enAttente: number
  approuves: number
  rejetes: number
  signalements: number
}

export default function DashboardModPage() {
  const { profile } = useAuthStore()
  const [biens,   setBiens]   = useState<BienAttente[]>([])
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setLoading(true)
    const [biensRes, statsRes, signalRes] = await Promise.all([
      supabase
        .from('biens')
        .select('id, slug, titre, type_bien, ville, photos, created_at, proprietaire:profiles!owner_id(nom)')
        .eq('statut', 'en_attente')
        .eq('categorie', 'vente')
        .order('created_at', { ascending: true })
        .limit(10),
      supabase.from('biens').select('statut', { count: 'exact' }).eq('categorie', 'vente'),
      supabase.from('signalements').select('id', { count: 'exact' }).eq('traite', false),
    ])

    setBiens((biensRes.data as any) ?? [])

    const all = statsRes.data ?? []
    setStats({
      enAttente:   all.filter((b: any) => b.statut === 'en_attente').length,
      approuves:   all.filter((b: any) => b.statut === 'publie').length,
      rejetes:     all.filter((b: any) => b.statut === 'rejete').length,
      signalements: signalRes.count ?? 0,
    })
    setLoading(false)
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-primary-500 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Dashboard modérateur</h1>
        </div>
        <p className="text-gray-500 text-sm">Bonjour {profile?.nom} — Gérez les annonces en attente</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'En attente',    value: stats?.enAttente ?? 0,    icon: Clock,        cls: 'bg-amber-50 text-amber-600' },
          { label: 'Approuvées',    value: stats?.approuves ?? 0,    icon: CheckCircle,  cls: 'bg-green-50 text-green-600' },
          { label: 'Rejetées',      value: stats?.rejetes ?? 0,      icon: XCircle,      cls: 'bg-red-50 text-red-600' },
          { label: 'Signalements',  value: stats?.signalements ?? 0, icon: Shield,       cls: 'bg-orange-50 text-orange-600' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.cls)}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-black text-gray-900">{loading ? '—' : s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* File d'attente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <h2 className="font-bold text-gray-900">Annonces en attente de validation</h2>
          <Link href="/moderateur/signalements" className="text-xs text-primary-500 font-semibold flex items-center gap-1 hover:underline">
            Signalements <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : biens.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
            <p className="text-gray-500 font-medium">File vide — tout est traité !</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {biens.map(bien => {
              const propData = bien.proprietaire as any
              return (
                <div key={bien.id} className="p-4 flex items-center gap-4">
                  {/* Photo */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {bien.photos?.[0]
                      ? <img src={bien.photos[0]} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">📷</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate text-sm">{bien.titre}</p>
                    <p className="text-xs text-gray-400">{bien.type_bien} · {bien.ville}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Par {propData?.nom ?? '—'} · Soumis le {formatDate(bien.created_at)}
                    </p>
                  </div>
                  <Link href={`/moderateur/biens/${bien.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-50 text-primary-600 text-xs font-bold hover:bg-primary-100 transition-colors flex-shrink-0">
                    <Eye size={13} />
                    <span className="hidden sm:inline">Examiner</span>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
