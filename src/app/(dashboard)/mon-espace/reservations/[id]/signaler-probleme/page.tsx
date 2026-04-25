'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, AlertTriangle, Loader2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPES_PROBLEME = [
  { value: 'non_conforme',          label: 'Le bien ne correspond pas aux photos/description' },
  { value: 'acces',                 label: 'Problème d\'accès (clés, code, badge)' },
  { value: 'hygiene',               label: 'Problème d\'hygiène ou de propreté' },
  { value: 'equipement',            label: 'Équipement défectueux (eau, électricité, climatisation)' },
  { value: 'securite',              label: 'Problème de sécurité' },
  { value: 'comportement_proprio',  label: 'Comportement du propriétaire' },
  { value: 'autre',                 label: 'Autre' },
]

export default function SignalerProblemePage() {
  const router = useRouter()
  const params = useParams()
  const reservationId = params.id as string

  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirme, setConfirme] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type) { toast.error('Choisissez le type de problème'); return }
    if (!description.trim()) { toast.error('Décrivez le problème'); return }
    if (!confirme) { toast.error('Confirmez que vous souhaitez signaler ce problème'); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/reservations/${reservationId}/signaler-probleme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_probleme: type, description: description.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Signalement envoyé. Notre équipe intervient sous 2h.')
      router.back()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto pb-24 lg:pb-8">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-brun-doux mb-6 hover:text-primary-500 transition-colors">
        <ChevronLeft size={16} /> Retour
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={20} className="text-red-500" />
          <h1 className="text-xl font-black text-brun-nuit">Signaler un problème</h1>
        </div>
        <p className="text-sm text-brun-doux">Notre équipe interviendra sous 2h.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type de problème */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-brun-nuit text-sm">Type de problème *</h2>
          {TYPES_PROBLEME.map(tp => (
            <label key={tp.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${type === tp.value ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}>
              <input
                type="radio"
                name="type"
                value={tp.value}
                checked={type === tp.value}
                onChange={() => setType(tp.value)}
                className="accent-primary-500 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm text-brun-nuit">{tp.label}</span>
            </label>
          ))}
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-brun-nuit text-sm">Description *</h2>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez précisément le problème rencontré…"
            rows={4}
            maxLength={1000}
            className="input-field resize-none"
            required
          />
          <p className="text-xs text-right text-gray-400">{description.length}/1000</p>
        </div>

        {/* Confirmation */}
        <label className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={confirme}
            onChange={e => setConfirme(e.target.checked)}
            className="accent-primary-500 mt-0.5"
          />
          <p className="text-sm text-amber-800">
            Je confirme signaler un problème réel pendant mon séjour. Les fausses déclarations peuvent entraîner des sanctions.
          </p>
        </label>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost flex-1 justify-center">
            <X size={15} /> Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !type || !description.trim() || !confirme}
            className="btn btn-danger flex-1 justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Envoi…' : 'Signaler le problème'}
          </button>
        </div>
      </form>
    </div>
  )
}
