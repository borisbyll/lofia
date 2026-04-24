'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Home, Clock, CheckCircle2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useDashboardMode } from '@/store/dashboardModeStore'
import { formatDate } from '@/lib/utils'

const STATUT_LABEL: Record<string, string> = {
  demande_recue:          'Demande reçue',
  visite_planifiee:       'Visite planifiée',
  visite_effectuee:       'Visite effectuée',
  locataire_interesse:    'Intéressé',
  locataire_non_interesse:'Non intéressé',
  proprietaire_accepte:   'Accepté',
  proprietaire_refuse:    'Refusé',
  contrat_genere:         'Contrat généré',
  en_attente_signatures:  'En attente signatures',
  signatures_completes:   'Signatures complètes',
  en_attente_paiement:    'En attente paiement',
  paiement_recu:          'Paiement reçu',
  finalise:               'Finalisé',
}

export default function LocationsClient({ userId }: { userId: string }) {
  const { mode } = useDashboardMode()
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const col = mode === 'proprietaire' ? 'proprietaire_id' : 'locataire_id'
      const { data } = await supabase
        .from('dossiers_longue_duree')
        .select('id, reference, statut, created_at, bien:biens(titre, ville, photo_principale, prix)')
        .eq(col, userId)
        .order('created_at', { ascending: false })
      setDossiers(data ?? [])
      setLoading(false)
    }
    load()
  }, [mode, userId])

  return (
    <div className="p-4 md:p-6 pb-nav max-w-2xl mx-auto space-y-5">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Home className="w-5 h-5" /> Mes locations longue durée</h1>
        <p className="page-subtitle">Mode : {mode === 'proprietaire' ? 'Propriétaire' : 'Locataire'}</p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="dashboard-card skeleton h-20" />)}
        </div>
      )}

      {!loading && dossiers.length === 0 && (
        <div className="dashboard-card text-center py-12">
          <Home className="w-12 h-12 text-primary-200 mx-auto mb-3" />
          <p className="font-semibold text-brun-nuit mb-1">Aucun dossier</p>
          <p className="text-sm text-brun-doux">
            {mode === 'locataire' ? 'Vos demandes de visite longue durée apparaîtront ici.' : 'Les demandes de vos locataires apparaîtront ici.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {dossiers.map(d => {
          const bien = d.bien as any
          const terminal = ['finalise','locataire_non_interesse','proprietaire_refuse'].includes(d.statut)
          const actionRequired = ['demande_recue','locataire_interesse','proprietaire_accepte','signatures_completes','en_attente_paiement'].includes(d.statut)
          return (
            <Link key={d.id} href={`/mon-espace/locations/${d.id}`}
              className="dashboard-card flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-brun-nuit truncate">{bien?.titre ?? '—'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    terminal        ? 'bg-gray-100 text-gray-500' :
                    actionRequired  ? 'bg-amber-100 text-amber-700' :
                                      'bg-green-100 text-green-700'
                  }`}>
                    {STATUT_LABEL[d.statut] ?? d.statut}
                  </span>
                </div>
                <p className="text-xs text-brun-doux">{bien?.ville} · Réf {d.reference} · {formatDate(d.created_at)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-brun-doux shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
