'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ExternalLink, Clock, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  deces_famille: 'Décès dans la famille',
  hospitalisation: 'Hospitalisation',
  decision_administrative: 'Décision administrative',
  accident: 'Accident',
  catastrophe_naturelle: 'Catastrophe naturelle',
  urgence_medicale: 'Urgence médicale',
}

interface Demande {
  id: string
  type_evenement: string
  categorie: string
  description: string | null
  justificatif_url: string | null
  statut: string
  created_at: string
  reservations: {
    date_debut: string
    date_fin: string
    prix_total: number
    biens: { titre: string } | null
  } | null
  profiles: { nom: string; phone: string | null } | null
}

interface Props {
  demandes: Demande[]
  statsTotal: number
  statsValidees: number
  statsRefusees: number
}

export default function ForceMajeureModerateur({
  demandes: demandesInitiales,
  statsTotal,
  statsValidees,
  statsRefusees,
}: Props) {
  const [demandes, setDemandes] = useState(demandesInitiales)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [motifRefus, setMotifRefus] = useState<Record<string, string>>({})
  const [showMotif, setShowMotif] = useState<string | null>(null)

  const valider = async (id: string) => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/moderation/force-majeure/${id}/valider`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Demande validée — remboursement 100% déclenché')
      setDemandes(prev => prev.filter(d => d.id !== id))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoadingId(null)
    }
  }

  const refuser = async (id: string) => {
    const motif = motifRefus[id]?.trim()
    if (!motif) { toast.error('Motif de refus requis'); return }
    setLoadingId(id)
    try {
      const res = await fetch(`/api/moderation/force-majeure/${id}/refuser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif_refus: motif }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Demande refusée — politique standard appliquée')
      setDemandes(prev => prev.filter(d => d.id !== id))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoadingId(null)
      setShowMotif(null)
    }
  }

  const minutesEcoulees = (dateStr: string) => {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="page-title">Force Majeure</h1>
        <p className="text-sm text-brun-doux mt-0.5">Demandes d&apos;annulation exceptionnelle à traiter sous 4h</p>
      </div>

      {/* Statistiques du mois */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-brun-nuit">{statsTotal}</p>
          <p className="text-xs text-brun-doux mt-1">Demandes ce mois</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-emerald-600">{statsValidees}</p>
          <p className="text-xs text-brun-doux mt-1">Validées</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-red-500">{statsRefusees}</p>
          <p className="text-xs text-brun-doux mt-1">Refusées</p>
        </div>
      </div>

      {demandes.length === 0 ? (
        <div className="dashboard-card text-center py-12 text-brun-doux">
          <CheckCircle size={32} className="mx-auto mb-3 text-emerald-400" />
          <p className="font-semibold">Aucune demande en attente</p>
          <p className="text-sm mt-1">Toutes les demandes ont été traitées.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {demandes.map(d => {
            const minutes = minutesEcoulees(d.created_at)
            const isUrgent = minutes >= 180
            const resa = d.reservations
            const locataire = d.profiles

            return (
              <div key={d.id} className={`dashboard-card border-l-4 ${isUrgent ? 'border-l-red-500' : d.categorie === 'A' ? 'border-l-emerald-500' : 'border-l-amber-400'}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.categorie === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        Catégorie {d.categorie}
                      </span>
                      <span className="font-semibold text-brun-nuit text-sm">{TYPE_LABELS[d.type_evenement] ?? d.type_evenement}</span>
                    </div>
                    {locataire && (
                      <p className="text-xs text-brun-doux mt-1">{locataire.nom} · {locataire.phone ?? 'N/A'}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${isUrgent ? 'text-red-500' : 'text-brun-doux'}`}>
                    <Clock size={12} />
                    {isUrgent ? `⚠️ ${Math.floor(minutes / 60)}h${minutes % 60}m` : `${Math.floor(minutes / 60)}h${minutes % 60}m`}
                  </div>
                </div>

                {/* Réservation */}
                {resa && (
                  <div className="text-xs text-brun-doux bg-gray-50 rounded-lg p-2 mb-3">
                    <span className="font-semibold text-brun-nuit">{resa.biens?.titre}</span>
                    {' · '}
                    {new Date(resa.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {' → '}
                    {new Date(resa.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}
                    <span className="font-semibold text-brun-nuit">{formatPrix(resa.prix_total)}</span>
                  </div>
                )}

                {/* Description */}
                {d.description && (
                  <p className="text-xs text-brun-doux italic mb-3 bg-gray-50 rounded-lg p-2">&quot;{d.description}&quot;</p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {d.justificatif_url && (
                    <a
                      href={d.justificatif_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost text-xs px-3 py-1.5 gap-1.5"
                    >
                      <FileText size={12} /> Voir justificatif <ExternalLink size={10} />
                    </a>
                  )}

                  <button
                    onClick={() => valider(d.id)}
                    disabled={!!loadingId}
                    className="btn btn-primary text-xs px-3 py-1.5 gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle size={12} /> Valider
                  </button>

                  {showMotif === d.id ? (
                    <div className="w-full space-y-2">
                      <input
                        type="text"
                        placeholder="Motif du refus…"
                        value={motifRefus[d.id] ?? ''}
                        onChange={e => setMotifRefus(prev => ({ ...prev, [d.id]: e.target.value }))}
                        className="input-field text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => refuser(d.id)}
                          disabled={!!loadingId}
                          className="btn btn-danger text-xs px-3 py-1.5 gap-1.5 disabled:opacity-50"
                        >
                          <XCircle size={12} /> Confirmer le refus
                        </button>
                        <button
                          onClick={() => setShowMotif(null)}
                          className="btn btn-ghost text-xs px-3 py-1.5"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMotif(d.id)}
                      disabled={!!loadingId}
                      className="btn btn-danger text-xs px-3 py-1.5 gap-1.5 disabled:opacity-50"
                    >
                      <XCircle size={12} /> Refuser
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
