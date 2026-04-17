'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Star, CheckCircle, Home, Globe, Calendar,
  MessageCircle, MapPin, Phone
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import BienCard from '@/components/biens/BienCard'
import type { Bien } from '@/types/immobilier'

interface Profile {
  id: string
  nom: string
  bio: string | null
  avatar_url: string | null
  identite_verifiee: boolean
  is_diaspora: boolean
  created_at: string
}

interface AvisItem {
  id: string
  note: number
  commentaire: string | null
  created_at: string
  auteur: { nom: string; avatar_url: string | null } | null
  bien: { titre: string; slug: string } | null
}

interface Props {
  profile: Profile
  biens: Bien[]
  avis: AvisItem[]
}

export default function ProprietaireClient({ profile, biens, avis }: Props) {
  const [filter, setFilter] = useState<'all' | 'vente' | 'location'>('all')

  const filtered = filter === 'all' ? biens : biens.filter(b => b.categorie === filter)

  // Note moyenne (si avis)
  const avgNote = biens.reduce((acc, b) => {
    const avisArr = (b as any).avis ?? []
    return acc + avisArr.reduce((s: number, a: any) => s + (a.note ?? 0), 0)
  }, 0) / Math.max(1, biens.reduce((acc, b) => acc + ((b as any).avis?.length ?? 0), 0))

  const totalAvis = biens.reduce((acc, b) => acc + ((b as any).avis?.length ?? 0), 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12 pb-24 lg:pb-12">
      {/* Profil */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-primary-100 overflow-hidden flex items-center justify-center">
              {profile.avatar_url
                ? <Image src={profile.avatar_url} alt={profile.nom} fill className="object-cover" sizes="96px" />
                : <span className="text-3xl font-black text-primary-400">{profile.nom?.charAt(0) ?? '?'}</span>
              }
            </div>
            {profile.identite_verifiee && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                <CheckCircle size={13} className="text-white" />
              </div>
            )}
          </div>

          {/* Infos */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-gray-900">{profile.nom}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {profile.identite_verifiee && (
                    <span className="badge badge-success text-xs flex items-center gap-1">
                      <CheckCircle size={10} /> Identité vérifiée
                    </span>
                  )}
                  {profile.is_diaspora && (
                    <span className="badge badge-primary text-xs flex items-center gap-1">
                      <Globe size={10} /> Diaspora
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <p className="text-2xl font-black text-gray-900">{biens.length}</p>
                <p className="text-xs text-gray-400">annonce{biens.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{profile.bio}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                Membre depuis {formatDate(profile.created_at)}
              </span>
              {totalAvis > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={11} className="text-amber-400" />
                  {avgNote.toFixed(1)} · {totalAvis} avis
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Annonces */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">
            Annonces de {profile.nom.split(' ')[0]}
          </h2>

          {/* Filtres catégorie */}
          <div className="flex gap-2">
            {(['all', 'vente', 'location'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === f
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {f === 'all' ? 'Tout' : f === 'vente' ? 'Vente' : 'Location'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Home size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500">Aucune annonce dans cette catégorie</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(bien => (
              <BienCard key={bien.id} bien={bien} />
            ))}
          </div>
        )}
      </div>

      {/* Avis */}
      {avis.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-black text-gray-900">
              Avis locataires
            </h2>
            <div className="flex items-center gap-1.5 bg-amber-50 rounded-xl px-3 py-1">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-black text-gray-900 text-sm">{avgNote.toFixed(1)}</span>
              <span className="text-xs text-gray-500">({avis.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {avis.map(a => (
              <div key={a.id} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
                {/* Header avis */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0 font-black text-primary-600 text-sm">
                      {a.auteur?.avatar_url
                        ? <Image src={a.auteur.avatar_url} alt={a.auteur.nom} fill className="object-cover rounded-full" sizes="36px" />
                        : (a.auteur?.nom?.charAt(0) ?? 'A')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{a.auteur?.nom ?? 'Locataire'}</p>
                      <p className="text-xs text-gray-400">{formatDate(a.created_at)}</p>
                    </div>
                  </div>
                  {/* Étoiles */}
                  <div className="flex gap-0.5 shrink-0">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={13}
                        fill={n <= a.note ? '#D4A832' : 'none'}
                        style={{ color: n <= a.note ? '#D4A832' : '#d1d5db' }}
                      />
                    ))}
                  </div>
                </div>

                {/* Bien concerné */}
                {a.bien && (
                  <Link href={`/biens/${a.bien.slug}`}
                    className="text-xs text-primary-500 hover:underline font-semibold truncate block">
                    {a.bien.titre}
                  </Link>
                )}

                {/* Commentaire */}
                {a.commentaire && (
                  <p className="text-sm text-gray-600 leading-relaxed">{a.commentaire}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
