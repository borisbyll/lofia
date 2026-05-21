'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

interface Props {
  resaId: string
  bienId: string
  locataireId: string
  locataireNom: string
}

export default function CheckoutButton({ resaId, bienId, locataireId, locataireNom }: Props) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [step, setStep]         = useState<'btn' | 'avis' | 'done'>('btn')
  const [loading, setLoading]   = useState(false)
  const [note, setNote]         = useState(0)
  const [survol, setSurvol]     = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [avisLoading, setAvisLoading] = useState(false)

  const labels = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent']

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reservations/${resaId}/confirmer-checkout`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      setStep('avis')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAvis = async () => {
    if (!note || !user) return
    setAvisLoading(true)
    try {
      await supabase.from('avis').insert({
        reservation_id:   resaId,
        bien_id:          bienId,
        auteur_id:        user.id,
        sujet_id:         locataireId,
        proprietaire_id:  user.id,
        note,
        commentaire:      commentaire.trim() || null,
        type:             'proprio_note_locataire',
      })
      setStep('done')
      router.refresh()
    } catch {
      setStep('done')
      router.refresh()
    } finally {
      setAvisLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-1">
        <p className="text-2xl">✅</p>
        <p className="font-bold text-green-800">Check-out validé !</p>
        <p className="text-sm text-green-600">Les fonds ont été libérés. Merci d&apos;avoir accueilli {locataireNom} sur LOFIA.</p>
      </div>
    )
  }

  if (step === 'avis') {
    const etoile = survol || note
    return (
      <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-5 space-y-4">
        <div>
          <p className="font-black text-brun-nuit">Évaluez votre locataire</p>
          <p className="text-sm text-brun-doux mt-0.5">
            Comment s&apos;est comporté <span className="font-semibold">{locataireNom}</span> durant ce séjour ?
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <button key={i}
              onClick={() => setNote(i)}
              onMouseEnter={() => setSurvol(i)}
              onMouseLeave={() => setSurvol(0)}
              className="focus:outline-none transition-transform hover:scale-110">
              <Star
                size={32}
                className={i <= etoile ? 'text-accent-500 fill-accent-500' : 'text-gray-200 fill-gray-200'}
              />
            </button>
          ))}
          {etoile > 0 && (
            <span className="text-sm font-semibold text-brun-doux ml-1">{labels[etoile]}</span>
          )}
        </div>

        <textarea
          className="input-field w-full h-24 resize-none text-sm"
          placeholder="Commentaire facultatif — ponctualité, propreté, respect des règles..."
          value={commentaire}
          onChange={e => setCommentaire(e.target.value)}
          maxLength={500}
        />

        <div className="flex gap-2">
          <button
            onClick={() => { setStep('done'); router.refresh() }}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
            Passer
          </button>
          <button
            onClick={handleAvis}
            disabled={!note || avisLoading}
            className="flex-1 btn-primary py-3 text-sm disabled:opacity-50">
            {avisLoading ? 'Envoi…' : 'Envoyer l\'évaluation'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:opacity-50 shadow-sm">
      <LogOut size={16} />
      {loading ? 'Validation en cours…' : 'Valider le check-out du locataire'}
    </button>
  )
}
