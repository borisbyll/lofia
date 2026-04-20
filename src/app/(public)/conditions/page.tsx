import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions générales d'utilisation de la plateforme LOFIA. — immobilier au Togo.",
}

export default function ConditionsPage() {
  return (
    <div className="section bg-cream min-h-screen">
      <div className="wrap max-w-3xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary-500 transition-colors">Accueil</Link>
          <span>/</span>
          <span className="text-gray-900">Conditions d&apos;utilisation</span>
        </div>

        <h1 className="page-title mb-2">Conditions d&apos;utilisation</h1>
        <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : avril 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-gray-700">

          <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">1. Présentation de la plateforme</h2>
            <p>
              {BRAND.name} est une plateforme immobilière en ligne accessible à l&apos;adresse{' '}
              <strong>lofia.vercel.app</strong> (et prochainement <strong>lofia.com</strong>), éditée et gérée depuis Lomé, Togo.
              La plateforme met en relation des propriétaires immobiliers et des personnes à la recherche de biens à acheter ou louer au Togo.
            </p>
            <p>
              En utilisant {BRAND.name}, vous acceptez les présentes conditions dans leur intégralité.
              Si vous n&apos;acceptez pas ces conditions, vous ne devez pas utiliser la plateforme.
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">2. Inscription et compte utilisateur</h2>
            <p>
              L&apos;accès à certaines fonctionnalités (publication d&apos;annonces, réservation, messagerie) nécessite la création d&apos;un compte.
              Vous vous engagez à fournir des informations exactes et à maintenir la confidentialité de vos identifiants.
            </p>
            <p>
              Vous êtes responsable de toutes les activités effectuées depuis votre compte.
              {BRAND.name} se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes conditions.
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">3. Publication d&apos;annonces</h2>
            <p>
              Les propriétaires peuvent publier des annonces de vente ou de location.
              En publiant une annonce, vous certifiez être le propriétaire légal du bien ou avoir l&apos;autorisation de le proposer.
            </p>
            <p>
              Les annonces de vente sont soumises à modération avant publication. {BRAND.name} se réserve le droit de refuser ou supprimer
              toute annonce jugée frauduleuse, inappropriée ou ne respectant pas les présentes conditions.
            </p>
            <p>
              Sont strictement interdits : les annonces mensongères, la publicité pour des biens inexistants,
              la discrimination dans l&apos;accès au logement et toute activité illégale.
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">4. Réservations et paiements</h2>
            <p>
              Les réservations de locations courte durée sont effectuées en ligne avec paiement sécurisé via FedaPay.
              Le montant est conservé en séquestre jusqu&apos;à 24h après la date d&apos;arrivée confirmée par le locataire.
            </p>
            <p>
              {BRAND.name} prélève des frais de service : 8% à la charge du locataire et 3% sur le montant reversé au propriétaire.
              Ces frais sont affichés clairement avant toute confirmation de réservation.
            </p>
            <p>
              En cas d&apos;annulation, les conditions spécifiques au bien s&apos;appliquent.
              Contactez le support via WhatsApp pour tout litige.
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">5. Responsabilités</h2>
            <p>
              {BRAND.name} agit en tant qu&apos;intermédiaire et ne peut être tenu responsable des informations
              publiées par les utilisateurs, de l&apos;état réel des biens, ni des litiges entre propriétaires et locataires.
            </p>
            <p>
              Chaque utilisateur est responsable de la véracité des informations qu&apos;il publie.
              {BRAND.name} met tout en œuvre pour vérifier les annonces mais ne peut garantir l&apos;exactitude de chaque publication.
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">6. Données personnelles</h2>
            <p>
              Les données collectées (nom, email, téléphone, documents d&apos;identité) sont utilisées uniquement
              pour le fonctionnement de la plateforme et ne sont pas vendues à des tiers.
            </p>
            <p>
              Conformément aux lois togolaises en vigueur, vous disposez d&apos;un droit d&apos;accès, de rectification
              et de suppression de vos données. Exercez ce droit en nous contactant à{' '}
              <a href={`mailto:${BRAND.email}`} className="text-primary-500 underline">{BRAND.email}</a>.
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">7. Modification des conditions</h2>
            <p>
              {BRAND.name} se réserve le droit de modifier les présentes conditions à tout moment.
              Les utilisateurs seront informés de toute modification significative par notification sur la plateforme.
              La poursuite de l&apos;utilisation du service après modification vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-black text-gray-900">8. Contact</h2>
            <p>
              Pour toute question relative aux présentes conditions, contactez-nous :
            </p>
            <ul className="space-y-1 text-sm">
              <li>Email : <a href={`mailto:${BRAND.email}`} className="text-primary-500">{BRAND.email}</a></li>
              <li>WhatsApp : <a href={`https://wa.me/${BRAND.whatsapp.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="text-primary-500">{BRAND.whatsapp}</a></li>
              <li>Adresse : {BRAND.adresse}</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  )
}
