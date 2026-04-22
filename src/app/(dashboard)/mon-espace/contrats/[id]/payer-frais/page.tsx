'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatPrix } from '@/lib/utils'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

export default function PayerFraisDossierPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [contrat, setContrat] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('contrats_location').select('*, bien:biens(titre)').eq('id', id).single()
      .then(({ data }) => setContrat(data))
  }, [id])

  async function payer() {
    setLoading(true)
    const r = await fetch('/api/longue-duree/payer-frais-dossier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrat_id: id }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.paiement_url) window.location.href = d.paiement_url
    else toast.error(d.error ?? 'Erreur')
  }

  if (!contrat) return (
    <div className="p-6 flex items-center justify-center min-h-40">
      <div className="skeleton w-full max-w-md h-40 rounded-2xl" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 pb-nav max-w-md mx-auto space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-brun-doux hover:text-primary-500 text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><CreditCard className="w-5 h-5" /> Frais de dossier</h1>
        <p className="page-subtitle">Contrat {contrat.numero_contrat}</p>
      </div>

      <div className="dashboard-card space-y-4">
        <div className="text-center py-4">
          <p className="text-brun-doux text-sm mb-2">Montant à régler</p>
          <p className="prix text-3xl">{formatPrix(contrat.frais_dossier)}</p>
        </div>

        <div className="bg-primary-50 rounded-xl p-4 space-y-2 text-sm text-brun-doux">
          <p>Les frais de dossier LOFIA couvrent :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Génération et archivage du contrat PDF</li>
            <li>Signatures électroniques certifiées</li>
            <li>Suivi du dossier locatif</li>
          </ul>
        </div>

        <p className="text-xs text-brun-doux text-center">
          Bien : <strong>{(contrat.bien as any)?.titre}</strong> — Loyer : <strong>{formatPrix(contrat.loyer_mensuel)}/mois</strong>
        </p>

        <button onClick={payer} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 text-base">
          <CreditCard className="w-4 h-4" />
          {loading ? 'Redirection…' : 'Payer par FedaPay'}
        </button>
      </div>
    </div>
  )
}
