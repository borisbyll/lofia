'use client'

import { useState } from 'react'
import { Shield, ShieldAlert, Star, AlertTriangle, Search, ChevronDown, ChevronUp } from 'lucide-react'
import BadgeNiveauLocataire from '@/components/locataires/BadgeNiveauLocataire'
import type { NiveauLocataire } from '@/lib/locataires/gestion-score'

interface ScoreRow {
  id: string
  locataire_id: string
  score: number
  niveau: NiveauLocataire
  reservations_honorees: number
  no_shows: number
  reservations_annulees_moins_24h: number
  suspendu: boolean
  suspendu_jusqu: string | null
  banni: boolean
  nombre_suspensions: number
  profiles: { nom: string; phone: string | null } | null
}

const NIVEAUX_ORDRE: NiveauLocataire[] = ['banni', 'suspendu', 'alerte', 'vigilance', 'standard', 'or', 'platine']

export default function AdminLocatairesClient({ scores }: { scores: ScoreRow[] }) {
  const [recherche, setRecherche] = useState('')
  const [filtreNiveau, setFiltreNiveau] = useState<NiveauLocataire | 'tous'>('tous')
  const [expandId, setExpandId] = useState<string | null>(null)

  const filtres = scores.filter(s => {
    const p = s.profiles
    const matchRecherche = !recherche ||
      p?.nom?.toLowerCase().includes(recherche.toLowerCase()) ||
      p?.phone?.includes(recherche)
    const matchNiveau = filtreNiveau === 'tous' || s.niveau === filtreNiveau
    return matchRecherche && matchNiveau
  })

  const stats = {
    total: scores.length,
    platine: scores.filter(s => s.niveau === 'platine').length,
    suspendus: scores.filter(s => s.suspendu).length,
    bannis: scores.filter(s => s.banni).length,
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="page-title">Scores locataires</h1>
        <p className="text-sm text-brun-doux mt-0.5">Gestion des profils de fiabilité</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-brun-nuit">{stats.total}</p>
          <p className="text-xs text-brun-doux">Locataires</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-accent-600">{stats.platine}</p>
          <p className="text-xs text-brun-doux">Platine</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-amber-600">{stats.suspendus}</p>
          <p className="text-xs text-brun-doux">Suspendus</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-red-600">{stats.bannis}</p>
          <p className="text-xs text-brun-doux">Bannis</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brun-doux" />
          <input
            type="text"
            placeholder="Rechercher par nom ou téléphone…"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>
        <select
          value={filtreNiveau}
          onChange={e => setFiltreNiveau(e.target.value as NiveauLocataire | 'tous')}
          className="input-field text-sm"
        >
          <option value="tous">Tous les niveaux</option>
          {NIVEAUX_ORDRE.map(n => (
            <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtres.length === 0 && (
          <div className="dashboard-card text-center py-10 text-brun-doux">
            <Shield size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun locataire trouvé</p>
          </div>
        )}

        {filtres.map(s => {
          const p = s.profiles
          const isExpanded = expandId === s.id

          return (
            <div key={s.id} className={`dashboard-card transition-all ${s.banni ? 'border-red-200' : s.suspendu ? 'border-amber-200' : ''}`}>
              <div
                className="flex items-center justify-between gap-3 cursor-pointer"
                onClick={() => setExpandId(isExpanded ? null : s.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    {s.banni
                      ? <ShieldAlert size={16} className="text-red-500" />
                      : s.niveau === 'platine'
                      ? <Star size={16} className="text-accent-500 fill-current" />
                      : s.suspendu
                      ? <AlertTriangle size={16} className="text-amber-500" />
                      : <Shield size={16} className="text-primary-400" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-brun-nuit text-sm truncate">{p?.nom ?? 'N/A'}</span>
                      <BadgeNiveauLocataire niveau={s.niveau} showForStaff />
                    </div>
                    <p className="text-xs text-brun-doux">{p?.phone ?? 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-lg font-black text-brun-nuit">{s.score}</p>
                    <p className="text-[10px] text-brun-doux">pts</p>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-brun-doux" /> : <ChevronDown size={16} className="text-brun-doux" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-base font-black text-emerald-600">{s.reservations_honorees}</p>
                      <p className="text-[10px] text-brun-doux">Séjours honorés</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-base font-black text-red-500">{s.no_shows}</p>
                      <p className="text-[10px] text-brun-doux">No-shows</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-base font-black text-amber-500">{s.reservations_annulees_moins_24h}</p>
                      <p className="text-[10px] text-brun-doux">Ann. &lt;24h</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-base font-black text-brun-nuit">{s.nombre_suspensions}</p>
                      <p className="text-[10px] text-brun-doux">Suspensions</p>
                    </div>
                  </div>

                  {s.suspendu && s.suspendu_jusqu && (
                    <div className="text-xs bg-amber-50 rounded-lg p-2 text-amber-700">
                      Suspendu jusqu&apos;au {new Date(s.suspendu_jusqu).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <a
                      href={`/admin/locataires/${s.locataire_id}/historique`}
                      className="btn btn-ghost text-xs px-3 py-1.5"
                    >
                      Voir historique complet
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
