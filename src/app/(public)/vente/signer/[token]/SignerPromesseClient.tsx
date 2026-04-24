'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, FileText, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix } from '@/lib/utils'

interface Props { promesse: any; token: string; partie: 'acheteur' | 'vendeur' }

export default function SignerPromesseClient({ promesse, token, partie }: Props) {
  const [accepte, setAccepte] = useState(false)
  const [loading, setLoading] = useState(false)
  const [signe,   setSigne]   = useState(false)

  const dejaSigné = partie === 'acheteur' ? promesse?.signe_par_acheteur : promesse?.signe_par_vendeur

  if (!promesse) return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <p className="text-red-600 font-semibold">Promesse introuvable ou lien expiré.</p>
      </div>
    </div>
  )

  if (dejaSigné || signe) return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="font-black text-brun-nuit text-xl mb-2">Signature enregistrée</h1>
        <p className="text-brun-doux text-sm mb-6">Votre signature électronique a été prise en compte avec horodatage.</p>
        <Link href="/mon-espace/ventes" className="btn-primary block text-center">Voir mes dossiers vente</Link>
      </div>
    </div>
  )

  async function signer() {
    if (!accepte) return toast.error('Vous devez accepter les termes de la promesse')
    setLoading(true)
    const r = await fetch(`/api/vente/signer?token=${token}`)
    const d = await r.json()
    setLoading(false)
    if (d.success) setSigne(true)
    else toast.error(d.error ?? 'Erreur')
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="wrap py-8 max-w-2xl mx-auto space-y-6">
        <div className="dashboard-card space-y-4">
          <h1 className="font-black text-brun-nuit text-xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" /> Signature — Promesse de vente
          </h1>
          <p className="text-sm text-brun-doux">Promesse <span className="font-mono font-semibold">{promesse.numero_promesse}</span> · {(promesse.bien as any)?.titre}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-brun-doux text-xs">Prix de vente</p><p className="font-semibold prix">{formatPrix(promesse.prix_vente)}</p></div>
            {partie === 'vendeur' && promesse.commission_lofia && (
              <div>
                <p className="text-brun-doux text-xs">Commission LOFIA ({promesse.taux_commission}%)</p>
                <p className="font-semibold text-amber-700">{formatPrix(promesse.commission_lofia)}</p>
              </div>
            )}
          </div>
          {partie === 'vendeur' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              ⚠️ En signant, vous acceptez la commission LOFIA de {formatPrix(promesse.commission_lofia ?? 0)} ({promesse.taux_commission}% du prix de vente), exigible hors plateforme.
            </div>
          )}
        </div>

        {promesse.pdf_url && (
          <div className="dashboard-card">
            <iframe src={promesse.pdf_url} className="w-full h-96 rounded-xl border border-gray-100" title="Promesse PDF" />
          </div>
        )}

        <div className="dashboard-card space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">En signant, vous acceptez les termes de cette promesse de vente. Action définitive.</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={accepte} onChange={e => setAccepte(e.target.checked)} className="w-5 h-5 mt-0.5 accent-primary-500" />
            <span className="text-sm text-brun-nuit">J&apos;ai lu et j&apos;accepte les termes de cette promesse de vente</span>
          </label>
          <button onClick={signer} disabled={loading || !accepte} className="btn-primary w-full">
            {loading ? 'Signature en cours…' : 'Signer électroniquement cette promesse'}
          </button>
        </div>
      </div>
    </div>
  )
}
