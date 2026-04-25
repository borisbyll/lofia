'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Loader2, Shield, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix, formatDate } from '@/lib/utils'
import TimerExpiration from '@/components/locataires/TimerExpiration'
import { useRouter } from 'next/navigation'

interface Props { demande: any }

export default function PayerDemandeClient({ demande }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [expire, setExpire] = useState(false)

  const bien = Array.isArray(demande.biens) ? demande.biens[0] : demande.biens
  const photo = bien?.photo_principale ?? bien?.photos?.[0] ?? null
  const tentativesRestantes = 3 - (demande.tentatives_paiement ?? 0)

  const handlePayer = async () => {
    if (expire) { toast.error('Le lien de paiement a expiré.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/reservations/payer-apres-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demande_id: demande.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erreur paiement')
        if (res.status === 400) router.push('/mon-espace/reservations')
        return
      }
      // Rediriger vers FedaPay
      window.location.href = data.payment_url
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Photo */}
          <div className="relative h-40 bg-or-pale">
            {photo && <Image src={photo} alt={bien?.titre ?? ''} fill className="object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                ⚡ Confirmation reçue
              </span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <h1 className="text-xl font-black text-brun-nuit">Finalisez votre réservation</h1>
              <p className="text-brun-doux font-semibold mt-0.5">{bien?.titre}</p>
            </div>

            {/* Timer expiration 2h */}
            <div className={`rounded-xl border p-3 ${expire ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              {expire ? (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle size={16} />
                  <p className="text-sm font-semibold">Ce lien de paiement a expiré.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-amber-700 font-semibold mb-1">⏳ Lien valable encore</p>
                  <TimerExpiration
                    expire_at={demande.lien_paiement_expire_at}
                    onExpire={() => setExpire(true)}
                  />
                  <p className="text-xs text-amber-600 mt-1">Passé ce délai, les dates seront libérées.</p>
                </>
              )}
            </div>

            {/* Détail paiement */}
            <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
              <h2 className="font-semibold text-brun-nuit text-sm">Détail de votre paiement</h2>
              <div className="flex justify-between text-brun-doux">
                <span>Du {formatDate(demande.date_arrivee)} au {formatDate(demande.date_depart)}</span>
                <span>{demande.nb_nuits} nuit{demande.nb_nuits > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between font-black text-base">
                <span className="text-brun-nuit">Total</span>
                <span className="text-primary-500">{formatPrix(demande.montant_total)}</span>
              </div>
            </div>

            {/* Modes paiement */}
            <div className="flex items-center gap-2 flex-wrap">
              {['🟠 Flooz', '🔵 T-Money', '💚 Wave', '💳 CB'].map(m => (
                <span key={m} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg font-medium">{m}</span>
              ))}
            </div>

            {tentativesRestantes < 3 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2">
                ⚠️ Vous avez {tentativesRestantes} tentative{tentativesRestantes > 1 ? 's' : ''} restante{tentativesRestantes > 1 ? 's' : ''}.
              </p>
            )}

            <button
              onClick={handlePayer}
              disabled={loading || expire}
              className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50 text-base py-3"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Redirection vers FedaPay…' : `Payer ${formatPrix(demande.montant_total)}`}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Shield size={12} />
              Paiement 100% sécurisé via FedaPay
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
