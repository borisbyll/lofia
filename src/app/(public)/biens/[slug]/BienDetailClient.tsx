'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin, BedDouble, Bath, Maximize2, Eye, Heart,
  MessageSquare, Share2, ShieldCheck, Star,
  ChevronLeft, ChevronRight, Flag, Calendar,
  Building2, Key, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix, formatDate, cn } from '@/lib/utils'
import { BRAND } from '@/lib/brand'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import type { Bien, Avis } from '@/types/immobilier'
import BienCard from '@/components/biens/BienCard'
import ReservationPanel from './ReservationPanel'
import SignalementModal from './SignalementModal'

const MapApproximatif = dynamic(() => import('@/components/biens/MapApproximatif'), {
  ssr: false,
  loading: () => <div className="w-full rounded-2xl bg-gray-100 animate-pulse" style={{ height: 220 }} />,
})

interface Props {
  bien: Bien
  avis: Avis[]
  similaires: Bien[]
}

export default function BienDetailClient({ bien, avis, similaires }: Props) {
  const { user } = useAuthStore()
  const [imgIdx, setImgIdx] = useState(0)
  const [showSignalement, setShowSignalement] = useState(false)

  const photos = useMemo(
    () => [bien.photo_principale, ...(bien.photos || [])].filter(Boolean) as string[],
    [bien.photo_principale, bien.photos]
  )
  const notesMoyenne = useMemo(
    () => avis.length > 0 ? avis.reduce((a, b) => a + b.note, 0) / avis.length : null,
    [avis]
  )

  const handleContact = async () => {
    if (!user) { toast.error('Connectez-vous pour contacter le propriétaire'); return }
    if (user.id === bien.owner_id) { toast.error('Vous ne pouvez pas vous contacter vous-même'); return }
    // Créer ou trouver la conversation (locataire = user courant, proprio = owner du bien)
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('bien_id', bien.id)
      .eq('locataire_id', user.id)
      .eq('proprietaire_id', bien.owner_id)
      .maybeSingle()

    if (conv) {
      window.location.href = `/mon-espace/messagerie?conv=${conv.id}`
    } else {
      const { data: newConv, error } = await supabase.from('conversations').insert({
        bien_id:        bien.id,
        locataire_id:   user.id,
        proprietaire_id: bien.owner_id,
      }).select('id').single()
      if (error) { toast.error('Impossible de démarrer la conversation'); return }
      if (newConv) window.location.href = `/mon-espace/messagerie?conv=${newConv.id}`
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: bien.titre, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Lien copié !')
    }
  }

  const handleShareWhatsApp = () => {
    const url = `https://${BRAND.domaine}/biens/${bien.slug}`
    const suffix = bien.categorie === 'location'
      ? (bien.type_location === 'courte_duree' ? '/nuit' : '/mois')
      : ''
    const text = `🏠 *${bien.titre}*\n📍 ${[bien.quartier, bien.ville].filter(Boolean).join(', ')}, Togo\n💰 ${formatPrix(bien.prix)}${suffix}\n\nVoir ce bien sur LOFIA. :\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className="section">
        <div className="wrap">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 overflow-hidden">
            <Link href="/" className="hover:text-primary-500 transition-colors shrink-0">Accueil</Link>
            <span className="shrink-0">/</span>
            <Link href={`/${bien.categorie}`} className="hover:text-primary-500 transition-colors capitalize shrink-0">
              {bien.categorie === 'vente' ? 'Acheter' : 'Louer'}
            </Link>
            <span className="shrink-0">/</span>
            <span className="text-gray-900 truncate">{bien.titre}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">

              {/* Carrousel photos */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100 aspect-[4/3] sm:aspect-[16/10]">
                {photos.length > 0 ? (
                  <>
                    <Image src={photos[imgIdx]} alt={bien.titre} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" priority />
                    {photos.length > 1 && (
                      <>
                        <button onClick={() => setImgIdx(i => (i - 1 + photos.length) % photos.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                          <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setImgIdx(i => (i + 1) % photos.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                          <ChevronRight size={20} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {photos.map((_, i) => (
                            <button key={i} onClick={() => setImgIdx(i)}
                              className={cn('w-2 h-2 rounded-full transition-all', i === imgIdx ? 'bg-white w-4' : 'bg-white/60')} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Building2 size={60} />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={cn('badge text-xs font-bold shadow-sm', bien.categorie === 'vente' ? 'bg-primary-500 text-white' : 'bg-green-600 text-white')}>
                    {bien.categorie === 'vente' ? 'À vendre' : bien.type_location === 'courte_duree' ? 'Courte durée' : 'Longue durée'}
                  </span>
                  {bien.is_featured && <span className="badge bg-accent text-white text-xs font-bold shadow-sm">⭐ Sponsorisé</span>}
                </div>

                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={handleShare} aria-label="Partager cette annonce" className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                    <Share2 size={15} aria-hidden="true" />
                  </button>
                </div>

                {/* Miniatures */}
                {photos.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
                    {imgIdx + 1}/{photos.length}
                  </div>
                )}
              </div>

              {/* Miniatures grille */}
              {photos.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2">
                  {photos.slice(0,4).map((p, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={cn('relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all', i === imgIdx ? 'border-primary-500' : 'border-transparent hover:border-gray-300')}>
                      <Image src={p} alt="" fill className="object-cover" sizes="80px" />
                      {i === 3 && photos.length > 4 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-black text-sm">+{photos.length - 4}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Titre & infos */}
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-2 sm:mb-3 leading-tight">{bien.titre}</h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                  <div className="flex items-center gap-1"><MapPin size={13} /><span className="truncate max-w-[200px]">{[bien.quartier, bien.ville].filter(Boolean).join(', ')}</span></div>
                  {bien.vues > 0 && <div className="flex items-center gap-1"><Eye size={13} />{bien.vues} vues</div>}
                  {notesMoyenne && (
                    <div className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star size={13} fill="currentColor" />{notesMoyenne.toFixed(1)} ({avis.length})
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {bien.nb_chambres != null && <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold"><BedDouble size={14} className="text-primary-500" />{bien.nb_chambres} ch.</div>}
                  {bien.nb_salles_bain != null && <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold"><Bath size={14} className="text-primary-500" />{bien.nb_salles_bain} sdb</div>}
                  {bien.superficie != null && <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold"><Maximize2 size={14} className="text-primary-500" />{bien.superficie} m²</div>}
                  {bien.nb_pieces != null && <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold"><Building2 size={14} className="text-primary-500" />{bien.nb_pieces} pièces</div>}
                </div>
                <p className="text-2xl sm:text-3xl font-black prix">
                  {formatPrix(bien.prix)}
                  {bien.categorie === 'location' && <span className="text-xs sm:text-sm text-gray-400 font-normal ml-1.5">{bien.type_location === 'courte_duree' ? '/nuit' : '/mois'}</span>}
                </p>

                {/* Partage */}
                <div className="flex items-center gap-2 flex-wrap mt-4">
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Partager sur WhatsApp
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
                  >
                    <Share2 size={15} />
                    Copier le lien
                  </button>
                </div>
              </div>

              {/* Description */}
              {bien.description && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                  <h2 className="font-black text-gray-900 mb-3">Description</h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{bien.description}</p>
                </div>
              )}

              {/* Équipements */}
              {bien.equipements && bien.equipements.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                  <h2 className="font-black text-gray-900 mb-4">Équipements</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {bien.equipements.map(eq => (
                      <div key={eq} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                        {eq}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Localisation approximative + carte */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-primary-500 shrink-0" />
                  <h2 className="font-black text-gray-900 text-sm">Localisation</h2>
                </div>
                <MapApproximatif ville={bien.ville} commune={bien.commune} />
                <div className="flex items-start gap-2.5 bg-primary-50 border border-primary-100 rounded-xl p-3">
                  <Lock size={13} className="text-primary-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-primary-600 leading-relaxed">
                    {bien.categorie === 'location' && bien.type_location === 'courte_duree'
                      ? "L'adresse exacte et les coordonnées GPS sont communiquées après confirmation de votre réservation et paiement."
                      : `Le bien se situe à ${[bien.quartier, bien.commune, bien.ville].filter(Boolean).join(', ')}. Contactez le propriétaire pour l'adresse exacte.`}
                  </p>
                </div>
              </div>

              {/* Propriétaire (mobile - card) */}
              <div className="lg:hidden bg-white border border-gray-100 rounded-2xl p-5">
                <PropriétaireCard bien={bien} onContact={handleContact} />
              </div>

              {/* Panel réservation (mobile uniquement) */}
              {bien.categorie === 'location' && bien.type_location === 'courte_duree' && (
                <div id="reserver" className="lg:hidden scroll-mt-4">
                  <ReservationPanel bien={bien} />
                </div>
              )}

              {/* Avis */}
              {avis.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-black text-gray-900">Avis</h2>
                    {notesMoyenne && (
                      <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-1.5">
                        <Star size={16} className="text-amber-400 fill-amber-400" />
                        <span className="font-black text-gray-900">{notesMoyenne.toFixed(1)}</span>
                        <span className="text-xs text-gray-500">({avis.length})</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {avis.map(a => (
                      <div key={a.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0 text-sm font-black text-primary-600">
                          {a.auteur?.nom?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-gray-900">{a.auteur?.nom || 'Anonyme'}</p>
                            <div className="flex gap-0.5">
                              {Array.from({length: 5}).map((_, i) => (
                                <Star key={i} size={11} className={i < a.note ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                              ))}
                            </div>
                          </div>
                          {a.commentaire && <p className="text-sm text-gray-600">{a.commentaire}</p>}
                          <p className="text-xs text-gray-400 mt-1">{formatDate(a.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Biens similaires */}
              {similaires.length > 0 && (
                <div>
                  <h2 className="font-black text-gray-900 mb-4">Biens similaires</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {similaires.slice(0,4).map(b => <BienCard key={b.id} bien={b} compact />)}
                  </div>
                </div>
              )}

              {/* Signalement */}
              <div className="flex justify-center">
                <button onClick={() => setShowSignalement(true)}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 transition-colors">
                  <Flag size={12} /> Signaler cette annonce
                </button>
              </div>
            </div>

            {/* Sidebar desktop */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <PropriétaireCard bien={bien} onContact={handleContact} />
                </div>
                {bien.categorie === 'location' && bien.type_location === 'courte_duree' && (
                  <ReservationPanel bien={bien} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile — Contacter + Réserver — au-dessus de la BottomNav */}
      <div className="lg:hidden fixed bottom-[68px] left-0 right-0 z-40 bg-white border-t border-gray-100 px-3 py-2.5 flex gap-2.5 shadow-[0_-4px_16px_rgba(0,0,0,.08)]">
        <button onClick={handleContact} className="flex-1 btn btn-outline gap-1.5 text-sm px-3">
          <MessageSquare size={15} /> Contacter
        </button>
        {bien.categorie === 'location' && bien.type_location === 'courte_duree' ? (
          <Link href="#reserver" className="flex-1 btn btn-primary gap-1.5 text-sm px-3">
            <Calendar size={15} /> Réserver
          </Link>
        ) : (
          <button onClick={handleContact} className="flex-1 btn btn-primary gap-1.5 text-sm px-3">
            <MessageSquare size={15} /> Envoyer message
          </button>
        )}
      </div>

      {showSignalement && <SignalementModal bienId={bien.id} onClose={() => setShowSignalement(false)} />}
    </>
  )
}

function PropriétaireCard({ bien, onContact }: {
  bien: Bien; onContact: () => void
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-white font-black text-base shadow-sm shrink-0">
          {bien.proprietaire?.nom?.charAt(0) || 'P'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-gray-900 truncate">{bien.proprietaire?.nom || 'Propriétaire'}</p>
            {bien.proprietaire?.identite_verifiee && <ShieldCheck size={14} className="text-green-500 shrink-0" />}
          </div>
          <p className="text-xs text-gray-500">Propriétaire · Membre depuis {formatDate(bien.proprietaire?.created_at || bien.created_at)}</p>
        </div>
      </div>

      {bien.proprietaire?.bio && <p className="text-sm text-gray-500 mb-4 line-clamp-3">{bien.proprietaire.bio}</p>}

      <div className="space-y-2.5">
        <button onClick={onContact} className="btn btn-primary w-full justify-center gap-2">
          <MessageSquare size={16} /> Envoyer un message
        </button>
      </div>
    </div>
  )
}
