'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { MOTIFS_SIGNALEMENT } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface Props { bienId: string; onClose: () => void }

export default function SignalementModal({ bienId, onClose }: Props) {
  const { user } = useAuthStore()
  const [raison,  setRaison]  = useState('')
  const [detail,  setDetail]  = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { toast.error('Connectez-vous pour signaler'); return }
    if (!raison) { toast.error('Sélectionnez un motif'); return }
    setLoading(true)
    try {
      await supabase.from('signalements').insert({ bien_id: bienId, user_id: user.id, raison, detail })
      toast.success('Signalement envoyé. Merci !')
      onClose()
    } catch {
      toast.error('Erreur lors du signalement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-black text-gray-900">Signaler l'annonce</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label-field">Motif *</label>
            <div className="space-y-2">
              {MOTIFS_SIGNALEMENT.map(m => (
                <label key={m} className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                  raison === m ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300')}>
                  <input type="radio" name="raison" value={m} checked={raison === m} onChange={() => setRaison(m)} className="accent-primary-500" />
                  <span className="text-sm font-medium text-gray-700">{m}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label-field">Détails (optionnel)</label>
            <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3}
              placeholder="Précisez votre signalement…" className="input-field resize-none" />
          </div>
          <button type="submit" disabled={loading || !raison} className="btn btn-danger w-full justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Envoyer le signalement
          </button>
        </form>
      </div>
    </div>
  )
}
