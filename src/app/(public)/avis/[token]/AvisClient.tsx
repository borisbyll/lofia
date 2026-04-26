'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface Props { avis: any; token: string }

const CRITERES = [
  { key: 'proprete',     label: 'Propreté' },
  { key: 'conformite',   label: 'Conformité (bien conforme aux photos ?)' },
  { key: 'communication',label: 'Communication (réactivité du propriétaire)' },
  { key: 'emplacement',  label: 'Emplacement' },
  { key: 'rapport_qp',   label: 'Rapport qualité/prix' },
]

function EtoilesInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star className={`w-7 h-7 transition-colors ${n <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  )
}

export default function AvisClient({ avis, token }: Props) {
  const [note,        setNote]        = useState(0)
  const [criteres,   setCriteres]    = useState<Record<string, number>>({})
  const [commentaire, setCommentaire] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(avis?.avis_laisse ?? false)

  const isLocataire = avis?.type === 'locataire_note_proprio'

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
    if (!note) return toast.error('Sélectionnez une note globale')
    setLoading(true)
    const r = await fetch('/api/avis/soumettre-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        reservation_id: avis?.reservation_id,
        bien_id:        avis?.bien_id,
        proprietaire_id: avis?.proprietaire_id,
        type:           avis?.type ?? 'locataire_note_proprio',
        note,
        commentaire,
        criteres,
      }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) setDone(true)
    else toast.error(d.error ?? 'Erreur')
  }

  return (
    <div className="min-h-screen bg-cream py-8 px-4">
      <div className="max-w-md mx-auto space-y-5">

        {/* En-tête */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {bien?.photo_principale && (
            <div className="relative w-full h-32 rounded-xl overflow-hidden mb-4">
              <Image src={bien.photo_principale} alt={bien.titre ?? ''} fill className="object-cover" />
            </div>
          )}
          <h1 className="font-black text-brun-nuit text-xl mb-0.5">
            {isLocataire ? 'Comment s\'était votre séjour ?' : 'Notez votre locataire'}
          </h1>
          <p className="text-brun-doux text-sm">{bien?.titre} · {bien?.ville}</p>
          {avis.date_debut && avis.date_fin && (
            <p className="text-xs text-brun-doux mt-1">
              Du {formatDate(avis.date_debut)} au {formatDate(avis.date_fin)}
            </p>
          )}
        </div>

        {/* Note globale */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-2">
          <p className="font-bold text-brun-nuit text-sm">Note globale *</p>
          <EtoilesInput value={note} onChange={setNote} />
          {note > 0 && (
            <p className="text-xs text-brun-doux mt-1">
              {['', 'Décevant', 'Passable', 'Bien', 'Très bien', 'Excellent'][note]}
            </p>
          )}
        </div>

        {/* Critères détaillés (locataire uniquement, CDC §3.2) */}
        {isLocataire && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <p className="font-bold text-brun-nuit text-sm">Critères détaillés <span className="text-brun-doux font-normal">(facultatif)</span></p>
            {CRITERES.map(c => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-brun-nuit flex-1">{c.label}</span>
                <EtoilesInput
                  value={criteres[c.key] ?? 0}
                  onChange={n => setCriteres(prev => ({ ...prev, [c.key]: n }))}
                />
              </div>
            ))}
          </div>
        )}

        {/* Commentaire */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-2">
          <label className="label-field">Commentaire <span className="text-brun-doux font-normal">(facultatif)</span></label>
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            maxLength={500}
            className="input-field resize-none"
            rows={4}
            placeholder="Décrivez votre expérience..."
          />
          <p className="text-xs text-brun-doux text-right">{commentaire.length}/500</p>
        </div>

        <button onClick={soumettre} disabled={loading || !note} className="btn btn-primary w-full justify-center">
          {loading ? 'Envoi…' : 'Publier mon avis'}
        </button>
      </div>
    </div>
  )
}
