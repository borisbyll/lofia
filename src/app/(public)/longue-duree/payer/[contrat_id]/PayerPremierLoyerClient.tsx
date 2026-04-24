'use client'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix } from '@/lib/utils'

interface Props { contrat: any; userId: string }

export default function PayerPremierLoyerClient({ contrat, userId }: Props) {
  const [loading, setLoading] = useState(false)
  const bien = contrat.bien as any

  async function payer() {
    setLoading(true)
    const r = await fetch('/api/longue-duree/payer-premier-loyer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrat_id: contrat.id }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.paiement_url) window.location.href = d.paiement_url
    else toast.error(d.error ?? 'Erreur')
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6">
        <h1 className="font-black text-brun-nuit text-xl">Premier paiement</h1>
        <p className="text-sm text-brun-doux">{bien?.titre} · Contrat {contrat.numero_contrat}</p>

        <div className="bg-primary-50 rounded-xl p-4 space-y-2 text-sm">
          {[
            ['Premier loyer',        contrat.loyer_mensuel],
            ['Caution',              contrat.depot_garantie_montant],
            ['Commission LOFIA',     contrat.commission_lofia],
          ].filter(([, v]) => v).map(([l, v]) => (
            <div key={l as string} className="flex justify-between">
              <span className="text-brun-doux">{l}</span>
              <span className="font-semibold">{formatPrix(v as number)}</span>
            </div>
          ))}
          <div className="border-t border-primary-100 pt-2 flex justify-between font-black text-base">
            <span>TOTAL</span>
            <span className="prix">{formatPrix(contrat.total_premier_paiement)}</span>
          </div>
        </div>

        <button onClick={payer} disabled={loading} className="btn-primary w-full">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2 inline" />Redirection…</> : `Payer ${formatPrix(contrat.total_premier_paiement)} via FedaPay`}
        </button>
        <p className="text-xs text-center text-brun-doux">Flooz · T-Money · Wave · Carte bancaire</p>
      </div>
    </div>
  )
}
