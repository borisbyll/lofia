'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Home, Eye, Heart, CalendarCheck, Plus,
  ArrowRight, Lock, TrendingUp, CheckCircle, ArrowUpRight,
  Wallet, MessageSquare, Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useDashboardMode } from '@/store/dashboardModeStore'
import { formatPrix, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

/* ── Types ───────────────────────────────────────────────────── */
interface StatsProprietaire {
  annonces: number
  vues: number
  reservations: number
  revenus: number   // FCFA
}

interface StatsLocataire {
  reservations: number
  enCours: number
  favoris: number
  messages: number
}

interface AnnonceRecente {
  id: string
  titre: string
  statut: 'publie' | 'en_attente' | 'rejete' | 'brouillon' | 'archive'
  prix: number
  categorie: string
  vues: number
}

interface ReservationLocataire {
  id: string
  statut: string
  date_debut: string
  date_fin: string
  prix_total: number
  bien: { titre: string; ville?: string } | null
}

interface ReservationProprietaire {
  id: string
  statut: string
  date_debut: string
  date_fin: string
  prix_total: number
  locataire: { nom: string } | null
  bien: { titre: string } | null
}

/* ── Helpers ─────────────────────────────────────────────────── */
const STATUT_BADGE: Record<string, { label: string; cls: string }> = {
  publie:     { label: 'Publié',      cls: 'badge-success' },
  en_attente: { label: 'En attente',  cls: 'badge-en-attente' },
  rejete:     { label: 'Rejeté',      cls: 'badge-danger' },
  brouillon:  { label: 'Brouillon',   cls: 'badge-gray' },
  archive:    { label: 'Archivé',     cls: 'badge-gray' },
}

const RESA_BADGE: Record<string, { label: string; cls: string }> = {
  en_attente: { label: 'En attente',   cls: 'badge-en-attente' },
  confirme:   { label: 'Confirmée',    cls: 'badge-success' },
  en_sejour:  { label: 'En séjour',    cls: 'badge-primary' },
  termine:    { label: 'Terminée',     cls: 'badge-gray' },
  annule:     { label: 'Annulée',      cls: 'badge-danger' },
}

function nuits(debut: string, fin: string) {
  const d = Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 86400000)
  return d > 0 ? `${d} nuit${d > 1 ? 's' : ''}` : ''
}

/* ── Composant principal ─────────────────────────────────────── */
export default function DashboardPage() {
  const { user, profile } = useAuthStore()
  const { mode }          = useDashboardMode()

  const [statsP,   setStatsP]   = useState<StatsProprietaire | null>(null)
  const [statsL,   setStatsL]   = useState<StatsLocataire | null>(null)
  const [annonces, setAnnonces] = useState<AnnonceRecente[]>([])
  const [resasProp, setResasProp] = useState<ReservationProprietaire[]>([])
  const [resasLoc,  setResasLoc]  = useState<ReservationLocataire[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  const loadAll = async () => {
    setLoading(true)
    const uid = user!.id

    const [biensRes, favRes, resaPropRes, resaLocRes, msgRes] = await Promise.all([
      supabase.from('biens').select('id, titre, statut, prix, categorie, vues').eq('owner_id', uid).order('created_at', { ascending: false }).limit(5),
      supabase.from('favoris').select('id', { count: 'exact' }).eq('user_id', uid),
      supabase.from('reservations').select('id, statut, date_debut, date_fin, prix_total, montant_proprio, locataire:profiles!locataire_id(nom), bien:biens!bien_id(titre)').eq('proprietaire_id', uid).order('created_at', { ascending: false }),
      supabase.from('reservations').select('id, statut, date_debut, date_fin, prix_total, bien:biens!bien_id(titre, ville)').eq('locataire_id', uid).order('created_at', { ascending: false }).limit(10),
      supabase.from('messages_contact').select('id', { count: 'exact' }).eq('owner_id', uid).eq('lu', false),
    ])

    const allBiens = biensRes.data ?? []
    const totalVues = allBiens.reduce((s, b) => s + (b.vues ?? 0), 0)
    const propResas = (resaPropRes.data ?? []) as unknown as ReservationProprietaire[]
    const revenus = propResas.filter(r => r.statut === 'termine').reduce((s: number, r: any) => s + (r.montant_proprio ?? 0), 0)

    setStatsP({
      annonces:     allBiens.length,
      vues:         totalVues,
      reservations: propResas.length,
      revenus,
    })

    const locResas = (resaLocRes.data ?? []) as unknown as ReservationLocataire[]
    setStatsL({
      reservations: locResas.length,
      enCours:      locResas.filter(r => r.statut === 'en_sejour' || r.statut === 'confirme').length,
      favoris:      favRes.count ?? 0,
      messages:     msgRes.count ?? 0,
    })

    setAnnonces(allBiens as AnnonceRecente[])
    setResasProp(propResas.slice(0, 5))
    setResasLoc(locResas.slice(0, 5))
    setLoading(false)
  }

  const heure = new Date().getHours()
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'
  const prenom = profile?.nom?.split(' ')[0] ?? 'vous'

  /* ── Skeleton ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-5 pb-24 lg:pb-8">
      <div className="skeleton h-10 w-64 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-40 rounded-2xl" />
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    </div>
  )

  /* ════════════════════════════════════════════════════════════
     MODE PROPRIÉTAIRE
  ════════════════════════════════════════════════════════════ */
  if (mode === 'proprietaire') return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24 lg:pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black" style={{ color: '#1a0a00' }}>
              {salut}, {prenom}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-500 text-white whitespace-nowrap">
              Propriétaire
            </span>
          </div>
          <p className="text-sm" style={{ color: '#7a5c3a' }}>
            Résumé de votre activité
          </p>
        </div>
        <Link href="/mon-espace/publier"
          className="hidden sm:flex btn btn-primary gap-2 text-sm flex-shrink-0">
          <Plus size={15} /> Publier un bien
        </Link>
      </div>

      {/* ── Stats 4 blocs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Annonces',    value: statsP?.annonces ?? 0,     icon: Home,         bg: 'bg-primary-50',  txt: 'text-primary-600' },
          { label: 'Vues',        value: statsP?.vues ?? 0,         icon: Eye,          bg: 'bg-accent-50',   txt: 'text-accent-700' },
          { label: 'Rés.',        value: statsP?.reservations ?? 0, icon: CalendarCheck, bg: 'bg-green-50',   txt: 'text-green-700' },
          { label: 'Revenus FCFA',value: statsP?.revenus ?? 0,      icon: Wallet,       bg: 'bg-primary-50',  txt: 'text-primary-600', money: true },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-primary-50 shadow-sm">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg, s.txt)}>
                <Icon size={18} />
              </div>
              <p className="text-xl font-black" style={{ color: '#1a0a00' }}>
                {s.money ? (s.value > 0 ? `${(s.value/1000).toFixed(0)}k` : '0') : s.value.toLocaleString()}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#7a5c3a' }}>{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* ── Mes annonces ── */}
      <div className="bg-white rounded-2xl border border-primary-50 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-50">
          <h2 className="font-bold text-base" style={{ color: '#1a0a00' }}>Mes annonces</h2>
          <Link href="/mon-espace/mes-biens"
            className="text-xs font-semibold flex items-center gap-1 hover:underline"
            style={{ color: '#8B1A2E' }}>
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>

        {annonces.length === 0 ? (
          <div className="p-10 text-center">
            <Home size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#8B1A2E' }} />
            <p className="text-sm mb-3" style={{ color: '#7a5c3a' }}>Aucune annonce publiée</p>
            <Link href="/mon-espace/publier"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-500 hover:underline">
              <Plus size={13} /> Publier ma première annonce
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-primary-50">
            {annonces.map(a => {
              const badge = STATUT_BADGE[a.statut] ?? { label: a.statut, cls: 'badge-gray' }
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                  {/* Titre + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1a0a00' }}>{a.titre}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={cn('badge text-[10px]', a.categorie === 'vente' ? 'badge-vente' : 'badge-longue')}>
                        {a.categorie === 'vente' ? 'Vente' : 'Location'}
                      </span>
                      <span className={cn('badge text-[10px]', badge.cls)}>{badge.label}</span>
                      <span className="text-[11px] font-bold" style={{ color: '#8B1A2E' }}>{formatPrix(a.prix)}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/biens/${a.id}`}
                      className="text-xs text-brun-doux hover:text-primary-500 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
                      Voir
                    </Link>
                    <Link href={`/mon-espace/mes-biens/${a.id}/modifier`}
                      className="text-xs text-brun-doux hover:text-primary-500 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
                      Modifier
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Réservations reçues ── */}
      <div className="bg-white rounded-2xl border border-primary-50 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-50">
          <h2 className="font-bold text-base" style={{ color: '#1a0a00' }}>
            Réservations reçues
            {statsP && statsP.reservations > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-500 text-white">
                {statsP.reservations}
              </span>
            )}
          </h2>
          <Link href="/mon-espace/reservations"
            className="text-xs font-semibold flex items-center gap-1 hover:underline"
            style={{ color: '#8B1A2E' }}>
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>
        {resasProp.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarCheck size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#8B1A2E' }} />
            <p className="text-sm" style={{ color: '#7a5c3a' }}>Aucune réservation pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-primary-50">
            {resasProp.map(r => {
              const badge = RESA_BADGE[r.statut] ?? { label: r.statut, cls: 'badge-gray' }
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1a0a00' }}>
                      {(r.bien as any)?.titre ?? '—'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={cn('badge text-[10px]', badge.cls)}>{badge.label}</span>
                      <span className="text-xs" style={{ color: '#7a5c3a' }}>
                        {(r.locataire as any)?.nom ?? 'Locataire'} · {formatDate(r.date_debut)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-black shrink-0" style={{ color: '#8B1A2E' }}>
                    {formatPrix(r.prix_total)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Aperçu espace locataire ── */}
      {resasLoc.length > 0 && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50/40 px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#8B1A2E' }}>
              Mon espace locataire
            </p>
            <p className="text-sm truncate" style={{ color: '#1a0a00' }}>
              {(resasLoc[0].bien as any)?.titre ?? '—'} ·{' '}
              {formatDate(resasLoc[0].date_debut)} – {formatDate(resasLoc[0].date_fin)}
            </p>
          </div>
          <button
            onClick={() => useDashboardMode.getState().setMode('locataire')}
            className="shrink-0 text-xs font-bold text-primary-500 hover:underline flex items-center gap-1">
            Voir <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  )

  /* ════════════════════════════════════════════════════════════
     MODE LOCATAIRE
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24 lg:pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black" style={{ color: '#1a0a00' }}>
              {salut}, {prenom}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
              style={{ background: '#2D6A4F', color: '#fff' }}>
              Locataire
            </span>
          </div>
          <p className="text-sm" style={{ color: '#7a5c3a' }}>Vos réservations et activités</p>
        </div>
        <Link href="/vente"
          className="hidden sm:flex btn btn-outline gap-2 text-sm flex-shrink-0">
          Chercher un bien
        </Link>
      </div>

      {/* ── Stats 4 blocs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Réservations',  value: statsL?.reservations ?? 0, icon: CalendarCheck, bg: 'bg-primary-50',  txt: 'text-primary-600' },
          { label: 'En cours',      value: statsL?.enCours ?? 0,      icon: CheckCircle,   bg: 'bg-green-50',    txt: 'text-green-700' },
          { label: 'Favoris',       value: statsL?.favoris ?? 0,      icon: Heart,         bg: 'bg-accent-50',   txt: 'text-accent-700' },
          { label: 'Messages',      value: statsL?.messages ?? 0,     icon: MessageSquare, bg: 'bg-primary-50',  txt: 'text-primary-600' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-primary-50 shadow-sm">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg, s.txt)}>
                <Icon size={18} />
              </div>
              <p className="text-xl font-black" style={{ color: '#1a0a00' }}>
                {s.value.toLocaleString()}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#7a5c3a' }}>{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* ── Réservations ── */}
      <div className="bg-white rounded-2xl border border-primary-50 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-50">
          <h2 className="font-bold text-base" style={{ color: '#1a0a00' }}>Réservations</h2>
          <Link href="/mon-espace/reservations"
            className="text-xs font-semibold flex items-center gap-1 hover:underline"
            style={{ color: '#8B1A2E' }}>
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>

        {resasLoc.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarCheck size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#8B1A2E' }} />
            <p className="text-sm mb-3" style={{ color: '#7a5c3a' }}>Aucune réservation</p>
            <Link href="/location" className="text-xs font-bold text-primary-500 hover:underline">
              Explorer les locations →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-primary-50">
            {resasLoc.map(r => {
              const badge = RESA_BADGE[r.statut] ?? { label: r.statut, cls: 'badge-gray' }
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1a0a00' }}>
                      {(r.bien as any)?.titre ?? '—'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={cn('badge text-[10px]', badge.cls)}>{badge.label}</span>
                      <span className="text-xs" style={{ color: '#7a5c3a' }}>
                        {formatDate(r.date_debut)} – {formatDate(r.date_fin)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black" style={{ color: '#8B1A2E' }}>
                      {formatPrix(r.prix_total)}
                    </p>
                    {r.statut === 'termine' && (
                      <Link href="/mon-espace/reservations"
                        className="text-[10px] font-bold hover:underline flex items-center gap-0.5 justify-end mt-0.5"
                        style={{ color: '#D4A832' }}>
                        <Star size={9} /> Avis
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Favoris rapide ── */}
      <div className="bg-white rounded-2xl border border-primary-50 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-50">
          <h2 className="font-bold text-base" style={{ color: '#1a0a00' }}>Favoris</h2>
          <Link href="/mon-espace/favoris"
            className="text-xs font-semibold flex items-center gap-1 hover:underline"
            style={{ color: '#8B1A2E' }}>
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>
        <div className="px-5 py-4">
          {(statsL?.favoris ?? 0) === 0 ? (
            <div className="text-center py-6">
              <Heart size={28} className="mx-auto mb-2 opacity-20" style={{ color: '#8B1A2E' }} />
              <p className="text-sm" style={{ color: '#7a5c3a' }}>Aucun favori enregistré</p>
              <Link href="/location" className="text-xs font-bold text-primary-500 hover:underline mt-2 inline-block">
                Parcourir les biens →
              </Link>
            </div>
          ) : (
            <Link href="/mon-espace/favoris"
              className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent-50 flex items-center justify-center">
                  <Heart size={16} style={{ color: '#D4A832' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#1a0a00' }}>
                    {statsL?.favoris} bien{(statsL?.favoris ?? 0) > 1 ? 's' : ''} sauvegardé{(statsL?.favoris ?? 0) > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs" style={{ color: '#7a5c3a' }}>Cliquez pour consulter</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Aperçu espace propriétaire ── */}
      {annonces.length > 0 && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50/40 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: '#8B1A2E' }}>
              Mon espace propriétaire
            </p>
            <p className="text-sm" style={{ color: '#1a0a00' }}>
              {statsP?.annonces ?? 0} annonce{(statsP?.annonces ?? 0) > 1 ? 's' : ''} active{(statsP?.annonces ?? 0) > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => useDashboardMode.getState().setMode('proprietaire')}
            className="shrink-0 text-xs font-bold text-primary-500 hover:underline flex items-center gap-1">
            Voir <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
