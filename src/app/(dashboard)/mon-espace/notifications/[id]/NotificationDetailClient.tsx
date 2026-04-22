'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
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
}

export default function NotificationDetailClient({ notif }: { notif: any }) {
  const router = useRouter()
  const icon = ICON_BY_TYPE[notif.type] ?? '🔔'

  return (
    <div className="p-4 md:p-6 pb-nav max-w-xl mx-auto">
      {/* Retour */}
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

        {/* Séparateur */}
        <div className="border-t border-gray-100" />

        {/* Corps complet */}
        <p className="text-brun-nuit leading-relaxed whitespace-pre-wrap">{notif.corps}</p>

        {/* Bouton d'action si lien disponible */}
        {notif.lien && (
          <Link
            href={notif.lien}
            className="btn-primary flex items-center justify-center gap-2 w-full"
          >
            <ExternalLink className="w-4 h-4" />
            Voir le détail
          </Link>
        )}
      </div>
    </div>
  )
}
