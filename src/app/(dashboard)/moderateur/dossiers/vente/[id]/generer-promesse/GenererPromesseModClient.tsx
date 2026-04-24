'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix } from '@/lib/utils'

interface Props { dossier: any }

export default function GenererPromesseModClient({ dossier }: Props) {
  const router = useRouter()
  const bien     = dossier.bien as any
  const acheteur = dossier.acheteur as any
  const vendeur  = dossier.vendeur as any

  const [loading,    setLoading]    = useState(false)
  const [prixVente,  setPrixVente]  = useState(String(bien?.prix ?? ''))
  const [conditions, setConditions] = useState('Bien vendu en l\'état, sans garantie cachée. La vente devient définitive après le paiement intégral.')

  async function generer() {
    if (!prixVente) { toast.error('Prix de vente requis'); return }
    setLoading(true)
    const r = await fetch('/api/vente/generer-promesse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossier_id: dossier.id,
        prix_vente:  Number(prixVente),
        conditions,
      }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success || d.promesse_id) {
      toast.success('Promesse de vente générée !')
      router.push(`/moderateur/dossiers/vente/${dossier.id}`)
    } else toast.error(d.error ?? 'Erreur')
  }

  return (
    <div className="p-4 md:p-6 pb-nav max-w-xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-brun-doux hover:text-primary-500 text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><FileText className="w-5 h-5" /> Générer la promesse de vente</h1>
      </div>

      <div className="dashboard-card space-y-2 text-sm">
        <p><span className="text-brun-doux">Bien :</span> <strong>{bien?.titre}</strong> — {bien?.ville}</p>
        <p><span className="text-brun-doux">Prix affiché :</span> <strong>{formatPrix(bien?.prix)}</strong></p>
        <p><span className="text-brun-doux">Acheteur :</span> {acheteur?.nom} · {acheteur?.phone}</p>
        <p><span className="text-brun-doux">Vendeur :</span> {vendeur?.nom} · {vendeur?.phone}</p>
      </div>

      <div className="dashboard-card space-y-4">
        <div>
          <label className="label-field">Prix de vente convenu (FCFA) *</label>
          <input
            type="number"
            value={prixVente}
            onChange={e => setPrixVente(e.target.value)}
            className="input-field"
            placeholder="ex: 45000000"
          />
        </div>

        <div>
          <label className="label-field">Conditions particulières</label>
          <textarea
            value={conditions}
            onChange={e => setConditions(e.target.value)}
            rows={4}
            className="input-field resize-none"
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          Commission LOFIA : 5% du prix de vente ({formatPrix(Number(prixVente) * 0.05)}) — mentionnée dans le PDF. Paiement hors plateforme.
        </div>

        <button onClick={generer} disabled={loading} className="btn-accent w-full text-base">
          {loading ? 'Génération du PDF…' : 'Générer et envoyer aux deux parties'}
        </button>
      </div>
    </div>
  )
}
