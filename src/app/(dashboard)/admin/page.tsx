'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, Home, TrendingUp, Flag, Wallet, Lock, ArrowUpRight,
  ArrowRight, Activity, DollarSign
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatPrix, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PlatformStats {
  totalBiens: number
  totalUsers: number
  totalResas: number
  signalements: number
}

interface Finance {
  volumeTotal: number
  commissionPlateforme: number
  partProprios: number
  sequestre: number
}

interface TopBien {
  id: string
  titre: string
  ville: string
  vues: number
  photos: string[]
}

interface RecentResa {
  id: string
  statut: string
  prix_total: number
  created_at: string
  bien: { titre: string } | null
  locataire: { nom: string } | null
}

interface RecentUser {
  id: string
  nom: string
  role: string
  created_at: string
  avatar_url: string | null
}

export default function DashboardAdminPage() {
  const [stats,    setStats]    = useState<PlatformStats | null>(null)
  const [finance,  setFinance]  = useState<Finance | null>(null)
  const [topBiens, setTopBiens] = useState<TopBien[]>([])
  const [resas,    setResas]    = useState<RecentResa[]>([])
  const [users,    setUsers]    = useState<RecentUser[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setLoading(true)
    const [biensRes, usersRes, resaRes, signalRes] = await Promise.all([
      supabase.from('biens').select('id, statut'),
      supabase.from('profiles').select('id'),
      supabase.from('reservations').select('id, statut, prix_total, commission, montant_proprio'),
      supabase.from('signalements').select('id', { count: 'exact' }).eq('traite', false),
    ])

    setStats({
      totalBiens: biensRes.data?.length ?? 0,
      totalUsers: usersRes.data?.length ?? 0,
      totalResas: resaRes.data?.length ?? 0,
      signalements: signalRes.count ?? 0,
    })

    // Finance
    const resaData = resaRes.data ?? []
    const volumeTotal = resaData.reduce((s: number, r: any) => s + (r.prix_total ?? 0), 0)
    const commissionPlateforme = resaData.reduce((s: number, r: any) => s + (r.commission ?? 0), 0)
    const partProprios = resaData.reduce((s: number, r: any) => s + (r.montant_proprio ?? 0), 0)
    const sequestre = resaData
      .filter((r: any) => r.statut === 'confirme' || r.statut === 'en_sejour')
      .reduce((s: number, r: any) => s + (r.montant_proprio ?? 0), 0)
    setFinance({ volumeTotal, commissionPlateforme, partProprios, sequestre })

    // Top biens par vues
    const { data: topData } = await supabase
      .from('biens')
      .select('id, titre, ville, vues, photos')
      .eq('statut', 'publie')
      .order('vues', { ascending: false })
      .limit(5)
    setTopBiens(topData ?? [])

    // Dernières resas
    const { data: resasData } = await supabase
      .from('reservations')
      .select('id, statut, prix_total, created_at, bien:biens!bien_id(titre), locataire:profiles!locataire_id(nom)')
      .order('created_at', { ascending: false })
      .limit(5)
    setResas((resasData as any) ?? [])

    // Derniers inscrits
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, nom, role, created_at, avatar_url')
      .order('created_at', { ascending: false })
      .limit(5)
    setUsers(usersData ?? [])

    setLoading(false)
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Administration</h1>
        <p className="text-gray-500 text-sm mt-0.5">Vue d'ensemble de la plateforme</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Annonces',      value: stats?.totalBiens  ?? 0, icon: Home,    cls: 'bg-blue-50 text-blue-600',   href: '/admin/biens' },
          { label: 'Utilisateurs',  value: stats?.totalUsers  ?? 0, icon: Users,   cls: 'bg-purple-50 text-purple-600', href: '/admin/utilisateurs' },
          { label: 'Réservations',  value: stats?.totalResas  ?? 0, icon: Activity, cls: 'bg-green-50 text-green-600', href: '#' },
          { label: 'Signalements',  value: stats?.signalements ?? 0, icon: Flag,   cls: 'bg-red-50 text-red-600',     href: '/admin/signalements' },
        ].map(s => {
          const Icon = s.icon
          return (
            <Link key={s.label} href={s.href}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.cls)}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-black text-gray-900">{loading ? '—' : s.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Finance plateforme */}
      {!loading && finance && (
        <div className="bg-gradient-to-br from-gray-900 to-primary-900 rounded-2xl p-5 text-white mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} />
            <h2 className="font-bold text-sm">Finance plateforme</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Volume total',          value: finance.volumeTotal,          icon: TrendingUp,    sub: 'Toutes réservations' },
              { label: 'Revenus plateforme',     value: finance.commissionPlateforme, icon: DollarSign,    sub: 'Commission (8%+3%)' },
              { label: 'Part propriétaires',    value: finance.partProprios,         icon: ArrowUpRight,  sub: '97% des locations' },
              { label: 'En séquestre',          value: finance.sequestre,            icon: Lock,          sub: 'Réservations actives' },
            ].map(f => {
              const Icon = f.icon
              return (
                <div key={f.label} className="bg-white/10 rounded-xl p-3">
                  <Icon size={14} className="text-white/60 mb-2" />
                  <p className="text-base font-black leading-tight break-all">{formatPrix(f.value)}</p>
                  <p className="text-xs font-semibold text-white/80 mt-0.5">{f.label}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">{f.sub}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Top annonces */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 text-sm">Top annonces</h2>
            <Link href="/admin/biens" className="text-xs text-primary-500 font-semibold flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="p-3 flex gap-3">
                <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 rounded w-3/4" />
                  <div className="skeleton h-2.5 rounded w-1/2" />
                </div>
              </div>
            )) : topBiens.map((b, i) => (
              <div key={b.id} className="p-3 flex items-center gap-3">
                <span className="text-xs font-black text-gray-300 w-4 text-center flex-shrink-0">#{i+1}</span>
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {b.photos?.[0] && <img src={b.photos[0]} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{b.titre}</p>
                  <p className="text-[10px] text-gray-400">{b.ville} · {b.vues} vues</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dernières réservations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 text-sm">Dernières réservations</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="p-3 space-y-1.5">
                <div className="skeleton h-3 rounded w-3/4" />
                <div className="skeleton h-2.5 rounded w-1/2" />
              </div>
            )) : resas.map(r => (
              <div key={r.id} className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-900 truncate">{(r.locataire as any)?.nom ?? '—'}</p>
                  <span className={cn('badge text-[10px]', {
                    'badge-warning': r.statut === 'en_attente',
                    'badge-success': r.statut === 'confirme' || r.statut === 'termine',
                    'badge-danger': r.statut === 'annule',
                    'badge-primary': r.statut === 'en_sejour',
                  })}>{r.statut}</span>
                </div>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{(r.bien as any)?.titre ?? '—'}</p>
                <p className="text-xs font-bold text-primary-600">{formatPrix(r.prix_total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Derniers inscrits */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 text-sm">Derniers inscrits</h2>
            <Link href="/admin/utilisateurs" className="text-xs text-primary-500 font-semibold flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="p-3 flex gap-3">
                <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 rounded w-1/2" />
                  <div className="skeleton h-2.5 rounded w-1/3" />
                </div>
              </div>
            )) : users.map(u => (
              <div key={u.id} className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    : <span className="text-xs font-bold text-primary-600">{u.nom?.charAt(0) ?? '?'}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{u.nom}</p>
                  <p className="text-[10px] text-gray-400">{u.role} · {formatDate(u.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
