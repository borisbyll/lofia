'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrix, formatDate } from '@/lib/utils'
import { CheckCircle, Clock, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboardMode } from '@/store/dashboardModeStore'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lofia.vercel.app'

export default function PromesseDetailClient({ promesse, userId }: { promesse: any; userId: string }) {
  const router = useRouter()
  const { mode, setMode } = useDashboardMode()
  const [loading, setLoading] = useState(false)
  const prevModeRef = useRef<string | null>(null)

  const isVendeur    = promesse.vendeur_id === userId
  const isAcheteur   = promesse.acheteur_id === userId
  const expectedMode = isVendeur ? 'proprietaire' : 'locataire'

  useEffect(() => {
    setMode(expectedMode)
  }, [expectedMode, setMode])

  useEffect(() => {
    const prev = prevModeRef.current
    prevModeRef.current = mode
    if (prev === null) return
    if (prev === mode) return
    if (mode === expectedMode) return
    router.push('/mon-espace/ventes')
  }, [mode, expectedMode, router])
  const alreadySigned = isVendeur ? promesse.signature_vendeur : promesse.signature_acheteur
  const partie = isVendeur ? 'vendeur' : 'acheteur'
  const token  = isVendeur ? promesse.token_signature_vendeur : promesse.token_signature_acheteur

  async function marquerVendu() {
    setLoading(true)
    const r = await fetch('/api/vente/marquer-vendu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promesse_id: promesse.id }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success('Vente finalisée !'); window.location.reload() }
    else toast.error(d.error ?? 'Erreur')
  }

  const statusBadge = () => {
    if (promesse.statut === 'signe') return <span className="badge-success">Signé</span>
    if (promesse.statut === 'vendu') return <span className="badge-success">Vendu</span>
    return <span className="badge-en-attente">En attente de signatures</span>
  }

  return (
    <div className="p-4 md:p-6 pb-nav max-w-2xl mx-auto space-y-6">
      <div className="dashboard-card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-black text-brun-nuit text-xl flex items-center gap-2"><FileText className="w-5 h-5 text-primary-500" /> {promesse.numero_promesse}</h1>
            <p className="text-brun-doux text-sm">{(promesse.bien as any)?.titre} · {(promesse.bien as any)?.ville}</p>
          </div>
          {statusBadge()}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-brun-doux">Prix de vente</p>
            <p className="prix text-base">{formatPrix(promesse.prix_vente)}</p>
          </div>
          <div>
            <p className="text-brun-doux">Générée le</p>
            <p className="font-semibold text-brun-nuit">{formatDate(promesse.created_at)}</p>
          </div>
          {promesse.date_limite_signature && (
            <div>
              <p className="text-brun-doux">Date limite</p>
              <p className="font-semibold text-brun-nuit">{formatDate(promesse.date_limite_signature)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="dashboard-card space-y-3">
        <h2 className="font-semibold text-brun-nuit">Signatures</h2>
        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-sm ${promesse.signature_vendeur ? 'text-green-600' : 'text-brun-doux'}`}>
            {promesse.signature_vendeur ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            Vendeur : {(promesse.vendeur as any)?.nom}
            {promesse.signed_at_vendeur && <span className="text-xs ml-1">({formatDate(promesse.signed_at_vendeur)})</span>}
          </div>
          <div className={`flex items-center gap-2 text-sm ${promesse.signature_acheteur ? 'text-green-600' : 'text-brun-doux'}`}>
            {promesse.signature_acheteur ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            Acheteur : {(promesse.acheteur as any)?.nom}
            {promesse.signed_at_acheteur && <span className="text-xs ml-1">({formatDate(promesse.signed_at_acheteur)})</span>}
          </div>
        </div>

        {!alreadySigned && promesse.statut === 'en_attente_signatures' && (
          <a
            href={`/api/vente/signer-promesse?token=${token}&partie=${partie}`}
            className="btn-primary block text-center mt-2">
            Signer la promesse
          </a>
        )}
        {alreadySigned && promesse.statut === 'en_attente_signatures' && (
          <p className="text-sm text-green-600 text-center mt-2">Vous avez signé — en attente de l&apos;autre partie.</p>
        )}
      </div>

      {/* PDF */}
      {promesse.pdf_url && (
        <a href={promesse.pdf_url} target="_blank" rel="noopener noreferrer" className="btn-outline flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Télécharger la promesse PDF
        </a>
      )}

      {/* Marquer vendu */}
      {isVendeur && promesse.statut === 'signe' && (
        <button onClick={marquerVendu} disabled={loading} className="btn-accent w-full">
          {loading ? 'En cours…' : 'Confirmer la vente définitive'}
        </button>
      )}
    </div>
  )
}
