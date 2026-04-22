'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Home, Eye, FileText, ChevronRight, Clock } from 'lucide-react'
import { formatPrix, formatDate } from '@/lib/utils'

type DemVV = { id: string; statut: string; code_visite: string; created_at: string; bien: { titre: string; ville: string } | null; acheteur: { nom: string } | null; vendeur: { nom: string } | null }
type OffreAchat = { id: string; statut: string; prix_propose: number; prix_accepte: number | null; created_at: string; bien: { titre: string } | null; acheteur: { nom: string } | null; vendeur: { nom: string } | null }
type Promesse = { id: string; statut: string; numero_promesse: string; prix_vente: number; created_at: string; bien: { titre: string } | null }

export default function VentesClient({ userId }: { userId: string }) {
  const [visites, setVisites]   = useState<DemVV[]>([])
  const [offres, setOffres]     = useState<OffreAchat[]>([])
  const [promesses, setPromesses] = useState<Promesse[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'visites' | 'offres' | 'promesses'>('visites')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [vRes, oRes, pRes] = await Promise.all([
        supabase.from('demandes_visite_vente').select('*, bien:biens(titre, ville), acheteur:profiles!demandes_visite_vente_acheteur_id_fkey(nom), vendeur:profiles!demandes_visite_vente_vendeur_id_fkey(nom)').or(`acheteur_id.eq.${userId},vendeur_id.eq.${userId}`).order('created_at', { ascending: false }),
        supabase.from('offres_achat').select('*, bien:biens(titre), acheteur:profiles!offres_achat_acheteur_id_fkey(nom), vendeur:profiles!offres_achat_vendeur_id_fkey(nom)').or(`acheteur_id.eq.${userId},vendeur_id.eq.${userId}`).order('created_at', { ascending: false }),
        supabase.from('promesses_vente').select('*, bien:biens(titre)').or(`acheteur_id.eq.${userId},vendeur_id.eq.${userId}`).order('created_at', { ascending: false }),
      ])
      setVisites((vRes.data ?? []) as DemVV[])
      setOffres((oRes.data ?? []) as OffreAchat[])
      setPromesses((pRes.data ?? []) as Promesse[])
      setLoading(false)
    }
    load()
  }, [userId])

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      en_attente: 'badge-en-attente', visite_confirmee: 'badge-success', offre_faite: 'badge-accent',
      acceptee: 'badge-success', refusee: 'badge-danger', contre_offre: 'badge-warning',
      en_attente_signatures: 'badge-en-attente', signe: 'badge-success', vendu: 'badge-success',
    }
    const labels: Record<string, string> = {
      en_attente: 'En attente', visite_confirmee: 'Visite confirmée', offre_faite: 'Offre faite',
      acceptee: 'Acceptée', refusee: 'Refusée', contre_offre: 'Contre-offre',
      en_attente_signatures: 'À signer', signe: 'Signé', vendu: 'Vendu',
    }
    return <span className={map[s] ?? 'badge-gray'}>{labels[s] ?? s}</span>
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
    </div>
  )

  return (
    <div className="p-4 md:p-6 pb-nav">
      <div className="page-header mb-6">
        <h1 className="page-title flex items-center gap-2"><Home className="w-6 h-6" /> Ventes immobilières</h1>
        <p className="page-subtitle">Visites, offres et promesses de vente</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {(['visites', 'offres', 'promesses'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-3 text-sm font-semibold capitalize transition-colors ${tab === t ? 'border-b-2 border-primary-500 text-primary-500' : 'text-brun-doux'}`}>
            {t === 'visites' ? `Visites (${visites.length})` : t === 'offres' ? `Offres (${offres.length})` : `Promesses (${promesses.length})`}
          </button>
        ))}
      </div>

      {tab === 'visites' && (
        <div className="space-y-3">
          {visites.length === 0 && <p className="text-brun-doux text-center py-8">Aucune demande de visite</p>}
          {visites.map(v => (
            <Link key={v.id} href={`/mon-espace/ventes/${v.id}`} className="dashboard-card flex items-center gap-4 hover:shadow-md transition-shadow">
              <Eye className="w-8 h-8 text-primary-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brun-nuit truncate">{(v.bien as any)?.titre ?? '—'}</p>
                <p className="text-xs text-brun-doux">{v.code_visite} · {formatDate(v.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">{statusBadge(v.statut)}<ChevronRight className="w-4 h-4 text-gray-400" /></div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'offres' && (
        <div className="space-y-3">
          {offres.length === 0 && <p className="text-brun-doux text-center py-8">Aucune offre</p>}
          {offres.map(o => (
            <div key={o.id} className="dashboard-card flex items-center gap-4">
              <FileText className="w-8 h-8 text-accent-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brun-nuit truncate">{(o.bien as any)?.titre ?? '—'}</p>
                <p className="text-xs text-brun-doux prix">{formatPrix(o.prix_accepte ?? o.prix_propose)}</p>
              </div>
              {statusBadge(o.statut)}
            </div>
          ))}
        </div>
      )}

      {tab === 'promesses' && (
        <div className="space-y-3">
          {promesses.length === 0 && <p className="text-brun-doux text-center py-8">Aucune promesse de vente</p>}
          {promesses.map(p => (
            <Link key={p.id} href={`/mon-espace/ventes/promesse/${p.id}`} className="dashboard-card flex items-center gap-4 hover:shadow-md transition-shadow">
              <FileText className="w-8 h-8 text-primary-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brun-nuit truncate">{(p.bien as any)?.titre ?? '—'}</p>
                <p className="text-xs text-brun-doux">{p.numero_promesse} · <span className="prix">{formatPrix(p.prix_vente)}</span></p>
              </div>
              <div className="flex items-center gap-2">{statusBadge(p.statut)}<ChevronRight className="w-4 h-4 text-gray-400" /></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
