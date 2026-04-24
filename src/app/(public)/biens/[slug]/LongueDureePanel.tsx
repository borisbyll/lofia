'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Home, Clock, CheckCircle2 } from 'lucide-react'
import { formatPrix } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import type { Bien } from '@/types/immobilier'

const TERMINAL_STATUTS_LD = ['locataire_non_interesse', 'proprietaire_refuse', 'expire', 'annule']

const STATUT_LABELS: Record<string, string> = {
  demande_recue:        'Demande reçue par LOFIA.',
  visite_planifiee:     'Visite planifiée',
  visite_effectuee:     'Visite effectuée',
  locataire_interesse:  'Intérêt confirmé',
  proprietaire_accepte: 'Propriétaire a accepté',
  contrat_genere:       'Contrat en cours',
  en_attente_signatures:'En attente de signatures',
  signatures_completes: 'Contrat signé',
  en_attente_paiement:  'En attente de paiement',
  paiement_recu:        'Paiement reçu',
  finalise:             'Dossier finalisé',
}

export default function LongueDureePanel({ bien }: { bien: Bien }) {
  const { user } = useAuthStore()
  const [dossierStatut, setDossierStatut] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!user || user.id === bien.owner_id) return
    setChecking(true)
    supabase
      .from('dossiers_longue_duree')
      .select('statut')
      .eq('bien_id', bien.id)
      .eq('locataire_id', user.id)
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
        <Home className="w-8 h-8 text-primary-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-primary-600">Vous êtes le propriétaire de ce bien</p>
        <p className="text-xs text-brun-doux mt-1">Retrouvez les demandes de visite dans Mon espace → Visites.</p>
      </div>
    )
  }

  const isBlocked = dossierStatut !== null && !TERMINAL_STATUTS_LD.includes(dossierStatut)

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
            Demander une visite — 5 000 FCFA
          </button>
        </div>
      ) : (
        <Link
          href={user ? `/biens/${bien.slug}/demander-visite` : `/connexion?next=/biens/${bien.slug}`}
          className={`btn-primary w-full flex items-center justify-center gap-2 text-center ${checking ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {checking ? 'Vérification…' : 'Demander une visite — 5 000 FCFA'}
        </Link>
      )}

      <p className="text-[11px] text-center text-brun-doux">
        Processus sécurisé LOFIA. · Frais de visite non remboursables
      </p>
    </div>
  )
}
