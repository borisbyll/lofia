'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, MapPin, ShieldCheck, Loader2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import CalendrierDisponibilite from '@/components/reservations/CalendrierDisponibilite'

interface Props {
  bien: {
    id: string; titre: string; prix: number; photo_principale: string | null
    ville: string; quartier: string | null; adresse: string | null; slug: string
    proprietaire: any
  }
}

export default function ReserverClient({ bien }: Props) {
  const { user } = useAuthStore()
  const router   = useRouter()
  const [selection, setSelection] = useState<{ dateArrivee: string; dateDepart: string; nbNuits: number; total: number } | null>(null)
  const [loading,   setLoading]   = useState(false)

  const handleReserver = async () => {
    if (!user) { toast.error('Connectez-vous pour réserver'); router.push(`/connexion?next=/biens/${bien.slug}/reserver`); return }
    if (!selection) return
    setLoading(true)
    try {
      const res = await fetch('/api/reservations/creer-instantanee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bien_id: bien.id, date_arrivee: selection.dateArrivee, date_depart: selection.dateDepart }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      window.location.href = data.paiement_url
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream py-6 px-4">
      <div className="max-w-2xl mx-auto">

        <Link href={`/biens/${bien.slug}`} className="flex items-center gap-2 text-sm font-semibold mb-6" style={{ color: '#8B1A2E' }}>
          <ArrowLeft size={16} /> Retour à l&apos;annonce
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <Zap size={20} className="text-accent-500" />
          <h1 className="text-xl font-black" style={{ color: '#1a0a00' }}>Réservation instantanée</h1>
        </div>
        <p className="text-sm mb-2" style={{ color: '#7a5c3a' }}>{bien.titre}</p>
        <p className="text-xs text-brun-doux bg-accent-50 border border-accent-200 rounded-xl px-3 py-2 mb-4">
          ⚡ Ce bien est confirmé <strong>immédiatement</strong> après paiement. L&apos;adresse et le contact du propriétaire vous seront débloqués dès confirmation.
        </p>

        {/* Aperçu bien */}
        <div className="bg-white rounded-2xl border border-primary-50 p-4 flex gap-4 mb-6">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
            {bien.photo_principale
              ? <Image src={bien.photo_principale} alt={bien.titre} fill className="object-cover" sizes="80px" />
              : <div className="w-full h-full" style={{ background: '#FAE8EC' }} />
            }
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: '#1a0a00' }}>{bien.titre}</p>
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#7a5c3a' }}>
              <MapPin size={10} />{[bien.quartier, bien.ville].filter(Boolean).join(', ')}
            </p>
            {bien.proprietaire?.identite_verifiee && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#2D6A4F' }}>
                <ShieldCheck size={10} /> Propriétaire vérifié
              </p>
            )}
            <p className="prix text-sm mt-1">{formatPrix(bien.prix)}<span className="text-xs font-normal ml-1" style={{ color: '#7a5c3a' }}>/nuit</span></p>
          </div>
        </div>

        {/* Calendrier */}
        <h2 className="font-bold text-sm mb-3" style={{ color: '#1a0a00' }}>Choisissez vos dates</h2>
        <CalendrierDisponibilite
          bienId={bien.id}
          prixNuit={bien.prix}
          onSelect={(da, dd, nb, total) => setSelection({ dateArrivee: da, dateDepart: dd, nbNuits: nb, total })}
        />

        {/* Récapitulatif */}
        {selection && (
          <div className="bg-white rounded-2xl border border-primary-50 p-5 mt-4">
            <h3 className="font-bold text-sm mb-3" style={{ color: '#1a0a00' }}>Récapitulatif</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: '#7a5c3a' }}>{formatPrix(bien.prix)} × {selection.nbNuits} nuit{selection.nbNuits > 1 ? 's' : ''}</span>
                <span className="font-semibold" style={{ color: '#1a0a00' }}>{formatPrix(selection.total)}</span>
              </div>
              <div className="h-px my-2" style={{ background: '#FAE8EC' }} />
              <div className="flex justify-between font-black">
                <span style={{ color: '#1a0a00' }}>Total</span>
                <span className="prix">{formatPrix(selection.total)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleReserver}
          disabled={!selection || loading}
          className="btn btn-primary w-full mt-4 text-base"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin mr-2" /> Préparation…</>
            : selection ? `Réserver et payer ${formatPrix(selection.total)}` : 'Sélectionnez des dates'
          }
        </button>

        <p className="text-xs text-center mt-3" style={{ color: '#7a5c3a' }}>
          🔒 Paiement 100% sécurisé via FedaPay · Flooz · T-Money · Wave · CB
        </p>
      </div>
    </div>
  )
}
