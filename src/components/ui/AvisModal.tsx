'use client'

import { useState } from 'react'
import { Star, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

interface Props {
  reservationId: string
  bienId: string
  bienTitre: string
  proprietaireId: string
  onClose: () => void
  onSuccess: () => void
}

export default function AvisModal({ reservationId, bienId, bienTitre, proprietaireId, onClose, onSuccess }: Props) {
  const { user } = useAuthStore()
  const [note,         setNote]         = useState(0)
  const [survol,       setSurvol]       = useState(0)
  const [commentaire,  setCommentaire]  = useState('')
  const [loading,      setLoading]      = useState(false)

  const labels = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user)        { toast.error('Vous devez être connecté'); return }
    if (note === 0)   { toast.error('Choisissez une note'); return }

    setLoading(true)
    try {
      const { error } = await supabase.from('avis').insert({
        reservation_id:  reservationId,
        bien_id:         bienId,
        auteur_id:       user.id,
        proprietaire_id: proprietaireId,
        sujet_id:        proprietaireId,
        type:            'locataire_note_proprio',
        note,
        commentaire:     commentaire.trim() || null,
      })

      if (error) {
        if (error.code === '23505') toast.error('Vous avez déjà laissé un avis pour cette réservation')
        else throw error
        return
      }

      toast.success('Avis publié, merci !')
      onSuccess()
      onClose()
    } catch {
      toast.error('Erreur lors de la publication')
    } finally {
      setLoading(false)
    }
  }

  const noteActive = survol || note

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 animate-fade-in"
        style={{ boxShadow: '0 24px 64px rgba(139,26,46,.18)' }}
      >
        {/* Ligne dorée haut */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: '#D4A832' }} />

        {/* Header */}
        <div className="flex items-start justify-between mb-5 mt-1">
          <div>
            <h2 className="text-lg font-black" style={{ color: '#1a0a00' }}>Laisser un avis</h2>
            <p className="text-sm mt-0.5 truncate max-w-[260px]" style={{ color: '#7a5c3a' }}>
              {bienTitre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-primary-50"
            style={{ color: '#7a5c3a' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Étoiles */}
          <div className="text-center">
            <p className="text-sm font-semibold mb-3" style={{ color: '#1a0a00' }}>
              Votre note globale *
            </p>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setSurvol(n)}
                  onMouseLeave={() => setSurvol(0)}
                  onClick={() => setNote(n)}
                  className="transition-transform hover:scale-110"
                  style={{ minHeight: 'unset' }}
                >
                  <Star
                    size={32}
                    fill={n <= noteActive ? '#D4A832' : 'none'}
                    style={{ color: n <= noteActive ? '#D4A832' : '#d1d5db' }}
                  />
                </button>
              ))}
            </div>
            {noteActive > 0 && (
              <p className="text-sm font-semibold" style={{ color: '#D4A832' }}>
                {labels[noteActive]}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <label className="label-field">Commentaire (optionnel)</label>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              placeholder="Décrivez votre expérience…"
              rows={3}
              maxLength={500}
              className="input-field resize-none"
              style={{ minHeight: 'unset' }}
            />
            <p className="text-xs text-right mt-1" style={{ color: '#7a5c3a' }}>
              {commentaire.length}/500
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1 justify-center"
              style={{ color: '#7a5c3a' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || note === 0}
              className="btn btn-primary flex-1 justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Publication…' : 'Publier l\'avis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
