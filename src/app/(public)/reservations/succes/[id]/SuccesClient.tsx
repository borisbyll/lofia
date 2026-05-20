'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle, Phone, MapPin, Clock, Calendar,
  MessageCircle, Printer, Home, Loader2, ChevronRight, Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix, formatDate } from '@/lib/utils'
import { BRAND } from '@/lib/brand'

interface ResaSucces {
  id: string
  date_debut: string
  date_fin: string
  nb_nuits: number
  prix_total: number
  heure_arrivee_prevue: string | null
  bien: { titre: string; ville: string; adresse: string | null; latitude: number | null; longitude: number | null; photos: string[] } | null
  proprietaire: { nom: string; phone: string | null } | null
}

const SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']

function formatHeure(h: string) {
  return h.substring(0, 5).replace(':', 'h')
}

export default function SuccesClient({ resa }: { resa: ResaSucces }) {
  const initialHeure = resa.heure_arrivee_prevue?.substring(0, 5) ?? ''
  const [step,          setStep]         = useState<'heure' | 'recap'>(initialHeure ? 'recap' : 'heure')
  const [selectedSlot,  setSelectedSlot] = useState('')
  const [customHeure,   setCustomHeure]  = useState('')
  const [saving,        setSaving]       = useState(false)
  const [heureConfirmee, setHeureConfirmee] = useState(initialHeure)

  const bien   = resa.bien        as any
  const proprio = resa.proprietaire as any
  const heureChoisie = selectedSlot || customHeure

  const handleConfirmerHeure = async () => {
    if (!heureChoisie) { toast.error("Choisissez une heure d'arrivée"); return }
    setSaving(true)
    try {
      const res = await fetch('/api/reservations/heure-arrivee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: resa.id, heure: heureChoisie }),
      })
      if (!res.ok) { toast.error('Erreur, veuillez réessayer'); return }
      setHeureConfirmee(heureChoisie)
      setStep('recap')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  /* ─── ÉTAPE 1 — Heure d'arrivée ─────────────────────────────── */
  if (step === 'heure') {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">

          {/* Badge succès */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 shadow-lg shadow-green-100 mb-4">
              <CheckCircle size={42} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-black text-brun-nuit">Réservation confirmée !</h1>
            <p className="text-brun-doux font-semibold mt-1">{bien?.titre}</p>
            <p className="text-sm text-brun-doux mt-0.5">
              {formatDate(resa.date_debut)} → {formatDate(resa.date_fin)}
              {' · '}<strong>{resa.nb_nuits} nuit{resa.nb_nuits > 1 ? 's' : ''}</strong>
            </p>
          </div>

          {/* Card heure */}
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-5">
            <div className="text-center pb-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-50 mb-3">
                <Clock size={24} className="text-primary-500" />
              </div>
              <h2 className="text-lg font-black text-brun-nuit">À quelle heure arrivez-vous ?</h2>
              <p className="text-sm text-brun-doux mt-1.5 leading-relaxed">
                Cette information permet à votre hôte d&apos;être présent et de préparer votre accueil dans les meilleures conditions.
              </p>
            </div>

            {/* Grille créneaux */}
            <div className="grid grid-cols-4 gap-2">
              {SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => { setSelectedSlot(slot); setCustomHeure('') }}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    selectedSlot === slot
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-gray-50 text-gray-600 hover:bg-primary-50 hover:text-primary-600 border border-transparent hover:border-primary-100'
                  }`}
                >
                  {formatHeure(slot)}
                </button>
              ))}
            </div>

            {/* Heure personnalisée */}
            <div className="space-y-1.5">
              <p className="text-xs text-brun-doux font-medium">Ou saisissez une heure précise</p>
              <input
                type="time"
                value={customHeure}
                onChange={e => { setCustomHeure(e.target.value); setSelectedSlot('') }}
                className="input-field text-sm"
              />
            </div>

            <button
              onClick={handleConfirmerHeure}
              disabled={saving || !heureChoisie}
              className="btn btn-primary w-full justify-center gap-2 py-3.5 text-base font-black disabled:opacity-50 shadow-xl shadow-primary-500/20"
            >
              {saving
                ? <><Loader2 size={18} className="animate-spin" /> Enregistrement…</>
                : <><ChevronRight size={18} /> Confirmer mon heure d&apos;arrivée</>
              }
            </button>

            <p className="text-[11px] text-center text-gray-400">
              Vous pourrez toujours contacter votre hôte en cas de changement.
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ─── ÉTAPE 2 — Récapitulatif ────────────────────────────────── */
  const heureDisplay = heureConfirmee ? formatHeure(heureConfirmee) : null
  const hasGPS = bien?.latitude && bien?.longitude

  return (
    <div className="min-h-screen bg-cream py-8 px-4 print:bg-white print:py-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Hero */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-7 text-white text-center shadow-2xl shadow-green-500/30">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
            <CheckCircle size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black mb-1">Tout est prêt !</h1>
          <p className="text-green-100 text-sm leading-relaxed">
            Votre séjour à <strong className="text-white">{bien?.titre}</strong> est confirmé.
            <br />Conservez ce récapitulatif précieusement.
          </p>
        </div>

        {/* Période */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Calendar size={18} className="text-primary-500" />
            </div>
            <p className="font-bold text-brun-nuit">Période de séjour</p>
          </div>
          <div className="pl-[52px] space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-brun-doux">Arrivée</span>
              <span className="font-semibold text-brun-nuit">{formatDate(resa.date_debut)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brun-doux">Départ</span>
              <span className="font-semibold text-brun-nuit">{formatDate(resa.date_fin)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-gray-100">
              <span className="text-brun-doux">{resa.nb_nuits} nuit{resa.nb_nuits > 1 ? 's' : ''}</span>
              <span className="font-black text-primary-500">{formatPrix(resa.prix_total)}</span>
            </div>
          </div>
        </div>

        {/* Heure d'arrivée + message accueil */}
        {heureDisplay && (
          <div className="bg-primary-50 border-2 border-primary-100 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-primary-500" />
              </div>
              <p className="font-bold text-brun-nuit">Heure d&apos;arrivée prévue</p>
            </div>
            <div className="pl-[52px]">
              <p className="text-3xl font-black text-primary-500 mb-2">{heureDisplay}</p>
              <div className="flex items-start gap-2 bg-white rounded-xl p-3 border border-primary-100">
                <Star size={14} className="text-accent-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-brun-doux leading-relaxed">
                  Votre propriétaire vous attendra sur les lieux à <strong className="text-brun-nuit">{heureDisplay}</strong> pour votre check-in et vous remettra les clés en mains propres.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Propriétaire */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Home size={18} className="text-amber-500" />
            </div>
            <p className="font-bold text-brun-nuit">Votre hôte</p>
          </div>
          <div className="pl-[52px] space-y-3">
            <p className="font-black text-brun-nuit text-base">{proprio?.nom ?? '—'}</p>
            {proprio?.phone && (
              <a
                href={`tel:${proprio.phone}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-primary-50 hover:border-primary-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Numéro de contact</p>
                  <p className="text-sm font-bold text-primary-600">{proprio.phone}</p>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Géolocalisation */}
        {(bien?.adresse || hasGPS) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-emerald-600" />
              </div>
              <p className="font-bold text-brun-nuit">Localisation débloquée</p>
            </div>
            <div className="pl-[52px] space-y-3">
              {bien?.adresse && (
                <p className="text-sm text-brun-doux">
                  {bien.adresse}
                  {bien.ville && `, ${bien.ville}`}
                </p>
              )}
              {hasGPS && (
                <>
                  <p className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-lg w-fit">
                    {bien.latitude}, {bien.longitude}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${bien.latitude},${bien.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors w-fit"
                  >
                    <MapPin size={14} />
                    Ouvrir dans Google Maps
                  </a>
                </>
              )}
            </div>
          </div>
        )}

        {/* Service client */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-brun-nuit">Service client {BRAND.name}</p>
              <p className="text-xs text-brun-doux">Disponible 7j/7</p>
            </div>
          </div>
          <div className="pl-[52px] space-y-2">
            <p className="text-sm text-brun-doux leading-relaxed">
              Un problème lors de votre séjour ? Notre équipe est là pour vous. Contactez-nous directement sur WhatsApp.
            </p>
            <a
              href={`https://wa.me/${BRAND.whatsapp.replace('+', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm font-bold text-green-800 bg-green-50 border border-green-200 px-4 py-3 rounded-xl hover:bg-green-100 transition-colors"
            >
              <MessageCircle size={16} className="text-green-600 flex-shrink-0" />
              {BRAND.whatsapp} — WhatsApp
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3 pt-2 pb-10 print:hidden">
          <Link
            href="/mon-espace/reservations"
            className="btn btn-primary w-full justify-center gap-2 py-3.5 text-base font-black shadow-xl shadow-primary-500/20"
          >
            Voir mes réservations
          </Link>
          <button
            onClick={() => window.print()}
            className="btn btn-outline w-full justify-center gap-2"
          >
            <Printer size={16} />
            Imprimer le récapitulatif
          </button>
        </div>
      </div>
    </div>
  )
}
