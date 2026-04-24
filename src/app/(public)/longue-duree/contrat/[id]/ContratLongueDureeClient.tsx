'use client'
import Link from 'next/link'
import { CheckCircle2, Clock, Download, FileText } from 'lucide-react'
import { formatPrix, formatDate } from '@/lib/utils'

interface Props { contrat: any; userId: string }

export default function ContratLongueDureeClient({ contrat, userId }: Props) {
  const isLocataire    = contrat.locataire_id    === userId
  const isProprietaire = contrat.proprietaire_id === userId
  const jaiSigne       = isLocataire ? contrat.signe_par_locataire : contrat.signe_par_proprietaire
  const monToken       = isLocataire ? contrat.token_signature_locataire : contrat.token_signature_proprietaire

  const statutLabel: Record<string, string> = {
    brouillon:             'Brouillon',
    en_attente_signatures: 'En attente de signatures',
    signatures_completes:  'Signatures complètes',
    en_attente_paiement:   'En attente de paiement',
    paiement_recu:         'Paiement reçu',
    finalise:              'Finalisé',
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="wrap py-8 max-w-2xl mx-auto space-y-6">
        <div className="dashboard-card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-black text-brun-nuit text-xl flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" /> {contrat.numero_contrat}
              </h1>
              <p className="text-sm text-brun-doux">{(contrat.bien as any)?.titre} · {(contrat.bien as any)?.ville}</p>
            </div>
            <span className={`badge-${['finalise','paiement_recu','signatures_completes'].includes(contrat.statut) ? 'success' : 'en-attente'} shrink-0`}>
              {statutLabel[contrat.statut] ?? contrat.statut}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-brun-doux text-xs">Loyer mensuel</p><p className="prix font-black">{formatPrix(contrat.loyer_mensuel)}</p></div>
            <div><p className="text-brun-doux text-xs">Durée</p><p className="font-semibold">{contrat.duree_mois} mois</p></div>
            <div><p className="text-brun-doux text-xs">Début</p><p className="font-semibold">{formatDate(contrat.date_debut)}</p></div>
            {contrat.total_premier_paiement && <div><p className="text-brun-doux text-xs">Premier paiement</p><p className="font-semibold text-amber-700">{formatPrix(contrat.total_premier_paiement)}</p></div>}
          </div>
        </div>

        {/* Signatures */}
        <div className="dashboard-card space-y-3">
          <h2 className="font-semibold text-brun-nuit">Signatures</h2>
          {[
            { label: 'Propriétaire', nom: (contrat.proprietaire as any)?.nom, signe: contrat.signe_par_proprietaire, date: contrat.date_signature_proprietaire },
            { label: 'Locataire',    nom: (contrat.locataire as any)?.nom,    signe: contrat.signe_par_locataire,    date: contrat.date_signature_locataire },
          ].map(p => (
            <div key={p.label} className={`flex items-center gap-2 text-sm ${p.signe ? 'text-green-600' : 'text-brun-doux'}`}>
              {p.signe ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {p.label} : {p.nom}
              {p.date && <span className="text-xs ml-1">({formatDate(p.date)})</span>}
            </div>
          ))}
          {!jaiSigne && monToken && contrat.statut === 'en_attente_signatures' && (
            <Link href={`/longue-duree/signer/${monToken}`} className="btn-primary block text-center mt-2">
              Signer le contrat
            </Link>
          )}
        </div>

        {/* Paiement */}
        {isLocataire && contrat.statut === 'signatures_completes' && !contrat.paiement_effectue && (
          <Link href={`/longue-duree/payer/${contrat.id}`} className="btn-accent block text-center">
            Effectuer le premier paiement — {contrat.total_premier_paiement ? formatPrix(contrat.total_premier_paiement) : ''}
          </Link>
        )}

        {/* PDF */}
        {contrat.pdf_url && (
          <a href={`/api/pdf-download?url=${encodeURIComponent(contrat.pdf_url)}&filename=${encodeURIComponent(`contrat-${contrat.numero_contrat}.pdf`)}`}
            className="btn-outline flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Télécharger le contrat PDF
          </a>
        )}
      </div>
    </div>
  )
}
