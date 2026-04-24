'use client'
import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix } from '@/lib/utils'

export default function AnnoncesVenteClient({ biens: initial }: { biens: any[] }) {
  const [biens,  setBiens]  = useState(initial)
  const [motifs, setMotifs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  async function valider(id: string) {
    setLoading(id)
    const r = await fetch(`/api/biens/vente/${id}/valider`, { method: 'POST' })
    const d = await r.json()
    setLoading(null)
    if (d.success) {
      toast.success('Annonce approuvée !')
      setBiens(prev => prev.filter(b => b.id !== id))
    } else toast.error(d.error ?? 'Erreur')
  }

  async function rejeter(id: string) {
    const motif = motifs[id]?.trim()
    if (!motif) return toast.error('Le motif de rejet est obligatoire')
    setLoading(id)
    const r = await fetch(`/api/biens/vente/${id}/rejeter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motif }),
    })
    const d = await r.json()
    setLoading(null)
    if (d.success) {
      toast.success('Annonce rejetée')
      setBiens(prev => prev.filter(b => b.id !== id))
    } else toast.error(d.error ?? 'Erreur')
  }

  return (
    <div className="p-4 md:p-6 pb-nav max-w-3xl mx-auto space-y-5">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Clock className="w-5 h-5" /> Annonces vente à valider</h1>
        <p className="page-subtitle">{biens.length} annonce{biens.length !== 1 ? 's' : ''} en attente</p>
      </div>

      {biens.length === 0 && (
        <div className="dashboard-card text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="font-semibold text-brun-nuit">File vide — tout est à jour !</p>
        </div>
      )}

      {biens.map(bien => {
        const proprio = bien.proprietaire as any
        return (
          <div key={bien.id} className="dashboard-card space-y-4">
            <div className="flex gap-4">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-or-pale">
                {bien.photo_principale && <Image src={bien.photo_principale} alt={bien.titre} fill className="object-cover" sizes="96px" />}
              </div>
              <div className="flex-1">
                <h2 className="font-black text-brun-nuit">{bien.titre}</h2>
                <p className="text-sm text-brun-doux">{bien.ville}</p>
                <p className="prix text-lg">{formatPrix(bien.prix)}</p>
                <p className="text-xs text-brun-doux mt-1">Propriétaire : {proprio?.nom} · {proprio?.phone}</p>
              </div>
            </div>

            {/* Liste de vérification */}
            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1 text-brun-doux">
              {['Photos conformes et de qualité', 'Prix cohérent avec le marché', 'Informations complètes', 'Annonce non frauduleuse'].map(item => (
                <p key={item}>□ {item}</p>
              ))}
            </div>

            {/* Motif rejet */}
            <div>
              <label className="label-field text-xs">Motif de rejet (si refus)</label>
              <input
                value={motifs[bien.id] ?? ''}
                onChange={e => setMotifs(prev => ({ ...prev, [bien.id]: e.target.value }))}
                className="input-field text-sm"
                placeholder="Photos insuffisantes, prix incohérent…"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => valider(bien.id)} disabled={loading === bien.id}
                className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Approuver
              </button>
              <button onClick={() => rejeter(bien.id)} disabled={loading === bien.id}
                className="flex-1 btn-danger flex items-center justify-center gap-2 text-sm">
                <XCircle className="w-4 h-4" /> Rejeter
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
