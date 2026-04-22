import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { formatPrix, formatDate } from '@/lib/utils'

const STATUT: Record<string, { label: string; color: string }> = {
  brouillon:             { label: 'Brouillon',          color: 'bg-gray-100 text-gray-500' },
  en_attente_signatures: { label: 'À signer',           color: 'bg-yellow-100 text-yellow-700' },
  en_attente_paiement:   { label: 'Frais à régler',     color: 'bg-orange-100 text-orange-700' },
  signe:                 { label: 'Signé',              color: 'bg-green-100 text-green-700' },
  archive:               { label: 'Archivé',            color: 'bg-gray-100 text-gray-500' },
  resilie:               { label: 'Résilié',            color: 'bg-red-100 text-red-600' },
}

export default async function ContratsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion?next=/mon-espace/contrats')

  const { data: contrats } = await supabase
    .from('contrats_location')
    .select('*, bien:biens(titre, ville), locataire:profiles!contrats_location_locataire_id_fkey(nom), proprietaire:profiles!contrats_location_proprietaire_id_fkey(nom)')
    .or(`locataire_id.eq.${user.id},proprietaire_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const liste = contrats ?? []

  return (
    <div className="p-4 md:p-6 pb-nav">
      <div className="page-header mb-6">
        <h1 className="page-title">Mes contrats</h1>
        <p className="page-subtitle">Location longue durée</p>
      </div>

      {liste.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold" style={{ color: '#1a0a00' }}>Aucun contrat</p>
          <p className="text-sm mt-1" style={{ color: '#7a5c3a' }}>Vos contrats de location apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liste.map((c: any) => {
            const s = STATUT[c.statut] ?? STATUT.brouillon
            const monRole  = user.id === c.locataire_id ? 'Locataire' : 'Propriétaire'
            const autre    = user.id === c.locataire_id ? c.proprietaire?.nom : c.locataire?.nom
            const jaiSigne = user.id === c.locataire_id ? c.signe_par_locataire : c.signe_par_proprietaire
            const fraisARegler = user.id === c.proprietaire_id && c.statut === 'en_attente_paiement' && !c.frais_dossier_paye

            return (
              <Link key={c.id} href={`/mon-espace/contrats/${c.id}`}
                className="dashboard-card flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FAE8EC' }}>
                  {c.statut === 'signe' ? <CheckCircle2 size={20} style={{ color: '#2D6A4F' }} /> :
                   c.statut === 'en_attente_paiement' ? <AlertCircle size={20} style={{ color: '#D4A832' }} /> :
                   <Clock size={20} style={{ color: '#D4A832' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#1a0a00' }}>{c.bien?.titre ?? '—'}</p>
                  <p className="text-xs" style={{ color: '#7a5c3a' }}>{monRole} · avec {autre}</p>
                  <p className="text-xs" style={{ color: '#7a5c3a' }}>{formatPrix(c.loyer_mensuel)}/mois · {c.duree_mois} mois · dès {formatDate(c.date_debut)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.color}`}>{s.label}</span>
                  {c.statut === 'en_attente_signatures' && !jaiSigne && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">À signer</span>}
                  {fraisARegler && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">Frais à payer</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
