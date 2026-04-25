import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default async function HistoriqueLocatairePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/mon-espace')

  const [{ data: locataire }, { data: score }, { data: historique }] = await Promise.all([
    supabase.from('profiles').select('nom, phone').eq('id', params.id).single(),
    supabase.from('scores_locataires').select('*').eq('locataire_id', params.id).single(),
    supabase
      .from('historique_score_locataire')
      .select('*')
      .eq('locataire_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const EVENEMENT_LABELS: Record<string, string> = {
    reservation_honoree: 'Réservation honorée',
    annulation_retractation: 'Annulation (rétractation 2h)',
    annulation_72h: 'Annulation > 72h',
    annulation_24_72h: 'Annulation 24h–72h',
    annulation_moins_24h: 'Annulation < 24h',
    no_show: 'No-show',
    force_majeure_validee: 'Force majeure validée',
    force_majeure_refusee: 'Force majeure refusée',
    avis_positif: 'Avis positif reçu',
    avis_negatif: 'Avis négatif reçu',
    degradation: 'Signalement dégradation',
    recuperation_naturelle: 'Récupération naturelle',
    bonus_consecutif: 'Bonus 3 réservations consécutives',
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <Link href="/admin/locataires" className="inline-flex items-center gap-1.5 text-sm text-brun-doux hover:text-primary-500 mb-3">
          <ArrowLeft size={14} /> Scores locataires
        </Link>
        <h1 className="page-title">{locataire?.nom ?? 'Locataire'}</h1>
        <p className="text-sm text-brun-doux mt-0.5">{locataire?.phone ?? ''}</p>
      </div>

      {/* Résumé score */}
      {score && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="stat-card text-center">
            <p className="text-2xl font-black text-brun-nuit">{score.score}</p>
            <p className="text-xs text-brun-doux">Score actuel</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-black text-emerald-600 capitalize">{score.niveau}</p>
            <p className="text-xs text-brun-doux">Niveau</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-black text-brun-nuit">{score.reservations_honorees}</p>
            <p className="text-xs text-brun-doux">Séjours honorés</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-black text-red-500">{score.no_shows}</p>
            <p className="text-xs text-brun-doux">No-shows</p>
          </div>
        </div>
      )}

      {/* Historique */}
      <div className="dashboard-card">
        <h2 className="font-bold text-brun-nuit mb-4">Historique des événements</h2>
        {!historique || historique.length === 0 ? (
          <p className="text-sm text-brun-doux text-center py-6">Aucun événement enregistré</p>
        ) : (
          <div className="space-y-2">
            {historique.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {h.variation > 0
                    ? <TrendingUp size={14} className="text-emerald-500 shrink-0" />
                    : h.variation < 0
                    ? <TrendingDown size={14} className="text-red-500 shrink-0" />
                    : <Minus size={14} className="text-gray-400 shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm text-brun-nuit font-medium">{EVENEMENT_LABELS[h.evenement] ?? h.evenement}</p>
                    {h.notes && <p className="text-xs text-brun-doux truncate">{h.notes}</p>}
                    <p className="text-[10px] text-brun-doux/60">
                      {new Date(h.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-sm font-black ${h.variation > 0 ? 'text-emerald-600' : h.variation < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {h.variation > 0 ? '+' : ''}{h.variation}
                  </span>
                  <p className="text-[10px] text-brun-doux">{h.score_avant} → {h.score_apres}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
