'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, Download, FileText, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix, formatDate, cn } from '@/lib/utils'
import { useDashboardMode } from '@/store/dashboardModeStore'

interface Props {
  contrat:    any
  userId:     string
  justSigned: boolean
}

const STATUT_COLOR: Record<string, string> = {
  brouillon:             'bg-gray-100 text-gray-600',
  en_attente_signatures: 'bg-yellow-100 text-yellow-700',
  en_attente_paiement:   'bg-orange-100 text-orange-700',
  signe:                 'bg-green-100 text-green-700',
  archive:               'bg-gray-100 text-gray-500',
  resilie:               'bg-red-100 text-red-600',
}

export default function ContratDetailClient({ contrat, userId, justSigned }: Props) {
  const router            = useRouter()
  const { mode, setMode } = useDashboardMode()
  const [payLoading, setPayLoading] = useState(false)
  const prevModeRef = useRef<string | null>(null)

  const isLocataire    = userId === contrat.locataire_id
  const isProprietaire = userId === contrat.proprietaire_id
  const expectedMode   = isLocataire ? 'locataire' : 'proprietaire'

  // Auto-switch au chargement
  useEffect(() => {
    setMode(expectedMode)
  }, [expectedMode, setMode])

  // Rediriger uniquement quand l'utilisateur change MANUELLEMENT le mode
  // (pas lors de l'auto-switch initial)
  useEffect(() => {
    const prev = prevModeRef.current
    prevModeRef.current = mode
    if (prev === null) return              // premier rendu → skip
    if (prev === mode) return              // mode inchangé → skip
    if (mode === expectedMode) return      // c'est l'auto-switch → skip
    router.push('/mon-espace/contrats')
  }, [mode, expectedMode, router])
  const jaiSigne       = isLocataire ? contrat.signe_par_locataire : contrat.signe_par_proprietaire
  const autreASigne    = isLocataire ? contrat.signe_par_proprietaire : contrat.signe_par_locataire
  const monToken       = isLocataire ? contrat.token_signature_locataire : contrat.token_signature_proprietaire
  const appUrl         = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lofia.vercel.app'
  const lienSignature  = monToken ? `${appUrl}/api/longue-duree/signer?token=${monToken}` : null

  const handleSigner = () => {
    if (!lienSignature) return
    if (confirm('En confirmant, vous signez électroniquement ce contrat. Cette action est définitive.')) {
      window.location.href = lienSignature
    }
  }

  const handlePayerFrais = async () => {
    setPayLoading(true)
    try {
      const res = await fetch('/api/longue-duree/payer-frais-dossier', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrat_id: contrat.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      window.location.href = data.paiement_url
    } finally {
      setPayLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 pb-nav max-w-3xl mx-auto">

      {justSigned && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
          <CheckCircle2 size={24} className="text-green-600 shrink-0" />
          <div><p className="font-bold text-green-800">Signature enregistrée</p><p className="text-sm text-green-700 mt-0.5">Votre signature électronique a été prise en compte avec horodatage.</p></div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-6">
        <div><h1 className="page-title">Contrat de location</h1><p className="page-subtitle">{contrat.bien?.titre}</p></div>
        <span className={cn('px-3 py-1.5 rounded-full text-xs font-bold shrink-0', STATUT_COLOR[contrat.statut] ?? 'bg-gray-100')}>{contrat.numero_contrat}</span>
      </div>

      {/* Termes */}
      <div className="bg-white rounded-2xl border border-primary-50 p-5 mb-4">
        <h2 className="font-bold text-sm mb-4" style={{ color: '#1a0a00' }}>Termes du bail</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Loyer mensuel',     formatPrix(contrat.loyer_mensuel)],
            ['Charges',           formatPrix(contrat.charges_mensuelles)],
            ['Durée',             `${contrat.duree_mois} mois`],
            ['Début',             formatDate(contrat.date_debut)],
            ['Fin',               contrat.date_fin ? formatDate(contrat.date_fin) : '—'],
            ['Dépôt de garantie', contrat.depot_garantie ? formatPrix(contrat.depot_garantie) : '—'],
            ['Frais dossier',     formatPrix(contrat.frais_dossier) + ' (bailleur)'],
          ].map(([l, v]) => (
            <div key={l}><p className="text-xs" style={{ color: '#7a5c3a' }}>{l}</p><p className="font-semibold" style={{ color: '#1a0a00' }}>{v}</p></div>
          ))}
        </div>
      </div>

      {/* Signatures */}
      <div className="bg-white rounded-2xl border border-primary-50 p-5 mb-4">
        <h2 className="font-bold text-sm mb-4" style={{ color: '#1a0a00' }}>Signatures numériques</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Propriétaire', profil: contrat.proprietaire, signe: contrat.signe_par_proprietaire, date: contrat.date_signature_proprietaire },
            { label: 'Locataire',    profil: contrat.locataire,    signe: contrat.signe_par_locataire,    date: contrat.date_signature_locataire },
          ].map(({ label, profil, signe, date }) => (
            <div key={label} className={cn('rounded-xl p-3 border', signe ? 'border-green-200 bg-green-50' : 'border-primary-50')}>
              <p className="text-xs font-bold mb-1" style={{ color: '#7a5c3a' }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color: '#1a0a00' }}>{profil?.nom ?? '—'}</p>
              <div className="flex items-center gap-1 mt-1.5 text-xs">
                {signe
                  ? <><CheckCircle2 size={11} className="text-green-600" /><span className="text-green-600">Signé {date ? formatDate(date) : ''}</span></>
                  : <><Clock size={11} style={{ color: '#D4A832' }} /><span style={{ color: '#D4A832' }}>En attente</span></>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {contrat.statut === 'en_attente_signatures' && !jaiSigne && lienSignature && (
          <div className="bg-white rounded-2xl border-2 border-primary-500 p-5">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle size={20} style={{ color: '#8B1A2E' }} className="shrink-0 mt-0.5" />
              <p className="text-sm" style={{ color: '#1a0a00' }}>Vous devez signer ce contrat. En signant, vous acceptez l&apos;ensemble des termes du bail.</p>
            </div>
            <button onClick={handleSigner} className="btn btn-primary w-full">Signer électroniquement le contrat</button>
          </div>
        )}

        {isProprietaire && contrat.statut === 'en_attente_paiement' && !contrat.frais_dossier_paye && (
          <div className="bg-white rounded-2xl border-2 border-accent-500 p-5">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle size={20} style={{ color: '#D4A832' }} className="shrink-0 mt-0.5" />
              <div><p className="font-bold text-sm" style={{ color: '#1a0a00' }}>Frais de dossier à régler</p>
              <p className="text-sm mt-0.5" style={{ color: '#7a5c3a' }}>En tant que bailleur, vous devez régler les frais LOFIA pour finaliser le contrat.</p></div>
            </div>
            <p className="prix text-xl mb-4">{formatPrix(contrat.frais_dossier)}</p>
            <button onClick={handlePayerFrais} disabled={payLoading} className="btn btn-primary w-full">
              {payLoading ? <><Loader2 size={16} className="animate-spin mr-2" />Redirection…</> : `Payer ${formatPrix(contrat.frais_dossier)} via FedaPay`}
            </button>
          </div>
        )}

        {contrat.pdf_url && (
          <a
            href={`/api/pdf-download?url=${encodeURIComponent(contrat.pdf_url)}&filename=${encodeURIComponent(`contrat-${contrat.numero_contrat}.pdf`)}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold border-2 hover:bg-primary-50 transition-colors min-h-[48px]"
            style={{ borderColor: '#8B1A2E', color: '#8B1A2E' }}>
            <Download size={16} /> Télécharger le contrat PDF
          </a>
        )}
      </div>
    </div>
  )
}
