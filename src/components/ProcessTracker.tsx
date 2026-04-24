'use client'

import { CheckCircle2, Clock, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Etape {
  id:      number
  label:   string
  detail?: string
  statuts_franchis: string[]
}

export const ETAPES_LONGUE_DUREE: Etape[] = [
  { id: 1, label: 'Demande de visite reçue',  statuts_franchis: ['demande_recue','visite_planifiee','visite_effectuee','locataire_interesse','locataire_non_interesse','proprietaire_accepte','proprietaire_refuse','contrat_genere','en_attente_signatures','signatures_completes','en_attente_paiement','paiement_recu','finalise'] },
  { id: 2, label: 'Visite planifiée',          statuts_franchis: ['visite_planifiee','visite_effectuee','locataire_interesse','locataire_non_interesse','proprietaire_accepte','proprietaire_refuse','contrat_genere','en_attente_signatures','signatures_completes','en_attente_paiement','paiement_recu','finalise'] },
  { id: 3, label: 'Visite effectuée',          statuts_franchis: ['visite_effectuee','locataire_interesse','locataire_non_interesse','proprietaire_accepte','proprietaire_refuse','contrat_genere','en_attente_signatures','signatures_completes','en_attente_paiement','paiement_recu','finalise'] },
  { id: 4, label: 'Décision du locataire',     statuts_franchis: ['locataire_interesse','proprietaire_accepte','proprietaire_refuse','contrat_genere','en_attente_signatures','signatures_completes','en_attente_paiement','paiement_recu','finalise'] },
  { id: 5, label: 'Décision du propriétaire', statuts_franchis: ['proprietaire_accepte','contrat_genere','en_attente_signatures','signatures_completes','en_attente_paiement','paiement_recu','finalise'] },
  { id: 6, label: 'Contrat généré',            statuts_franchis: ['contrat_genere','en_attente_signatures','signatures_completes','en_attente_paiement','paiement_recu','finalise'] },
  { id: 7, label: 'Signatures',                statuts_franchis: ['signatures_completes','en_attente_paiement','paiement_recu','finalise'] },
  { id: 8, label: 'Premier paiement',          statuts_franchis: ['paiement_recu','finalise'] },
  { id: 9, label: 'Dossier finalisé',          statuts_franchis: ['finalise'] },
]

export const ETAPES_VENTE: Etape[] = [
  { id: 1, label: 'Demande de visite reçue',  statuts_franchis: ['demande_recue','visite_planifiee','visite_effectuee','acheteur_interesse','acheteur_non_interesse','vendeur_accepte','vendeur_refuse','promesse_generee','en_attente_signatures','signatures_completes','en_attente_virement','virement_confirme','vendu'] },
  { id: 2, label: 'Visite planifiée',          statuts_franchis: ['visite_planifiee','visite_effectuee','acheteur_interesse','acheteur_non_interesse','vendeur_accepte','vendeur_refuse','promesse_generee','en_attente_signatures','signatures_completes','en_attente_virement','virement_confirme','vendu'] },
  { id: 3, label: 'Visite effectuée',          statuts_franchis: ['visite_effectuee','acheteur_interesse','acheteur_non_interesse','vendeur_accepte','vendeur_refuse','promesse_generee','en_attente_signatures','signatures_completes','en_attente_virement','virement_confirme','vendu'] },
  { id: 4, label: "Décision de l'acheteur",   statuts_franchis: ['acheteur_interesse','vendeur_accepte','vendeur_refuse','promesse_generee','en_attente_signatures','signatures_completes','en_attente_virement','virement_confirme','vendu'] },
  { id: 5, label: 'Décision du vendeur',       statuts_franchis: ['vendeur_accepte','promesse_generee','en_attente_signatures','signatures_completes','en_attente_virement','virement_confirme','vendu'] },
  { id: 6, label: 'Promesse de vente',         statuts_franchis: ['promesse_generee','en_attente_signatures','signatures_completes','en_attente_virement','virement_confirme','vendu'] },
  { id: 7, label: 'Signatures',                statuts_franchis: ['signatures_completes','en_attente_virement','virement_confirme','vendu'] },
  { id: 8, label: 'Virement bancaire',         statuts_franchis: ['virement_confirme','vendu'] },
  { id: 9, label: 'Vente finalisée',           statuts_franchis: ['vendu'] },
]

interface ProcessTrackerProps {
  etapes:    Etape[]
  statut:    string
  action?:   React.ReactNode  // bouton d'action contextuel (étape en cours)
  className?: string
}

export default function ProcessTracker({ etapes, statut, action, className }: ProcessTrackerProps) {
  const etapeEnCours = etapes.find(e => !e.statuts_franchis.includes(statut))

  return (
    <div className={cn('space-y-1', className)}>
      {etapes.map((etape, idx) => {
        const franchie   = etape.statuts_franchis.includes(statut)
        const enCours    = etapeEnCours?.id === etape.id
        const verrouillee = !franchie && !enCours
        const estDerniere = idx === etapes.length - 1

        return (
          <div key={etape.id} className="flex gap-3">
            {/* Colonne gauche : icône + trait vertical */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-black border-2 transition-all',
                franchie    && 'bg-green-500 border-green-500 text-white',
                enCours     && 'bg-primary-500 border-primary-500 text-white animate-pulse',
                verrouillee && 'bg-gray-100 border-gray-200 text-gray-400',
              )}>
                {franchie    ? <CheckCircle2 size={16} /> :
                 enCours     ? <Clock size={16} /> :
                               <Lock size={14} />}
              </div>
              {!estDerniere && (
                <div className={cn(
                  'w-0.5 flex-1 min-h-[20px] mt-1',
                  franchie ? 'bg-green-300' : 'bg-gray-200'
                )} />
              )}
            </div>

            {/* Colonne droite : label + action */}
            <div className={cn('pb-4 flex-1 min-w-0', estDerniere && 'pb-0')}>
              <p className={cn(
                'text-sm font-semibold leading-tight pt-1',
                franchie    && 'text-green-700',
                enCours     && 'text-primary-600',
                verrouillee && 'text-gray-400',
              )}>
                {etape.label}
              </p>
              {etape.detail && (
                <p className="text-xs text-brun-doux mt-0.5">{etape.detail}</p>
              )}
              {enCours && action && (
                <div className="mt-2">{action}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
