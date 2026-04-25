'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Calendar, MessageSquare, Loader2, ChevronLeft, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix } from '@/lib/utils'

interface Bien {
  id: string
  titre: string
  prix: number
  adresse?: string
  ville?: string
  photos?: string[]
  photo_principale?: string
  slug: string
}

interface Props { bien: Bien }

export default function DemanderReservationClient({ bien }: Props) {
  const router = useRouter()
  const [dateArrivee, setDateArrivee] = useState('')
  const [dateDepart, setDateDepart] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const photo = bien.photo_principale ?? bien.photos?.[0] ?? null
  const today = new Date().toISOString().split('T')[0]

  const nbNuits = dateArrivee && dateDepart
    ? Math.max(0, Math.round((new Date(dateDepart).getTime() - new Date(dateArrivee).getTime()) / 86400000))
    : 0

  const montantTotal = nbNuits * (bien.prix ?? 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dateArrivee || !dateDepart) { toast.error('Choisissez vos dates'); return }
    if (nbNuits <= 0) { toast.error('La date de départ doit être après la date d\'arrivée'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/reservations/creer-demande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bien_id: bien.id,
          date_arrivee: dateArrivee,
          date_depart: dateDepart,
          message: message.trim() || null,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409 && data.demande_id) {
          toast.error('Vous avez déjà une demande en cours pour ce bien')
          router.push(`/reservations/demandes/${data.demande_id}`)
          return
        }
        toast.error(data.error ?? 'Erreur lors de la demande')
        return
      }

      toast.success('Demande envoyée ! Le propriétaire a 12h pour répondre.')
      router.push(`/reservations/demandes/${data.demande_id}`)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Retour */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-brun-doux mb-6 hover:text-primary-500 transition-colors">
          <ChevronLeft size={16} /> Retour au bien
        </button>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Header bien */}
          <div className="relative h-40 bg-or-pale">
            {photo && (
              <Image src={photo} alt={bien.titre} fill className="object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-white font-black text-lg leading-tight">{bien.titre}</h1>
              {bien.ville && <p className="text-white/80 text-xs mt-0.5">{bien.ville}</p>}
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-black text-brun-nuit">Votre demande de réservation</h2>
              <p className="text-sm text-brun-doux mt-0.5">{formatPrix(bien.prix)} / nuit</p>
            </div>

            {/* Info box */}
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 flex gap-2.5">
              <Info size={16} className="text-primary-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-primary-700 space-y-1">
                <p className="font-semibold">Comment ça marche ?</p>
                <p>1. Vous envoyez votre demande <span className="font-semibold">(gratuit)</span></p>
                <p>2. Le propriétaire confirme ou refuse sous 12h</p>
                <p>3. Si confirmé, vous recevez un lien de paiement</p>
                <p>4. Vous payez pour finaliser votre réservation</p>
                <p className="font-semibold text-primary-600 mt-1">⚠️ AUCUN PAIEMENT n&apos;est demandé à cette étape</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Arrivée *</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={dateArrivee}
                      min={today}
                      onChange={e => setDateArrivee(e.target.value)}
                      className="input-field pl-8 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">Départ *</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={dateDepart}
                      min={dateArrivee || today}
                      onChange={e => setDateDepart(e.target.value)}
                      className="input-field pl-8 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Récapitulatif */}
              {nbNuits > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-brun-doux">{nbNuits} nuit{nbNuits > 1 ? 's' : ''} × {formatPrix(bien.prix)}</span>
                    <span className="font-black text-primary-500">{formatPrix(montantTotal)}</span>
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="label-field flex items-center gap-1.5">
                  <MessageSquare size={13} /> Message au propriétaire (optionnel)
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Présentez-vous, précisez le motif du séjour…"
                  rows={3}
                  maxLength={1000}
                  className="input-field resize-none text-sm"
                />
                <p className="text-xs text-right text-gray-400 mt-1">{message.length}/1000</p>
              </div>

              <button
                type="submit"
                disabled={loading || nbNuits <= 0}
                className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'Envoi en cours…' : 'Envoyer ma demande'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
