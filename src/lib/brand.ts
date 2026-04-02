/**
 * BRAND CONFIGURATION
 * ─────────────────────────────────────────────
 * Remplacez ces valeurs dès que vous avez un nom et un logo officiels.
 * Ce fichier est importé dans Navbar, Footer, SEO, og:image, etc.
 * Un seul endroit à modifier pour mettre à jour toute la plateforme.
 */

export const BRAND = {
  /** Nom affiché dans la navbar, le footer, les balises SEO */
  name: 'Boris Immo',

  /** Tagline sous le logo */
  tagline: 'Votre bien, notre priorité',

  /** Chemin vers le logo (dans /public/) */
  logo: '/logo.png',

  /** Logo texte de secours si pas de logo image */
  logoText: 'BORIS IMMO',

  /** Couleur principale (doit correspondre à tailwind.config primary) */
  primaryColor: '#1a3c5e',

  /** Domaine du site */
  domain: 'boris-immo.com',

  /** URL complète */
  url: 'https://boris-immo.com',

  /** Email de contact */
  email: 'contact@boris-immo.com',

  /** Téléphone */
  phone: '',

  /** Réseaux sociaux */
  social: {
    facebook:  '',
    instagram: '',
    whatsapp:  '',
  },
} as const
