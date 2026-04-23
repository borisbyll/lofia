'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/utils'
import { Users, ChevronRight } from 'lucide-react'
import { useDashboardMode } from '@/store/dashboardModeStore'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'

const STATUT_LABEL: Record<string, string> = {
  en_attente:       'En attente',
  visite_confirmee: 'Visite confirmée',
  contrat_genere:   'Contrat généré',
  signe:            'Signé',
  expire:           'Expiré',
  annule:           'Annulé',
}
const STATUT_BADGE: Record<string, string> = {
  en_attente:       'badge-en-attente',
  visite_confirmee: 'badge-success',
  contrat_genere:   'badge-accent',
  signe:            'badge-success',
  expire:           'badge-gray',
  annule:           'badge-danger',
}

export default function MisesEnRelationClient() {
  const { mode } = useDashboardMode()
  const { user } = useAuthStore()
  const [liste, setListe] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const col = mode === 'proprietaire' ? 'proprietaire_id' : 'locataire_id'
      const { data } = await supabase
        .from('mises_en_relation')
        .select('*, bien:biens(id, titre, ville, photo_principale), locataire:profiles!mises_en_relation_locataire_id_fkey(id, nom, phone), proprietaire:profiles!mises_en_relation_proprietaire_id_fkey(id, nom, phone)')
        .eq(col, user!.id)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setListe(data ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [mode, user])

  if (loading) return (
    <div className="p-4 md:p-6 pb-nav space-y-3">
      <div className="skeleton h-8 w-48 rounded-xl" />
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  )

  const roleLabel = mode === 'proprietaire' ? 'Propriétaire' : 'Locataire'

  if (liste.length === 0) return (
    <div className="p-4 md:p-6 pb-nav">
      <div className="page-header mb-6">
        <h1 className="page-title flex items-center gap-2"><Users className="w-5 h-5" /> Demandes de visite — Location</h1>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-brun-doux font-semibold">
          Aucune demande de visite en mode {roleLabel}
        </p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 pb-nav">
      <div className="page-header mb-6">
        <h1 className="page-title flex items-center gap-2"><Users className="w-5 h-5" /> Demandes de visite — Location</h1>
        <p className="page-subtitle">{liste.length} demande{liste.length > 1 ? 's' : ''} · {roleLabel}</p>
      </div>

      <div className="space-y-3">
        {liste.map(mer => {
          const bien         = mer.bien as any
          const locataire    = mer.locataire as any
          const proprietaire = mer.proprietaire as any
          const isProprietaire = mer.proprietaire_id === user?.id
          const autre = isProprietaire ? locataire : proprietaire

          const needsAction =
            (isProprietaire && !mer.visite_confirmee_proprietaire) ||
            (!isProprietaire && !mer.visite_confirmee_locataire)

          return (
            <Link key={mer.id} href={`/mon-espace/mises-en-relation/${mer.id}`}
              className="dashboard-card flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-or-pale">
                {bien?.photo_principale && (
                  <Image src={bien.photo_principale} alt={bien.titre} fill className="object-cover" sizes="56px" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-brun-nuit truncate">{bien?.titre}</p>
                  {needsAction && <span className="badge-warning text-xs shrink-0">Action requise</span>}
                </div>
                <p className="text-sm text-brun-doux truncate">
                  {isProprietaire ? `Demande de ${locataire?.nom}` : `Chez ${proprietaire?.nom}`}
                </p>
                <p className="text-xs text-brun-doux">{formatDate(mer.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={STATUT_BADGE[mer.statut] ?? 'badge-gray'}>{STATUT_LABEL[mer.statut] ?? mer.statut}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
