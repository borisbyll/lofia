'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, MapPin, Phone, User, Calendar, ExternalLink, AlertTriangle, MessageSquare } from 'lucide-react'
import { formatPrix, formatDate } from '@/lib/utils'

interface Props {
  reservation: {
    id: string
    statut: string
    date_debut: string
    date_fin: string
    nb_nuits: number
    prix_total: number
    prix_nuit: number
    commission: number
    montant_proprio: number
    paiement_effectue: boolean
    paiement_at: string | null
    fedapay_transaction_id: string | null
    locataire_id: string
    proprietaire_id: string
    biens: {
      id: string
      titre: string
      slug: string
      adresse: string | null
      ville: string
      commune: string | null
      quartier: string | null
      latitude: number | null
      longitude: number | null
      photos: string[] | null
      photo_principale: string | null
      type_bien: string
    } | null
    profiles: {
      id: string
      nom: string | null
      phone: string | null
      avatar_url: string | null
    } | null
  }
  isLocataire: boolean
}

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  confirmee:   { label: 'Confirmée',    color: 'text-green-700 bg-green-50 border-green-200' },
  en_cours:    { label: 'En cours',     color: 'text-blue-700 bg-blue-50 border-blue-200' },
  termine:     { label: 'Terminée',     color: 'text-gray-700 bg-gray-50 border-gray-200' },
  terminee:    { label: 'Terminée',     color: 'text-gray-700 bg-gray-50 border-gray-200' },
  annulee:     { label: 'Annulée',      color: 'text-red-700 bg-red-50 border-red-200' },
  no_show:     { label: 'No-show',      color: 'text-red-700 bg-red-50 border-red-200' },
}

export default function ReservationDetailClient({ reservation: resa, isLocataire }: Props) {
  const bien = resa.biens
  const proprio = resa.profiles
  const statut = STATUT_LABELS[resa.statut] ?? { label: resa.statut, color: 'text-gray-700 bg-gray-50 border-gray-200' }

  const ref = `LOFIA-RES-${resa.id.slice(0, 8).toUpperCase()}`

  const adresseComplete = [
    bien?.adresse,
    bien?.quartier,
    bien?.commune,
    bien?.ville,
  ].filter(Boolean).join(', ')

  const mapsUrl = bien?.latitude && bien?.longitude
    ? `https://www.google.com/maps?q=${bien.latitude},${bien.longitude}`
    : bien?.adresse
    ? `https://www.google.com/maps/search/${encodeURIComponent(adresseComplete)}`
    : null

  const paiementEffectue = resa.paiement_effectue

  return (
    <div className="min-h-screen bg-cream pb-nav">
      <div className="wrap py-6 max-w-xl mx-auto space-y-5">

        {/* Header statut */}
        <div className="text-center py-6">
          {resa.statut === 'confirmee' || resa.statut === 'en_cours' ? (
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
          ) : (
            <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto mb-3" />
          )}
          <h1 className="font-black text-brun-nuit text-2xl mb-1">
            {resa.statut === 'confirmee' ? 'Réservation confirmée !' : statut.label}
          </h1>
          <p className="text-brun-doux text-sm font-mono">Réf : {ref}</p>
        </div>

        {/* Photo + titre bien */}
        {bien && (
          <div className="dashboard-card p-0 overflow-hidden">
            {bien.photo_principale && (
              <div className="relative w-full h-48">
                <Image
                  src={bien.photo_principale}
                  alt={bien.titre}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-4">
              <h2 className="font-bold text-brun-nuit">{bien.titre}</h2>
              <p className="text-sm text-brun-doux mt-0.5">{bien.ville}</p>
            </div>
          </div>
        )}

        {/* Dates et montant */}
        <div className="dashboard-card space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-primary-500" />
            <span className="font-semibold text-brun-nuit text-sm">Période</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brun-doux">Arrivée</span>
            <span className="font-semibold text-brun-nuit">{formatDate(resa.date_debut)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brun-doux">Départ</span>
            <span className="font-semibold text-brun-nuit">{formatDate(resa.date_fin)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-2">
            <span className="text-brun-doux">{resa.nb_nuits} nuit{resa.nb_nuits > 1 ? 's' : ''} × {formatPrix(resa.prix_nuit)}</span>
            <span className="font-black text-primary-500">{formatPrix(resa.prix_total)}</span>
          </div>
          {resa.paiement_at && (
            <p className="text-xs text-green-600">✅ Payé le {new Date(resa.paiement_at).toLocaleDateString('fr-FR')}</p>
          )}
        </div>

        {/* Adresse — débloquée après paiement */}
        {isLocataire && paiementEffectue && bien && (
          <div className="dashboard-card space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} className="text-primary-500" />
              <span className="font-semibold text-brun-nuit text-sm">Adresse</span>
            </div>
            <p className="text-sm text-brun-nuit">{adresseComplete || bien.ville}</p>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary-500 font-semibold hover:text-primary-600"
              >
                <ExternalLink size={12} /> Voir sur Google Maps
              </a>
            )}
          </div>
        )}

        {/* Contact propriétaire — débloqué après paiement */}
        {isLocataire && paiementEffectue && proprio && (
          <div className="dashboard-card space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-primary-500" />
              <span className="font-semibold text-brun-nuit text-sm">Contact propriétaire</span>
            </div>
            <div className="flex items-center gap-3">
              {proprio.avatar_url ? (
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image src={proprio.avatar_url} alt={proprio.nom ?? ''} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="font-bold text-primary-600 text-sm">{proprio.nom?.[0] ?? '?'}</span>
                </div>
              )}
              <div>
                <p className="font-semibold text-brun-nuit text-sm">{proprio.nom}</p>
                {proprio.phone && (
                  <a href={`tel:${proprio.phone}`} className="flex items-center gap-1 text-xs text-primary-500 font-semibold mt-0.5">
                    <Phone size={11} /> {proprio.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Informations non disponibles avant paiement */}
        {isLocataire && !paiementEffectue && (
          <div className="dashboard-card bg-amber-50 border-amber-200 text-center py-4">
            <p className="text-sm text-amber-800 font-semibold">
              🔒 Adresse et contact débloqués après confirmation du paiement
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {bien && (
            <Link href={`/biens/${bien.slug}`} className="btn btn-outline w-full justify-center">
              Voir la fiche du bien
            </Link>
          )}

          {isLocataire && ['confirmee', 'en_cours'].includes(resa.statut) && (
            <Link
              href={`/mon-espace/reservations/${resa.id}/signaler-probleme`}
              className="btn btn-ghost w-full justify-center text-red-600 border-red-200 hover:bg-red-50"
            >
              <AlertTriangle size={15} /> Signaler un problème
            </Link>
          )}

          {isLocataire && resa.statut === 'confirmee' && (
            <Link
              href={`/mon-espace/reservations/${resa.id}/annuler`}
              className="btn btn-ghost w-full justify-center"
            >
              Annuler ma réservation
            </Link>
          )}

          <Link href="/mon-espace/reservations" className="block text-center text-sm text-brun-doux hover:text-primary-500">
            ← Mes réservations
          </Link>
        </div>
      </div>
    </div>
  )
}
