'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, FileText, Phone, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatPrix, formatDate } from '@/lib/utils'
import ProcessTracker, { ETAPES_LONGUE_DUREE } from '@/components/ProcessTracker'

interface Props { dossier: any; userId: string }

export default function DossierLocationClient({ dossier, userId }: Props) {
  const router     = useRouter()
  const bien       = dossier.bien as any
  const isLocataire    = dossier.locataire_id    === userId
  const isProprietaire = dossier.proprietaire_id === userId
  const autre          = isProprietaire ? dossier.locataire as any : dossier.proprietaire as any
  const contrat        = Array.isArray(dossier.contrat) ? dossier.contrat[0] : dossier.contrat

  // Action contextuelle selon rôle + statut
  let action: React.ReactNode = null
  if (isLocataire) {
    if (dossier.statut === 'visite_effectuee' && dossier.token_decision_locataire) {
      action = <Link href={`/longue-duree/decision/${dossier.token_decision_locataire}`} className="btn-primary text-sm px-4 py-2">Donner ma décision</Link>
    } else if (contrat && !contrat.paiement_effectue && dossier.statut === 'signatures_completes') {
      action = <Link href={`/longue-duree/payer/${contrat.id}`} className="btn-accent text-sm px-4 py-2">Effectuer le paiement</Link>
    }
  }
  if (isProprietaire) {
    if (dossier.statut === 'locataire_interesse') {
      action = <span className="text-xs text-brun-doux">En attente de décision propriétaire — contactez le modérateur.</span>
    }
  }

  return (
    <div className="p-4 md:p-6 pb-nav max-w-2xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-brun-doux hover:text-primary-500 text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      {/* Bien */}
      <div className="dashboard-card flex gap-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-or-pale">
          {bien?.photo_principale && <Image src={bien.photo_principale} alt={bien.titre} fill className="object-cover" sizes="80px" />}
        </div>
        <div>
          <h1 className="font-black text-brun-nuit">{bien?.titre}</h1>
          <p className="text-sm text-brun-doux">{bien?.ville}</p>
          <p className="prix">{formatPrix(bien?.prix)}<span className="text-xs font-normal text-brun-doux ml-1">/mois</span></p>
        </div>
      </div>

      {/* Référence */}
      <div className="dashboard-card">
        <p className="text-xs text-brun-doux mb-1">Référence dossier</p>
        <p className="font-mono font-black text-lg text-primary-500">{dossier.reference}</p>
        <p className="text-xs text-brun-doux mt-1">Ouvert le {formatDate(dossier.created_at)}</p>
      </div>

      {/* Interlocuteur */}
      <div className="dashboard-card space-y-3">
        <h2 className="font-semibold text-brun-nuit flex items-center gap-2">
          <User className="w-4 h-4" /> {isProprietaire ? 'Locataire' : 'Propriétaire'}
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-black text-primary-500 shrink-0">
            {autre?.nom?.charAt(0) ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-brun-nuit">{autre?.nom}</p>
            {autre?.phone && (
              <a href={`tel:${autre.phone}`} className="flex items-center gap-1 text-sm text-primary-500 hover:underline">
                <Phone className="w-3 h-3" /> {autre.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tracker */}
      <div className="dashboard-card">
        <h2 className="font-semibold text-brun-nuit mb-4">Avancement du dossier</h2>
        <ProcessTracker etapes={ETAPES_LONGUE_DUREE} statut={dossier.statut} action={action} />
      </div>

      {/* Contrat existant */}
      {contrat && (
        <Link href={`/longue-duree/contrat/${contrat.id}`}
          className="dashboard-card flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary-400" />
            <div>
              <p className="font-semibold text-brun-nuit">Contrat {contrat.numero_contrat}</p>
              <p className="text-sm text-brun-doux capitalize">{contrat.statut?.replace(/_/g,' ')}</p>
            </div>
          </div>
          <span className="btn-outline text-sm px-3 py-1.5">Voir</span>
        </Link>
      )}
    </div>
  )
}
