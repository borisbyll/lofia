'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, Clock } from 'lucide-react'
import { formatPrix } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import type { Bien } from '@/types/immobilier'

const TERMINAL_STATUTS_VT = ['acheteur_non_interesse', 'vendeur_refuse', 'expire', 'annule']

const STATUT_LABELS: Record<string, string> = {
  demande_recue:          'Demande reçue par LOFIA.',
  visite_planifiee:       'Visite planifiée',
  visite_effectuee:       'Visite effectuée',
  acheteur_interesse:     'Intérêt confirmé',
  vendeur_accepte:        'Vendeur a accepté',
  promesse_generee:       'Promesse en cours',
  en_attente_signatures:  'En attente de signatures',
  signatures_completes:   'Promesse signée',
  en_attente_virement:    'En attente du virement',
  virement_confirme:      'Virement confirmé',
  vendu:                  'Vente finalisée',
}

export default function VentePanel({ bien }: { bien: Bien }) {
  const { user } = useAuthStore()
  const [dossierStatut, setDossierStatut] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!user || user.id === bien.owner_id) return
    setChecking(true)
    supabase
      .from('dossiers_vente')
      .select('statut')
      .eq('bien_id', bien.id)
      .eq('acheteur_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setDossierStatut(data?.statut ?? null)
        setChecking(false)
      })
  }, [user, bien.id, bien.owner_id])

  if (user?.id === bien.owner_id) {
    return (
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 text-center">
        <Building2 className="w-8 h-8 text-primary-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-primary-600">Vous êtes le vendeur de ce bien</p>
        <p className="text-xs text-brun-doux mt-1">Retrouvez les demandes de visite dans Mon espace → Ventes.</p>
      </div>
    )
  }

  const isBlocked = dossierStatut !== null && !TERMINAL_STATUTS_VT.includes(dossierStatut)

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

      {isBlocked ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
            <Clock className="w-4 h-4 text-primary-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary-600">Demande en cours</p>
              <p className="text-[11px] text-brun-doux">{STATUT_LABELS[dossierStatut!] ?? dossierStatut}</p>
            </div>
          </div>
          <button disabled className="btn-primary w-full flex items-center justify-center gap-2 opacity-40 cursor-not-allowed">
            Demander une visite — Gratuit
          </button>
        </div>
      ) : (
        <Link
          href={user ? `/biens/${bien.slug}/demander-visite-vente` : `/connexion?next=/biens/${bien.slug}`}
          className={`btn-primary w-full flex items-center justify-center gap-2 text-center ${checking ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {checking ? 'Vérification…' : 'Demander une visite — Gratuit'}
        </Link>
      )}

      <p className="text-[11px] text-center text-brun-doux">
        Processus sécurisé LOFIA. — Visite → Promesse → Virement → Vente
      </p>
    </div>
  )
}
