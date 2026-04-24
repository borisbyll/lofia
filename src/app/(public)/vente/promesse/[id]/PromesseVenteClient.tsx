'use client'
import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, Download, FileText } from 'lucide-react'
import { formatPrix, formatDate } from '@/lib/utils'

interface Props { promesse: any; userId: string }

export default function PromesseVenteClient({ promesse, userId }: Props) {
  const router = useRouter()
  const isVendeur  = promesse.vendeur_id === userId
  const isAcheteur = promesse.acheteur_id === userId

  const jaiSigne  = isVendeur ? promesse.signe_par_vendeur  : promesse.signe_par_acheteur
  const monToken  = isVendeur ? promesse.token_signature_vendeur : promesse.token_signature_acheteur
  const partie    = isVendeur ? 'vendeur' : 'acheteur'
  const autreNom  = isVendeur ? (promesse.acheteur as any)?.nom : (promesse.vendeur as any)?.nom

  const statutLabel: Record<string, string> = {
    brouillon:              'Brouillon',
    en_attente_signatures:  'En attente de signatures',
    signatures_completes:   'Signatures complètes',
    en_attente_virement:    'En attente du virement',
    virement_confirme:      'Virement confirmé',
    vendu:                  'Vendu',
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="wrap py-8 max-w-2xl mx-auto space-y-6">
        <div className="dashboard-card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-black text-brun-nuit text-xl flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" /> {promesse.numero_promesse}
              </h1>
              <p className="text-sm text-brun-doux">{(promesse.bien as any)?.titre} · {(promesse.bien as any)?.ville}</p>
            </div>
            <span className={`badge-${promesse.statut === 'vendu' || promesse.statut === 'signatures_completes' ? 'success' : 'en-attente'} shrink-0`}>
              {statutLabel[promesse.statut] ?? promesse.statut}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-brun-doux text-xs">Prix de vente</p><p className="prix font-black">{formatPrix(promesse.prix_vente)}</p></div>
            {isVendeur && promesse.commission_lofia && (
              <div><p className="text-brun-doux text-xs">Commission LOFIA ({promesse.taux_commission}%)</p><p className="font-semibold text-amber-700">{formatPrix(promesse.commission_lofia)}</p></div>
            )}
            <div><p className="text-brun-doux text-xs">Générée le</p><p className="font-semibold">{formatDate(promesse.created_at)}</p></div>
          </div>
        </div>

        {/* Signatures */}
        <div className="dashboard-card space-y-3">
          <h2 className="font-semibold text-brun-nuit">Signatures</h2>
          {[
            { label: 'Vendeur', nom: (promesse.vendeur as any)?.nom, signe: promesse.signe_par_vendeur, date: promesse.date_signature_vendeur },
            { label: 'Acheteur', nom: (promesse.acheteur as any)?.nom, signe: promesse.signe_par_acheteur, date: promesse.date_signature_acheteur },
          ].map(p => (
            <div key={p.label} className={`flex items-center gap-2 text-sm ${p.signe ? 'text-green-600' : 'text-brun-doux'}`}>
              {p.signe ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {p.label} : {p.nom}
              {p.date && <span className="text-xs ml-1">({formatDate(p.date)})</span>}
            </div>
          ))}
          {!jaiSigne && monToken && promesse.statut === 'en_attente_signatures' && (
            <Link href={`/vente/signer/${monToken}`} className="btn-primary block text-center mt-2">
              Signer la promesse
            </Link>
          )}
          {jaiSigne && promesse.statut === 'en_attente_signatures' && (
            <p className="text-sm text-green-600 text-center mt-2">Vous avez signé — en attente de {autreNom}.</p>
          )}
        </div>

        {/* Virement */}
        {promesse.statut === 'signatures_completes' && isAcheteur && (
          <Link href={`/vente/virement/${promesse.dossier_id}`} className="btn-accent block text-center">
            Effectuer le virement bancaire
          </Link>
        )}

        {/* PDF */}
        {promesse.pdf_url && (
          <a href={promesse.pdf_url} target="_blank" rel="noopener noreferrer" className="btn-outline flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Télécharger la promesse PDF
          </a>
        )}
      </div>
    </div>
  )
}
