'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Bien } from '@/types/immobilier'

export default function LongueDureePanel({ bien }: { bien: Bien }) {
  const { user }    = useAuthStore()
  const router      = useRouter()
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const [codeVisite, setCode]   = useState<string | null>(null)

  async function demanderVisite() {
    if (!user) { toast.error('Connectez-vous pour demander une visite'); router.push('/connexion'); return }
    setLoading(true)
    const r = await fetch('/api/longue-duree/demander-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bien_id: bien.id, message }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.code_visite) {
      setCode(d.code_visite)
      toast.success(d.already_exists ? 'Demande déjà envoyée' : 'Demande envoyée !')
    } else {
      toast.error(d.error ?? 'Erreur')
    }
  }

  if (codeVisite) {
    return (
      <div className="bg-white border-2 border-green-500 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <p className="font-bold">Demande envoyée !</p>
        </div>
        <p className="text-sm text-brun-doux">Votre code de visite :</p>
        <p className="font-mono font-black text-xl text-primary-500 text-center bg-primary-50 rounded-xl py-3">{codeVisite}</p>
        <p className="text-xs text-brun-doux text-center">Conservez ce code. Le propriétaire va vous contacter pour confirmer la visite.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-primary-500 rounded-2xl p-5 space-y-4">
      <div>
        <p className="font-black text-brun-nuit text-lg">
          <span className="prix">{formatPrix(bien.prix)}</span>
          <span className="text-sm font-normal text-brun-doux ml-1">/mois</span>
        </p>
        <p className="text-xs text-brun-doux mt-1 flex items-center gap-1">
          <Home className="w-3 h-3" /> Location longue durée
        </p>
      </div>

      <div>
        <label className="label-field text-xs">Message au propriétaire (facultatif)</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="input-field resize-none text-sm"
          rows={3}
          placeholder="Présentez-vous, précisez votre situation..."
        />
      </div>

      <button onClick={demanderVisite} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        <Send className="w-4 h-4" />
        {loading ? 'Envoi…' : 'Demander une visite'}
      </button>

      <p className="text-[11px] text-center text-brun-doux">
        Un code de visite vous sera attribué. Aucun paiement requis à cette étape.
      </p>
    </div>
  )
}
