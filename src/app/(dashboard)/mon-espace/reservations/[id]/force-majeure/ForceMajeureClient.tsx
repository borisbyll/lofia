'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Upload, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

const TYPES_EVENEMENTS = [
  { value: 'deces_famille', label: 'Décès dans la famille', categorie: 'A', detail: 'Faire-part, certificat de décès' },
  { value: 'hospitalisation', label: 'Hospitalisation d\'urgence', categorie: 'A', detail: 'Attestation hospitalière, ordonnance' },
  { value: 'decision_administrative', label: 'Convocation administrative ou judiciaire', categorie: 'A', detail: 'Document officiel avec date' },
  { value: 'accident', label: 'Accident de la route', categorie: 'B', detail: 'Constat, photos' },
  { value: 'catastrophe_naturelle', label: 'Catastrophe naturelle', categorie: 'B', detail: 'Photos, rapport autorités' },
  { value: 'urgence_medicale', label: 'Autre urgence médicale', categorie: 'B', detail: 'Ordonnance médicale' },
]

interface Props {
  reservation: {
    id: string
    date_debut: string
    date_fin: string
    biens: { titre: string; slug: string; ville: string } | null
  }
}

export default function ForceMajeureClient({ reservation }: Props) {
  const router = useRouter()
  const [etape, setEtape] = useState(1)
  const [typeEvenement, setTypeEvenement] = useState('')
  const [description, setDescription] = useState('')
  const [fichier, setFichier] = useState<File | null>(null)
  const [justificatifUrl, setJustificatifUrl] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  const bien = reservation.biens
  const typeSelectionne = TYPES_EVENEMENTS.find(t => t.value === typeEvenement)

  const uploadFichier = async (file: File) => {
    setUploadLoading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `force-majeure/${reservation.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('biens-photos')
        .upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('biens-photos').getPublicUrl(path)
      setJustificatifUrl(data.publicUrl)
      toast.success('Justificatif téléversé')
    } catch {
      toast.error('Erreur lors du téléversement')
    } finally {
      setUploadLoading(false)
    }
  }

  const soumettre = async () => {
    if (!typeEvenement) return
    setSubmitLoading(true)
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/force-majeure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_evenement: typeEvenement, description, justificatif_url: justificatifUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setEtape(4)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-nav">
      <div className="wrap py-6 max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <Link href={`/mon-espace/reservations/${reservation.id}/annuler`} className="inline-flex items-center gap-1.5 text-sm text-brun-doux hover:text-primary-500 mb-3">
            <ArrowLeft size={14} /> Retour
          </Link>
          <h1 className="page-title">Annulation pour circonstance exceptionnelle</h1>
          {bien && <p className="text-brun-doux text-sm mt-1">{bien.titre} · {bien.ville}</p>}
        </div>

        {/* Indicateur d'étapes */}
        {etape < 4 && (
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <div key={n} className={`flex-1 h-1.5 rounded-full transition-colors ${n <= etape ? 'bg-primary-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}

        {/* Étape 1 — Type d'événement */}
        {etape === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-brun-doux">Sélectionnez la nature de la circonstance exceptionnelle :</p>
            {TYPES_EVENEMENTS.map(t => (
              <label key={t.value} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${typeEvenement === t.value ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-200'}`}>
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={typeEvenement === t.value}
                  onChange={() => setTypeEvenement(t.value)}
                  className="mt-0.5 accent-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brun-nuit">{t.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${t.categorie === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      Cat. {t.categorie}
                    </span>
                  </div>
                  <p className="text-xs text-brun-doux mt-0.5">{t.detail}</p>
                </div>
              </label>
            ))}
            <button
              onClick={() => setEtape(2)}
              disabled={!typeEvenement}
              className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50"
            >
              Continuer <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Étape 2 — Description */}
        {etape === 2 && (
          <div className="space-y-4">
            <div className="dashboard-card">
              <p className="text-xs font-semibold text-brun-doux mb-1">Événement sélectionné</p>
              <p className="text-sm font-semibold text-brun-nuit">{typeSelectionne?.label}</p>
            </div>
            <div>
              <label className="label-field">Description (optionnel, 200 mots max)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={1200}
                rows={5}
                placeholder="Décrivez brièvement la situation..."
                className="input-field resize-none"
              />
              <p className="text-xs text-brun-doux mt-1 text-right">{description.length}/1200 caractères</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEtape(1)} className="btn btn-outline flex-1 justify-center">Retour</button>
              <button onClick={() => setEtape(3)} className="btn btn-primary flex-1 justify-center gap-2">
                Continuer <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 — Justificatif */}
        {etape === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-brun-nuit mb-1">Justificatif</p>
              <p className="text-xs text-brun-doux">Photo WhatsApp, scan, document — tout format accepté. Taille max 10 Mo.</p>
            </div>

            <label className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${justificatifUrl ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-primary-300'}`}>
              {uploadLoading ? (
                <Loader2 size={24} className="animate-spin text-primary-500" />
              ) : justificatifUrl ? (
                <>
                  <Check size={24} className="text-emerald-500" />
                  <span className="text-xs text-emerald-700 font-semibold">Justificatif téléversé</span>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-brun-doux" />
                  <span className="text-xs text-brun-doux">Cliquez pour sélectionner un fichier</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) { setFichier(f); uploadFichier(f) }
                }}
              />
            </label>

            <p className="text-xs text-brun-doux text-center">
              Sans justificatif, votre demande sera examinée au cas par cas.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setEtape(2)} className="btn btn-outline flex-1 justify-center">Retour</button>
              <button
                onClick={soumettre}
                disabled={submitLoading || uploadLoading}
                className="btn btn-primary flex-1 justify-center gap-2 disabled:opacity-50"
              >
                {submitLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                {submitLoading ? 'Envoi…' : 'Soumettre la demande'}
              </button>
            </div>
          </div>
        )}

        {/* Étape 4 — Confirmation */}
        {etape === 4 && (
          <div className="dashboard-card text-center space-y-4 py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <Check size={28} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-brun-nuit">Demande soumise</h2>
              <p className="text-sm text-brun-doux mt-2">
                Votre demande d&apos;annulation exceptionnelle a été reçue. Notre équipe l&apos;examine sous 4h.
                Vous serez notifié dès la décision prise.
              </p>
              <p className="text-xs text-brun-doux mt-1">
                En attendant, votre réservation est suspendue.
              </p>
            </div>
            <button
              onClick={() => router.push('/mon-espace/reservations')}
              className="btn btn-primary justify-center"
            >
              Voir mes réservations
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
