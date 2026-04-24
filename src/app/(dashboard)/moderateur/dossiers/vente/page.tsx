import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'

const STATUT_LABEL: Record<string, string> = {
  demande_recue:       'Demande reçue',
  visite_planifiee:    'Visite planifiée',
  visite_effectuee:    'Visite effectuée',
  acheteur_interesse:  'Acheteur intéressé',
  vendeur_accepte:     'Vendeur OK',
  promesse_en_cours:   'Promesse en cours',
  promesse_signee:     'Promesse signée',
  virement_en_attente: 'Virement en attente',
  virement_confirme:   'Virement confirmé',
  vendu:               'Vendu',
  expire:              'Expiré',
  refuse:              'Refusé',
}

export default async function DossiersVentePage() {
  const { data: dossiers } = await supabaseAdmin
    .from('dossiers_vente')
    .select('id, reference, statut, date_visite, created_at, bien:biens(titre, ville), acheteur:profiles!acheteur_id(nom, phone)')
    .not('statut', 'in', '(vendu,expire,refuse)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-4 md:p-6 pb-nav max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/moderateur" className="flex items-center gap-1 text-sm text-brun-doux hover:text-primary-500">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <h1 className="page-title">Dossiers Vente</h1>
      </div>

      {(dossiers ?? []).length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <p className="text-brun-doux">Aucun dossier actif</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(dossiers ?? []).map((d: any) => (
            <Link key={d.id} href={`/moderateur/dossiers/vente/${d.id}`}
              className="dashboard-card flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brun-nuit truncate">{d.bien?.titre}</p>
                <p className="text-xs text-brun-doux">{d.bien?.ville} · {d.acheteur?.nom}</p>
                <p className="font-mono text-xs text-primary-500 mt-0.5">{d.reference}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium">
                  {STATUT_LABEL[d.statut] ?? d.statut}
                </span>
                {d.date_visite && <p className="text-xs text-brun-doux mt-1">{formatDate(d.date_visite)}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
