'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Home, ChevronRight, Clock } from 'lucide-react'
import { formatPrix, formatDate } from '@/lib/utils'
import { useDashboardMode } from '@/store/dashboardModeStore'

const STATUT_LABEL: Record<string, { label: string; cls: string }> = {
  demande_recue:       { label: 'Demande reçue',      cls: 'badge-en-attente' },
  visite_planifiee:    { label: 'Visite planifiée',   cls: 'badge-accent' },
  visite_effectuee:    { label: 'Visite effectuée',   cls: 'badge-accent' },
  acheteur_interesse:  { label: 'Intéressé',          cls: 'badge-success' },
  acheteur_refuse:     { label: 'Non intéressé',      cls: 'badge-danger' },
  vendeur_accepte:     { label: 'Vendeur OK',         cls: 'badge-success' },
  vendeur_refuse:      { label: 'Refusé',             cls: 'badge-danger' },
  promesse_en_cours:   { label: 'Promesse en cours',  cls: 'badge-accent' },
  promesse_signee:     { label: 'Promesse signée',    cls: 'badge-success' },
  virement_en_attente: { label: 'Virement attendu',   cls: 'badge-warning' },
  virement_confirme:   { label: 'Virement confirmé',  cls: 'badge-success' },
  vendu:               { label: 'Vendu',              cls: 'badge-success' },
  expire:              { label: 'Expiré',             cls: 'badge-gray' },
  refuse:              { label: 'Refusé',             cls: 'badge-danger' },
}

export default function VentesClient({ userId }: { userId: string }) {
  const { mode } = useDashboardMode()
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('dossiers_vente')
        .select('id, reference, statut, date_visite, created_at, bien:biens(titre, ville, prix), acheteur:profiles!acheteur_id(nom), vendeur:profiles!vendeur_id(nom)')
        .or(`acheteur_id.eq.${userId},vendeur_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      setDossiers(data ?? [])
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
    </div>
  )

  const isVendeur = mode === 'proprietaire'
  const liste = dossiers.filter(d => isVendeur ? d.vendeur_id === userId : d.acheteur_id === userId)

  return (
    <div className="p-4 md:p-6 pb-nav">
      <div className="page-header mb-6">
        <h1 className="page-title flex items-center gap-2"><Home className="w-6 h-6" /> Ventes immobilières</h1>
        <p className="page-subtitle">{isVendeur ? 'Demandes de visite reçues' : 'Vos demandes de visite'} · {liste.length} dossier{liste.length !== 1 ? 's' : ''}</p>
      </div>

      {liste.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-brun-nuit">
            {isVendeur ? 'Aucune demande de visite reçue' : 'Aucune demande de visite envoyée'}
          </p>
          {!isVendeur && (
            <p className="text-sm text-brun-doux mt-1">Visitez les annonces de vente pour soumettre une demande.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {liste.map(d => {
            const s = STATUT_LABEL[d.statut]
            const contact = isVendeur ? d.acheteur : d.vendeur
            return (
              <Link key={d.id} href={`/mon-espace/ventes/${d.id}`}
                className="dashboard-card flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brun-nuit truncate">{d.bien?.titre ?? '—'}</p>
                  <p className="text-xs text-brun-doux">
                    {isVendeur ? `Acheteur : ${contact?.nom}` : `Bien : ${d.bien?.ville}`} · {formatDate(d.created_at)}
                  </p>
                  {d.bien?.prix && <p className="text-xs font-bold text-primary-500">{formatPrix(d.bien.prix)}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s && <span className={s.cls}>{s.label}</span>}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
