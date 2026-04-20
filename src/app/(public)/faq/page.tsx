import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'FAQ — Questions fréquentes',
  description: 'Toutes les réponses à vos questions sur LOFIA. — publication d\'annonces, réservations, paiements et sécurité.',
}

const FAQS = [
  {
    section: 'Publication d\'annonces',
    items: [
      {
        q: 'Comment publier un bien sur LOFIA. ?',
        a: 'Créez un compte, connectez-vous puis cliquez sur "Publier" dans votre espace. Remplissez les informations du bien, ajoutez des photos et soumettez. Les biens en location sont publiés immédiatement ; les biens en vente sont examinés par un modérateur sous 24h.',
      },
      {
        q: 'Quelle est la différence entre location courte durée et longue durée ?',
        a: 'La courte durée est destinée aux séjours temporaires (prix à la nuit, réservation en ligne avec paiement sécurisé). La longue durée est pour les locations classiques (prix au mois, contact direct avec le propriétaire).',
      },
      {
        q: 'Pourquoi mon bien en vente est-il "en attente" ?',
        a: 'Les biens en vente passent par une validation manuelle pour garantir la qualité des annonces. Un modérateur examine votre bien et vous notifie de sa décision sous 24h ouvrées.',
      },
      {
        q: 'Puis-je modifier mon annonce après publication ?',
        a: 'Oui, rendez-vous dans "Mon espace → Mes annonces", cliquez sur les 3 points à côté du bien et sélectionnez "Modifier".',
      },
    ],
  },
  {
    section: 'Réservations et paiements',
    items: [
      {
        q: 'Comment réserver un bien en location courte durée ?',
        a: 'Sur la page du bien, sélectionnez vos dates d\'arrivée et de départ, vérifiez le total et cliquez "Réserver". Vous serez redirigé vers la page de paiement sécurisé via FedaPay.',
      },
      {
        q: 'Quels moyens de paiement sont acceptés ?',
        a: 'LOFIA. accepte les paiements mobiles (Moov Money, Flooz/T-Money) via FedaPay, la plateforme de paiement de référence en Afrique de l\'Ouest.',
      },
      {
        q: 'Qu\'est-ce que le système de séquestre ?',
        a: 'Pour protéger les deux parties, le paiement est conservé en séquestre jusqu\'à 24h après votre arrivée. Si tout se passe bien, les fonds sont automatiquement reversés au propriétaire. En cas de litige, contactez-nous.',
      },
      {
        q: 'Comment obtenir l\'adresse exacte du bien ?',
        a: 'Pour les locations courte durée, l\'adresse exacte et les coordonnées GPS sont communiquées uniquement après confirmation de votre paiement, pour protéger la vie privée du propriétaire.',
      },
      {
        q: 'Quelles sont les commissions ?',
        a: 'LOFIA. prélève 8% de frais de service sur le montant payé par le locataire, et 3% sur le montant reversé au propriétaire. Ces frais couvrent la sécurisation des paiements, l\'assurance et le support.',
      },
    ],
  },
  {
    section: 'Sécurité et confiance',
    items: [
      {
        q: 'Comment LOFIA. vérifie-t-elle les propriétaires ?',
        a: 'Les propriétaires peuvent soumettre une pièce d\'identité (CNI recto/verso) pour obtenir le badge "Identité vérifiée". Ce badge indique qu\'un modérateur a validé l\'identité de la personne.',
      },
      {
        q: 'Que faire si un bien ne correspond pas à l\'annonce ?',
        a: 'Signalez le bien via le bouton "Signaler cette annonce" sur la page du bien. Notre équipe examine chaque signalement sous 48h. Vous pouvez aussi nous contacter directement sur WhatsApp.',
      },
      {
        q: 'Mes données personnelles sont-elles protégées ?',
        a: 'Oui. LOFIA. n\'affiche jamais votre numéro de téléphone complet publiquement. Vos documents CNI sont stockés de façon privée et ne sont accessibles qu\'à vous et aux modérateurs.',
      },
    ],
  },
  {
    section: 'Compte et profil',
    items: [
      {
        q: 'Je suis de la diaspora togolaise, puis-je utiliser LOFIA. ?',
        a: 'Absolument. LOFIA. est conçue pour les Togolais résidents et la diaspora. Cochez "Je suis de la diaspora" lors de l\'inscription pour un profil adapté.',
      },
      {
        q: 'Comment changer mon mot de passe ?',
        a: 'Sur la page de connexion, cliquez sur "Mot de passe oublié ?". Un email de réinitialisation vous sera envoyé.',
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="section bg-cream min-h-screen">
      <div className="wrap max-w-3xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary-500 transition-colors">Accueil</Link>
          <span>/</span>
          <span className="text-gray-900">FAQ</span>
        </div>

        <h1 className="page-title mb-2">Questions fréquentes</h1>
        <p className="page-subtitle mb-10">Tout ce que vous devez savoir sur {BRAND.name}</p>

        <div className="space-y-10">
          {FAQS.map(section => (
            <div key={section.section}>
              <h2 className="text-base font-black text-primary-500 uppercase tracking-wide mb-4 pb-2 border-b border-primary-100">
                {section.section}
              </h2>
              <div className="space-y-3">
                {section.items.map(item => (
                  <details key={item.q} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                      {item.q}
                      <ChevronDown size={16} className="shrink-0 text-gray-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-12 bg-primary-50 border border-primary-100 rounded-2xl p-6 text-center">
          <p className="font-bold text-gray-900 mb-1">Vous n&apos;avez pas trouvé votre réponse ?</p>
          <p className="text-sm text-gray-600 mb-4">Notre équipe est disponible sur WhatsApp</p>
          <a
            href={`https://wa.me/${BRAND.whatsapp.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary inline-flex"
          >
            Contacter le support
          </a>
        </div>

      </div>
    </div>
  )
}
