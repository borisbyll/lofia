'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Props { dossier: any; token: string; reponseInitiale?: string }

export default function DecisionLocataireClient({ dossier, token, reponseInitiale }: Props) {
  const [loading,  setLoading]  = useState(false)
  const [resultat, setResultat] = useState<'interesse' | 'non_interesse' | null>(
    dossier?.locataire_interesse === true  ? 'interesse' :
    dossier?.locataire_interesse === false ? 'non_interesse' : null
  )

  if (!dossier) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="font-semibold text-brun-nuit">Lien introuvable ou expiré.</p>
          <Link href="/location" className="btn-primary block mt-4 text-center">Voir d&apos;autres biens</Link>
        </div>
      </div>
    )
  }

  const bien = dossier.bien as any

  async function repondre(reponse: 'oui' | 'non') {
    setLoading(true)
    const r = await fetch(`/api/longue-duree/decision-locataire?token=${token}&reponse=${reponse}`)
    const d = await r.json()
    setLoading(false)
    if (d.success) {
      setResultat(reponse === 'oui' ? 'interesse' : 'non_interesse')
    } else {
      toast.error(d.error ?? 'Erreur')
    }
  }

  if (resultat === 'interesse') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="font-black text-brun-nuit text-xl mb-2">Parfait !</h1>
          <p className="text-brun-doux text-sm mb-6">Nous consultons le propriétaire. Vous recevrez une réponse sous 24h.</p>
          <Link href="/mon-espace/locations" className="btn-primary block text-center">Suivre mon dossier</Link>
        </div>
      </div>
    )
  }

  if (resultat === 'non_interesse') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-brun-nuit font-semibold mb-4">Noté. Bonne continuation !</p>
          <Link href="/location" className="btn-outline block text-center">Voir d&apos;autres biens</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6">
        {bien?.photo_principale && (
          <div className="relative w-full h-40 rounded-xl overflow-hidden">
            <Image src={bien.photo_principale} alt={bien.titre ?? ''} fill className="object-cover" />
          </div>
        )}
        <div className="text-center">
          <h1 className="font-black text-brun-nuit text-xl mb-1">Êtes-vous intéressé ?</h1>
          <p className="text-brun-doux text-sm">{bien?.titre} · {bien?.ville}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => repondre('oui')} disabled={loading}
            className="btn-primary flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Oui, je suis intéressé
          </button>
          <button onClick={() => repondre('non')} disabled={loading}
            className="btn-outline flex items-center justify-center gap-2 text-gray-600 border-gray-300">
            <XCircle className="w-4 h-4" /> Non, merci
          </button>
        </div>
      </div>
    </div>
  )
}
