'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, CheckCircle, Eye, FileText, Star, Home } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const ICON_BY_TYPE: Record<string, string> = {
  reservation_nouvelle: '🏠', reservation_confirmee: '✅', reservation_annulee: '❌',
  paiement_recu: '💰', liberation_fonds: '💸', paiement: '💰',
  bien_approuve: '✅', bien_rejete: '❌', bien_signale: '🚨', signalement: '🚨',
  message_nouveau: '💬', avis_nouveau: '⭐', identite_verifiee: '🛡️',
  promesse_a_signer: '📝', promesse_signee: '✅', vente_finalisee: '🏆',
  offre_repondue: '📨', nouvelle_offre_achat: '💼',
  contrat_a_signer: '📝', contrat_signe: '✅', frais_dossier_a_payer: '💰',
  demande_visite_vente: '👀', visite_vente_confirmee: '✅',
  mise_en_relation: '🤝', visite_confirmee: '✅',
  sponsoring_active: '⭐', sponsoring_expire_bientot: '⏳',
  paiement_confirme: '✅', nouvelle_reservation: '🏠',
  demande_reservation: '🏠', demande_envoyee: '📤', demande_confirmee: '🎉',
  paiement_echec_max: '⚠️',
}

// Libellé et icône du bouton d'action selon le type de notification
const CTA_BY_TYPE: Record<string, { label: string; Icon: any }> = {
  demande_reservation:          { label: 'Voir les détails et répondre',  Icon: Eye },
  demande_envoyee:              { label: 'Suivre ma demande',             Icon: Eye },
  demande_confirmee:            { label: 'Payer maintenant',              Icon: CreditCard },
  paiement_confirme:            { label: 'Voir ma réservation',           Icon: CheckCircle },
  nouvelle_reservation:         { label: 'Voir la réservation',           Icon: Home },
  paiement_echec_max:           { label: 'Voir mes réservations',         Icon: Home },
  frais_dossier_a_payer:        { label: 'Payer les frais de dossier',    Icon: CreditCard },
  contrat_a_signer:             { label: 'Voir et signer le contrat',     Icon: FileText },
  contrat_signe:                { label: 'Voir le contrat',               Icon: FileText },
  promesse_a_signer:            { label: 'Voir et signer la promesse',    Icon: FileText },
  promesse_signee:              { label: 'Voir la promesse',              Icon: FileText },
  vente_finalisee:              { label: 'Voir le dossier de vente',      Icon: CheckCircle },
  nouvelle_offre_achat:         { label: 'Voir et répondre à l\'offre',   Icon: Eye },
  offre_repondue:               { label: 'Voir la réponse',               Icon: Eye },
  sponsoring_active:            { label: 'Voir les statistiques',         Icon: Star },
  bien_approuve:                { label: 'Voir mon annonce',              Icon: Eye },
  bien_rejete:                  { label: 'Voir les détails',              Icon: Eye },
  visite_vente_confirmee:       { label: 'Faire une offre',               Icon: Eye },
  mise_en_relation:             { label: 'Voir la demande',               Icon: Eye },
  visite_confirmee:             { label: 'Voir le dossier',               Icon: Eye },
}

const LIEN_VALIDES = [
  '/mon-espace/', '/moderateur/', '/admin/',
  '/biens/', '/proprietaire/',
  '/reservations/', '/longue-duree/', '/vente/', '/avis/',
]

export default function NotificationDetailClient({ notif }: { notif: any }) {
  const router = useRouter()
  const icon = ICON_BY_TYPE[notif.type] ?? '🔔'
  const cta  = CTA_BY_TYPE[notif.type]
  const lienValide = notif.lien && LIEN_VALIDES.some(p => notif.lien.startsWith(p))

  return (
    <div className="p-4 md:p-6 pb-nav max-w-xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-brun-doux hover:text-primary-500 transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux notifications
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {/* Icône + titre */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-brun-nuit text-lg leading-snug">{notif.titre}</h1>
            <p className="text-xs text-brun-doux mt-1">{formatDate(notif.created_at)}</p>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Corps */}
        <p className="text-brun-nuit leading-relaxed whitespace-pre-wrap">{notif.corps}</p>

        {/* Bouton d'action */}
        {lienValide && (
          <Link
            href={notif.lien}
            className="btn-primary flex items-center justify-center gap-2 w-full"
          >
            {cta && <cta.Icon className="w-4 h-4" />}
            {cta?.label ?? 'Voir le détail'}
          </Link>
        )}
      </div>
    </div>
  )
}
