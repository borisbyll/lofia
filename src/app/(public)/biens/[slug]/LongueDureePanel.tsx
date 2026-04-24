'use client'
import Link from 'next/link'
import { Home } from 'lucide-react'
import { formatPrix } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Bien } from '@/types/immobilier'

export default function LongueDureePanel({ bien }: { bien: Bien }) {
  const { user } = useAuthStore()

  if (user?.id === bien.owner_id) {
    return (
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 text-center">
        <Home className="w-8 h-8 text-primary-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-primary-600">Vous êtes le propriétaire de ce bien</p>
        <p className="text-xs text-brun-doux mt-1">Retrouvez les demandes de visite dans Mon espace → Visites.</p>
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

      <div className="bg-or-pale rounded-xl p-3 text-xs text-brun-doux space-y-1">
        <p className="font-semibold text-brun-nuit">Comment ça marche ?</p>
        <p>1. Demandez une visite (5 000 FCFA)</p>
        <p>2. Visitez le bien avec un agent LOFIA</p>
        <p>3. Si intéressé → contrat + signature</p>
        <p>4. Premier loyer + caution à la signature</p>
      </div>

      <Link
        href={`/biens/${bien.slug}/demander-visite`}
        className="btn-primary w-full flex items-center justify-center gap-2 text-center"
      >
        Demander une visite — 5 000 FCFA
      </Link>

      <p className="text-[11px] text-center text-brun-doux">
        Processus sécurisé LOFIA. · Frais de visite non remboursables
      </p>
    </div>
  )
}
