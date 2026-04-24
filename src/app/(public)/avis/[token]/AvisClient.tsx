'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props { avis: any; token: string }

export default function AvisClient({ avis, token }: Props) {
  const [note,        setNote]        = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(avis?.avis_laisse ?? false)

  if (!avis) return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <p className="text-red-600 font-semibold">Lien invalide ou expiré.</p>
        <Link href="/" className="btn-primary block mt-4 text-center">Retour à l&apos;accueil</Link>
      </div>
    </div>
  )

  const bien = avis.bien as any

  if (done) return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="font-black text-brun-nuit text-xl mb-2">Merci pour votre avis !</h1>
        <p className="text-brun-doux text-sm mb-6">Votre retour aide notre communauté à mieux choisir.</p>
        <Link href="/" className="btn-primary block text-center">Retour à l&apos;accueil</Link>
      </div>
    </div>
  )

  async function soumettre() {
    if (!note) return toast.error('Sélectionnez une note')
    setLoading(true)
    const r = await fetch('/api/avis/soumettre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, note, commentaire }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) setDone(true)
    else toast.error(d.error ?? 'Erreur')
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6">
        {bien?.photo_principale && (
          <div className="relative w-full h-32 rounded-xl overflow-hidden">
            <Image src={bien.photo_principale} alt={bien.titre ?? ''} fill className="object-cover" />
          </div>
        )}
        <div>
          <h1 className="font-black text-brun-nuit text-xl mb-1">Votre avis</h1>
          <p className="text-brun-doux text-sm">{bien?.titre} · {bien?.ville}</p>
        </div>

        {/* Étoiles */}
        <div>
          <p className="label-field mb-2">Note *</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setNote(n)} type="button"
                className="focus:outline-none">
                <Star className={`w-8 h-8 transition-colors ${n <= note ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-field">Commentaire (facultatif)</label>
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            maxLength={500}
            className="input-field resize-none"
            rows={4}
            placeholder="Décrivez votre expérience..."
          />
          <p className="text-xs text-brun-doux mt-1 text-right">{commentaire.length}/500</p>
        </div>

        <button onClick={soumettre} disabled={loading || !note} className="btn-primary w-full">
          {loading ? 'Envoi…' : 'Publier mon avis'}
        </button>
      </div>
    </div>
  )
}
