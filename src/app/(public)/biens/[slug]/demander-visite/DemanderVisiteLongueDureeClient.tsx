'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, Send, ShieldCheck, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix } from '@/lib/utils'
import { monetisation } from '@/lib/config/monetisation'

interface Props {
  bien:    any
  userId:  string
  profile: any
}

export default function DemanderVisiteLongueDureeClient({ bien, userId, profile }: Props) {
  const router = useRouter()
  const [nom,     setNom]     = useState(profile?.nom   ?? '')
  const [tel,     setTel]     = useState(profile?.phone ?? '')
  const [email,   setEmail]   = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState<string | null>(null)

  const frais = monetisation.longue_duree.frais_visite

  async function soumettre() {
    if (!nom.trim()) return toast.error('Votre nom est requis')
    if (!tel.trim()) return toast.error('Votre téléphone est requis')
    setLoading(true)
    const r = await fetch('/api/longue-duree/demander-visite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bien_id: bien.id, nom, telephone: tel, email, message }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.paiement_url) {
      window.location.href = d.paiement_url
    } else if (d.reference) {
      setDone(d.reference)
    } else {
      toast.error(d.error ?? 'Erreur')
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="font-black text-brun-nuit text-xl mb-2">Demande envoyée !</h1>
          <p className="text-brun-doux text-sm mb-2">Référence : <span className="font-mono font-black text-primary-500">{done}</span></p>
          <p className="text-brun-doux text-sm mb-6">Notre équipe vous contactera sous 24h pour organiser la visite.</p>
          <Link href="/mon-espace/locations" className="btn-primary block text-center">Suivre mon dossier</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="wrap py-8 max-w-xl mx-auto space-y-6">
        {/* Bien */}
        <div className="dashboard-card flex gap-4">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-or-pale">
            {bien.photo_principale && <Image src={bien.photo_principale} alt={bien.titre} fill className="object-cover" />}
          </div>
          <div>
            <h2 className="font-black text-brun-nuit">{bien.titre}</h2>
            <p className="text-sm text-brun-doux">{[bien.quartier, bien.ville].filter(Boolean).join(', ')}</p>
            <p className="prix">{formatPrix(bien.prix)}<span className="text-xs font-normal text-brun-doux ml-1">/mois</span></p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="dashboard-card space-y-4">
          <h1 className="font-black text-brun-nuit text-lg flex items-center gap-2">
            <Home className="w-5 h-5 text-primary-500" /> Demander une visite
          </h1>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Nom complet *</label>
              <input value={nom} onChange={e => setNom(e.target.value)} className="input-field" placeholder="Votre nom" />
            </div>
            <div>
              <label className="label-field">Téléphone *</label>
              <input value={tel} onChange={e => setTel(e.target.value)} className="input-field" placeholder="+228 XX XX XX XX" />
            </div>
          </div>
          <div>
            <label className="label-field">Email (facultatif)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="votre@email.com" />
          </div>
          <div>
            <label className="label-field">Message (facultatif)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="input-field resize-none" rows={3} placeholder="Présentez-vous, précisez votre situation..." />
          </div>
        </div>

        {/* Récapitulatif frais */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Frais de visite : {formatPrix(frais)}</p>
              <p className="text-xs text-amber-700 mt-0.5">Ces frais couvrent le déplacement de notre agent terrain. <strong>Ils ne sont pas remboursables.</strong></p>
            </div>
          </div>
        </div>

        <button onClick={soumettre} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          {loading ? 'Traitement…' : `Payer ${formatPrix(frais)} et envoyer la demande`}
        </button>
        <p className="text-xs text-center text-brun-doux">Paiement sécurisé via FedaPay (Flooz / T-Money / Wave / CB)</p>
      </div>
    </div>
  )
}
