'use client'
import { Calendar, Home, MapPin, Phone, User, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  agent: any
  profile: any
  visitesMois: any[]
  dossiersLD: any[]
  dossiersVente: any[]
}

const STATUT_LABEL: Record<string, { label: string; color: string }> = {
  demande_recue:       { label: 'Demande reçue',       color: 'bg-yellow-100 text-yellow-700' },
  visite_planifiee:    { label: 'Visite planifiée',     color: 'bg-blue-100 text-blue-700' },
  visite_effectuee:    { label: 'Visite effectuée',     color: 'bg-purple-100 text-purple-700' },
  locataire_interesse: { label: 'Intéressé',            color: 'bg-green-100 text-green-700' },
  proprietaire_accepte:{ label: 'Proprio OK',           color: 'bg-emerald-100 text-emerald-700' },
  contrat_en_cours:    { label: 'Contrat en cours',     color: 'bg-indigo-100 text-indigo-700' },
  acheteur_interesse:  { label: 'Acheteur intéressé',   color: 'bg-green-100 text-green-700' },
  vendeur_accepte:     { label: 'Vendeur OK',           color: 'bg-emerald-100 text-emerald-700' },
  virement_confirme:   { label: 'Virement confirmé',    color: 'bg-teal-100 text-teal-700' },
}

export default function AgentDashboardClient({ agent, profile, visitesMois, dossiersLD, dossiersVente }: Props) {
  const prochaines = [...dossiersLD, ...dossiersVente]
    .filter(d => d.date_visite)
    .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime())
    .slice(0, 5)

  return (
    <div className="p-4 md:p-6 pb-nav max-w-3xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title">Espace Agent</h1>
        <p className="page-subtitle">
          {agent ? `${agent.prenom} ${agent.nom}` : profile.nom} · {visitesMois.length} visite{visitesMois.length !== 1 ? 's' : ''} ce mois
        </p>
      </div>

      {!agent && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Votre profil agent n'est pas encore configuré. Contactez un administrateur.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-primary-500">{visitesMois.length}</p>
          <p className="text-xs text-brun-doux mt-1">Visites ce mois</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-primary-500">{dossiersLD.length}</p>
          <p className="text-xs text-brun-doux mt-1">Dossiers location</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-primary-500">{dossiersVente.length}</p>
          <p className="text-xs text-brun-doux mt-1">Dossiers vente</p>
        </div>
      </div>

      {prochaines.length > 0 && (
        <div className="dashboard-card">
          <h2 className="font-semibold text-brun-nuit mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500" /> Prochaines visites
          </h2>
          <div className="space-y-3">
            {prochaines.map(d => {
              const contact = d.locataire ?? d.acheteur
              const isLD = !!d.locataire
              return (
                <Link
                  key={d.id}
                  href={isLD
                    ? `/moderateur/dossiers/longue-duree/${d.id}`
                    : `/moderateur/dossiers/vente/${d.id}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-primary-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brun-nuit text-sm truncate">{d.bien?.titre}</p>
                    <p className="text-xs text-brun-doux">{d.bien?.ville} · {contact?.nom}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-primary-500">{formatDate(d.date_visite)}</p>
                    <p className="text-xs text-brun-doux">{isLD ? 'Location' : 'Vente'}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {dossiersLD.length > 0 && (
        <div className="dashboard-card">
          <h2 className="font-semibold text-brun-nuit mb-3">Dossiers Location Longue Durée</h2>
          <div className="space-y-2">
            {dossiersLD.map(d => {
              const s = STATUT_LABEL[d.statut]
              return (
                <Link
                  key={d.id}
                  href={`/moderateur/dossiers/longue-duree/${d.id}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-primary-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brun-nuit text-sm truncate">{d.bien?.titre}</p>
                    <p className="text-xs text-brun-doux">{d.reference} · {d.locataire?.nom}</p>
                    {d.locataire?.phone && (
                      <a href={`tel:${d.locataire.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-primary-500 mt-0.5">
                        <Phone className="w-3 h-3" />{d.locataire.phone}
                      </a>
                    )}
                  </div>
                  {s && <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.color}`}>{s.label}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {dossiersVente.length > 0 && (
        <div className="dashboard-card">
          <h2 className="font-semibold text-brun-nuit mb-3">Dossiers Vente</h2>
          <div className="space-y-2">
            {dossiersVente.map(d => {
              const s = STATUT_LABEL[d.statut]
              return (
                <Link
                  key={d.id}
                  href={`/moderateur/dossiers/vente/${d.id}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-primary-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brun-nuit text-sm truncate">{d.bien?.titre}</p>
                    <p className="text-xs text-brun-doux">{d.reference} · {d.acheteur?.nom}</p>
                    {d.acheteur?.phone && (
                      <a href={`tel:${d.acheteur.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-primary-500 mt-0.5">
                        <Phone className="w-3 h-3" />{d.acheteur.phone}
                      </a>
                    )}
                  </div>
                  {s && <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.color}`}>{s.label}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {dossiersLD.length === 0 && dossiersVente.length === 0 && (
        <div className="dashboard-card text-center py-12">
          <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-brun-nuit">Aucun dossier actif</p>
          <p className="text-sm text-brun-doux mt-1">Les dossiers vous seront assignés par un modérateur.</p>
        </div>
      )}
    </div>
  )
}
