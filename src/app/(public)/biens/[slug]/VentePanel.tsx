'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Bien } from '@/types/immobilier'

export default function VentePanel({ bien }: { bien: Bien }) {
  const { user }  = useAuthStore()
  const router    = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [codeVisite, setCode] = useState<string | null>(null)

  if (user?.id === bien.owner_id) {
    return (
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 text-center">
        <Building2 className="w-8 h-8 text-primary-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-primary-600">Vous êtes le vendeur de ce bien</p>
        <p className="text-xs text-brun-doux mt-1">Retrouvez les demandes de visite dans Mon espace → Ventes.</p>
      </div>
    )
  }

  async function demanderVisite() {
    if (!user) { toast.error('Connectez-vous pour demander une visite'); router.push('/connexion'); return }
    setLoading(true)
    const r = await fetch('/api/vente/demander-visite', {
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
          <p className="font-bold">Demande de visite envoyée !</p>
        </div>
        <p className="text-sm text-brun-doux">Votre code de visite :</p>
        <p className="font-mono font-black text-xl text-primary-500 text-center bg-primary-50 rounded-xl py-3">{codeVisite}</p>
        <p className="text-xs text-brun-doux text-center">Le vendeur va vous contacter. Suivez l&apos;avancement dans <strong>Mon espace → Ventes</strong>.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-primary-500 rounded-2xl p-5 space-y-4">
      <div>
        <p className="font-black text-brun-nuit text-lg">
          <span className="prix">{formatPrix(bien.prix)}</span>
        </p>
        <p className="text-xs text-brun-doux mt-1 flex items-center gap-1">
          <Building2 className="w-3 h-3" /> Bien en vente · {bien.type_bien}
        </p>
        {bien.prix_negociable && (
          <span className="inline-block mt-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">Prix négociable</span>
        )}
      </div>

      <div>
        <label className="label-field text-xs">Message au vendeur (facultatif)</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="input-field resize-none text-sm"
          rows={3}
          placeholder="Précisez votre projet d'achat, vos questions..."
        />
      </div>

      <button onClick={demanderVisite} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        <Send className="w-4 h-4" />
        {loading ? 'Envoi…' : 'Demander une visite'}
      </button>

      <p className="text-[11px] text-center text-brun-doux">
        Processus sécurisé LOFIA. — Visite → Offre → Promesse de vente → Signature
      </p>
    </div>
  )
}
