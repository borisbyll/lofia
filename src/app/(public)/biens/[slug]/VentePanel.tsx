'use client'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { formatPrix } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Bien } from '@/types/immobilier'

export default function VentePanel({ bien }: { bien: Bien }) {
  const { user } = useAuthStore()

  if (user?.id === bien.owner_id) {
    return (
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 text-center">
        <Building2 className="w-8 h-8 text-primary-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-primary-600">Vous êtes le vendeur de ce bien</p>
        <p className="text-xs text-brun-doux mt-1">Retrouvez les demandes de visite dans Mon espace → Ventes.</p>
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

      <div className="bg-or-pale rounded-xl p-3 text-xs text-brun-doux space-y-1">
        <p className="font-semibold text-brun-nuit">Comment ça marche ?</p>
        <p>1. Demandez une visite (gratuit)</p>
        <p>2. Visitez le bien avec un agent LOFIA</p>
        <p>3. Si intéressé → promesse de vente</p>
        <p>4. Virement bancaire → vente finalisée</p>
      </div>

      <Link
        href={`/biens/${bien.slug}/demander-visite-vente`}
        className="btn-primary w-full flex items-center justify-center gap-2 text-center"
      >
        Demander une visite — Gratuit
      </Link>

      <p className="text-[11px] text-center text-brun-doux">
        Processus sécurisé LOFIA. — Visite → Promesse → Virement → Vente
      </p>
    </div>
  )
}
