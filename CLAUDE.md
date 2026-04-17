# CLAUDE.md — LOFIA. (ex Dôme Immobilier, ex boris-immo)

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Toutes les règles ci-dessous sont NON NÉGOCIABLES.
> Le design system (section 15) prime sur tout style par défaut de shadcn/ui ou Tailwind.

---

## 1. Contexte du projet
Plateforme immobilière pour le Togo (togolais résidents + diaspora).
Projet séparé de GESTORH (cabinet-gestorh.com).
Stack : **Next.js 14.2.29** + React 18.3.1 + TypeScript 5.6 + **Tailwind CSS v3.4.17** + Supabase + Vercel

## 2. Identité — NOM ET DOMAINE OFFICIELS
- **Nom officiel** : `LOFIA.` (avec le point, c'est le nom complet)
- **Domaine** : `logikahome.com`
- **Email** : `contact@logikahome.com`
- **WhatsApp** : `+22899794772`
- **Adresse** : `Lomé, Togo`
- **Anciens noms** : `boris-immo` → `Dôme Immobilier` → `LOFIA.` — **remplacer partout**
- Changement via `src/lib/brand.ts` — ✅ mis à jour (name: 'LOFIA.', logo: '/icons/icon.svg')
- **Logo** : cercle bordeaux + double anneau doré + trou de serrure blanc — voir composant `LogoLofia`
- **Favicon** : même icône serrure — `public/favicon.svg` et `public/icons/icon.svg` ✅ mis à jour
- **manifest.json** : ✅ mis à jour (name: "LOFIA. — Immobilier Togo", theme_color: #8B1A2E)
- ✅ `package.json` name → "lofia-immo" mis à jour

## 3. Deux catégories principales
1. **VENTE** (terrains, maisons, villas, immeubles, local commercial) → soumission + approbation modérateur
2. **LOCATION** (courte durée + longue durée : maisons, villas, appartements, studios, local commercial, bureaux, boutiques, magasins) → publication immédiate

## 4. Rôles utilisateurs
- `utilisateur` : peut publier des biens (défaut à l'inscription)
- `moderateur` : approuve/rejette les biens VENTE
- `admin` : accès complet + gestion utilisateurs

## 5. Architecture Next.js 14 App Router
Route groups dans `src/app/` :
- `(public)` — pages publiques : `/`, `/vente`, `/location`, `/biens/[slug]`, `/proprietaire/[id]`
- `(auth)` — `/connexion`, `/inscription`
- `(dashboard)` — `/mon-espace/*`, `/moderateur/*`, `/admin/*` (layout unifié avec sidebar + bottom nav)

**Pattern Suspense obligatoire** : tout composant utilisant `useSearchParams()` doit être dans un Suspense boundary.
Pattern : `page.tsx` = wrapper Suspense, `XClient.tsx` = composant réel.

**Middleware** : `src/middleware.ts` protège `/mon-espace`, `/moderateur`, `/admin` → redirect `/connexion?next=<path>` si non authentifié.
Matcher : tout sauf `_next/static`, `_next/image`, `favicon.ico`, fichiers statiques (.svg, .png, etc.)

**Supabase client** :
- Côté client : `import { supabase } from '@/lib/supabase/client'`
- Côté serveur (Server Components) : `import { createClient } from '@/lib/supabase/server'`

## 6. Base de données Supabase
**Projet ID** : `frxcxnzgdlumbjkgdozs`

**Migrations exécutées (dans l'ordre, fichiers réels) :**
- `001_init.sql` — profiles, biens, documents, avis, reservations, conversations, conversation_messages, favoris, messages_contact, notifications, signalements + RLS + index
- `002_messagerie_reservations_notifs.sql` — mises à jour messagerie, réservations, notifications
- `003_sequestre.sql` — colonnes séquestre, trigger `trg_liberation_fonds`, fonctions `confirmer_arrivee()` et `liberer_fonds_sequestre()`
- `004_avis.sql` — table avis (schéma initial)
- `004_postgis_cni_avis_commissions.sql` — PostGIS, colonnes CNI sur profiles, commissions, refinements avis
- `005_security_fixes.sql` — correctifs RLS, trigger `prevent_role_escalation` sur profiles
- `012_auto_termine_reservations.sql` — marquage automatique `statut=termine` après date_fin
- `013_increment_vues_avis_fixes.sql` — fonction RPC `increment_vues`, correctifs avis
- `014_fix_avis_schema.sql` — corrections finales schéma avis

**Tables principales et colonnes clés :**
- `profiles` — id, role, nom, phone, bio, is_diaspora, avatar_url, cni_recto_url, cni_verso_url, identite_verifiee
- `biens` — statut: brouillon/en_attente/publie/rejete/archive | categorie: vente/location | type_bien, type_location, prix, prix_type, prix_negociable, superficie, nb_pieces, nb_chambres, nb_salles_bain, nb_etages, annee_construction, ville, commune, quartier, adresse, latitude, longitude, photos[], photo_principale, equipements[], is_featured, vues, favoris_count, owner_id, moderateur_id, note_moderation, modere_at, publie_at, slug
- `reservations` — locataire_id, proprietaire_id, date_debut, date_fin, nb_nuits, prix_total, commission, montant_proprio, **commission_voyageur** (8%), **commission_hote** (3%), prix_nuit, statut, paiement_effectue, fedapay_status, fedapay_transaction_id, check_in_at, liberation_fonds_at, paiement_at, proprio_paye, proprio_paye_at
- `conversations` — id, bien_id, **proprietaire_id**, **locataire_id**, created_at (PAS user1_id/user2_id, PAS updated_at)
- `conversation_messages` — id, conversation_id, sender_id, contenu, lu, created_at (PAS messages_prive)
- `favoris`, `messages_contact`, `moderation_log`, `signalements`
- `notifications` — user_id, type, titre, corps, lien, lu
- `documents` — bien_id, type (titre_foncier/attestation/autre), url, nom, verified
- `avis` — bien_id, reservation_id, auteur_id, proprietaire_id, sujet_id, note (1-5), commentaire, type (locataire_note_proprio | proprio_note_locataire)

**Règles critiques DB :**
- Trigger : `statut=en_attente` pour VENTE, `statut=publie` pour LOCATION à l'insertion
- Trigger `trg_liberation_fonds` : `liberation_fonds_at = check_in_at + 24h`
- RLS activé sur toutes les tables — toutes les politiques utilisent `(select auth.uid())` (pas `auth.uid()` direct)

## 7. Supabase Storage
- Bucket : `biens-photos` (public)
- Remote patterns autorisés dans next.config.mjs : `frxcxnzgdlumbjkgdozs.supabase.co` et `*.supabase.co`

## 8. Edge Functions
- `supabase/functions/liberer-fonds/index.ts` — cron `*/5 * * * *` appelant `liberer_fonds_sequestre()`
- `supabase/functions/create-fedapay-transaction/index.ts` — création transaction FedaPay
- `supabase/functions/confirm-fedapay-payment/index.ts` — confirmation paiement FedaPay

## 9. Fichiers de configuration clés
| Fichier | Rôle |
|---|---|
| `src/lib/brand.ts` | Nom (Dôme), logo (null), tagline, domaine (logikahome.com), contacts |
| `src/lib/constants.ts` | VILLES_TOGO, TYPES_BIEN, EQUIPEMENTS, PRIX_RANGES_*, COMMISSION, RAYON_OPTIONS, TYPES_PAR_CATEGORIE, MOTIFS_SIGNALEMENT |
| `src/lib/utils.ts` | cn(), formatPrix(), formatDate(), formatDateCourt(), haversine(), formatDistance(), masquerTelephone(), slugify(), nbNuits(), formatRelative() |
| `src/app/globals.css` | Design system Tailwind v3 (@layer base/components : .card-bien, .btn-*, .badge-*, .wrap, .section, .prix, .input-field, .label-field, .stat-card, .dashboard-card) |
| `tailwind.config.ts` | Palette Dôme (primary=bordeaux, accent=or, cream, or-pale, brun-nuit, brun-doux, vert-foret) |
| `.env` | NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY + FEDAPAY_SECRET_KEY + NEXT_PUBLIC_GOOGLE_MAPS_KEY |
| `next.config.mjs` | Config Next.js — images remotePatterns + security headers (X-Frame-Options, HSTS, etc.) |
| `supabase/migrations/` | 9 fichiers SQL |
| `public/manifest.json` | PWA manifest — ⚠️ contient encore "Boris Immo" — à mettre à jour |
| `public/sw.js` | Service Worker — Network First strategy (CACHE_NAME: 'lofia-immo-v1') |

## 10. État d'avancement — ✅ TOUT COMPLÉTÉ

### Infrastructure
- Next.js 14.2.29 App Router, TypeScript 5.6, Tailwind CSS v3.4.17
- Design system complet (`globals.css` avec classes utilitaires Dôme)
- Supabase client/server (@supabase/ssr 0.5.2 + @supabase/supabase-js 2.101.1)
- Middleware auth (cookie sync + routes protégées)
- Zustand stores : `authStore` + `dashboardModeStore` (persisté localStorage `lofia-dashboard-mode`)
- Types TypeScript complets (`src/types/immobilier.ts`)
- PWA : manifest.json + sw.js + SwRegister
- `TYPES_PAR_CATEGORIE` dans constants.ts (Record<string, string[]>)
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy)

### Dépendances notables
- Radix UI (accordion, alert-dialog, avatar, checkbox, dialog, dropdown, label, popover, progress, scroll-area, select, separator, slot, switch, tabs, toast, tooltip)
- Framer Motion 12.38.0, Embla Carousel 8.5.2, Recharts 2.15.3
- React Hook Form 7.56.0 + Zod 3.24.2 + @hookform/resolvers
- Sonner 2.0.3 + React Hot Toast 2.5.2
- date-fns 4.1.0, Lucide React 0.469.0
- next-themes 0.4.6, vaul 1.1.2, cmdk 1.1.1, react-day-picker 8.10.1, sharp 0.33.5

### Pages publiques (`src/app/(public)/`)
- `/` — HeroSection, StatsSection, CategoriesSection, BiensFeatured, VillesSection, TrustSection, CtaSection
- `/vente` — VenteClient + Suspense wrapper, filtres géo/type/budget
- `/location` — LocationClient + Suspense wrapper, tabs courte/longue durée
- `/biens` — redirect vers /vente
- `/biens/[slug]` — Server Component + BienDetailClient + ReservationPanel + SignalementModal (carrousel Embla, avis)
- `/proprietaire/[id]` — Server Component + ProprietaireClient

### Auth (`src/app/(auth)/`)
- `/connexion` — Suspense wrapper + ConnexionClient
- `/inscription` — Suspense wrapper + InscriptionClient (2 étapes, flag diaspora, détection email dupliqué via `identities.length === 0`)

### Dashboard (`src/app/(dashboard)/`)
Layout unifié : sidebar desktop + bottom nav mobile (5 items, CTA Publier central)

- `/mon-espace` — stats + finance mode-aware (proprietaire/locataire)
- `/mon-espace/publier` — 4 étapes: type→détails→localisation→photos, GPS, upload Storage
- `/mon-espace/mes-biens` — tabs statuts, menu contextuel 3 points
- `/mon-espace/mes-biens/[id]/modifier` — edit avec photos existantes
- `/mon-espace/reservations` — vue proprio/locataire, séquestre, confirmer arrivée
- `/mon-espace/messages` — Demandes reçues (messages_contact)
- `/mon-espace/messagerie` — Conversations temps réel Supabase Realtime
- `/mon-espace/favoris` — grid BienCard avec onUnfavorite
- `/mon-espace/profil` — edit profil + avatar + CNI recto/verso
- `/mon-espace/paiement/[id]` — FedaPay widget, GPS révélé après paiement, reçu
- `/moderateur` — dashboard file d'attente (stats: en_attente/approuvés/rejetés/signalements)
- `/moderateur/biens/[id]` — approve/reject + notification proprio
- `/moderateur/signalements` — liste signalements modérateur
- `/admin` — finance plateforme (volume/commission/séquestre), Recharts, top biens, récentes réservations
- `/admin/utilisateurs` — changement rôle inline, vérification identité
- `/admin/biens` — tous les biens, filtres, archiver/supprimer
- `/admin/signalements` — tous signalements, suspension

### Composants (`src/components/`)
**Layout :**
- `layout/Navbar.tsx` — sticky header, logo, scroll effect, auth-aware, notif bell, user dropdown
- `layout/Footer.tsx` — pied de page desktop
- `layout/BottomNav.tsx` — nav mobile fixe en bas (safe-area-pb)
- `layout/NotifBell.tsx` — cloche realtime **(export default, pas named)**

**Home :**
- `home/HeroSection.tsx` — gradient bordeaux, barre de recherche + géoloc, tabs, stats (247 publiés / 94 hôtes / 12 villes), wave SVG
- `home/StatsSection.tsx`
- `home/CategoriesSection.tsx`
- `home/BiensFeatured.tsx` — Server Component
- `home/VillesSection.tsx`
- `home/TrustSection.tsx`
- `home/CtaSection.tsx`

**Biens :**
- `biens/BienCard.tsx` — prop `onUnfavorite?: (id: string) => void`
- `biens/BienCardSkeleton.tsx`
- `biens/GeoFilterBar.tsx` — contrôle géoloc + sélecteur rayon

**UI :**
- `ui/AvisModal.tsx` — notation 1-5 étoiles, commentaire 500 chars, insert table avis
- `ui/ConfirmModal.tsx` — modal de confirmation générique

**Providers :**
- `providers/AuthProvider.tsx` — appelle `useAuthStore.init()` au mount
- `providers/SwRegister.tsx` — enregistrement Service Worker PWA

✅ **Composant `LogoLofia` (src/components/lofia/LogoLofia.tsx) : CRÉÉ — utiliser partout (voir §15.4)**

## 11. Décisions techniques importantes
- **Commissions** : 8% payé par le locataire (`COMMISSION.VOYAGEUR_PCT`), 3% prélevé sur le paiement hôte (`COMMISSION.HOTE_PCT`) — `montant_proprio` calculé côté DB
- **Séquestre** : fonds libérés 24h après check-in (`liberation_fonds_at = check_in_at + 24h`)
- **Géolocalisation** : Haversine côté client (`haversine()` dans utils.ts) ; GPS exact révélé après paiement seulement
- **Prix** : FCFA uniquement — toujours formater avec `formatPrix()` depuis `@/lib/utils` (pas `formatFCFA`)
- **Photos** : Supabase Storage bucket `biens-photos`
- **Paiement** : simulation FedaPay sandbox — 3 Edge Functions (create, confirm, liberer-fonds)
- **Realtime** : `supabase.removeChannel(supabase.channel(name))` avant toute création de channel (React Strict Mode double-mount)
- **`Array.from(new Set(...))`** au lieu de `[...new Set(...)]` (TS sans downlevelIteration)
- **Apostrophes JSX** : utiliser `&apos;` ou double quotes `"l'adresse"` (pas de guillemets simples dans JSX string literals)
- **`next.config.mjs`** : extension obligatoire (Next.js 14.2.29 ne supporte pas `.ts`)
- **Dashboard mode** : persisté dans localStorage via Zustand persist (`lofia-dashboard-mode`)

## 12. Sécurité — état final
- 0 alertes critiques corrigeables
- Security headers sur toutes les routes : X-Frame-Options: DENY, HSTS, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
- RLS activé sur toutes les tables avec `(select auth.uid())` (pas `auth.uid()` direct)
- Trigger `prevent_role_escalation` sur profiles
- Secure email change : à activer dans Supabase Dashboard → Auth

## 13. Ce qui reste à faire
- [x] ~~Créer composant logo~~ → `src/components/lofia/LogoLofia.tsx` ✅ créé
- [x] ~~Mettre à jour `public/manifest.json`~~ → "LOFIA. — Immobilier Togo", theme_color #8B1A2E ✅
- [x] ~~Mettre à jour favicon et icône PWA~~ → `public/favicon.svg` + `public/icons/icon.svg` ✅
- [x] ~~Mettre à jour `src/lib/brand.ts`~~ → name: 'LOFIA.', logo: '/icons/icon.svg' ✅
- [x] ~~Intégrer `LogoLofia` dans Navbar, Footer, Dashboard layout~~ → ✅ intégré dans les 3 (Navbar l.71, Footer l.18, Dashboard layout l.129+226)
- [ ] Appliquer intégralement le design system (section 15) sur toutes les pages existantes
- [x] ~~Mettre à jour `package.json` : name → "lofia-immo"~~ → ✅ mis à jour
- [ ] Remplacer résidus "Dôme" dans commentaires : `globals.css` (4 occurrences), `tailwind.config.ts` (1 occurrence)
- [ ] Intégration FedaPay réelle (remplacer sandbox — clés prod disponibles)
- [ ] Système d'avis/reviews UI sur ProprietairePage (table `avis` existe, AvisModal existe)
- [ ] Page `/recherche` globale cross-catégories
- [ ] Déploiement Vercel + configuration domaine logikahome.com
- [ ] Configurer Site URL dans Supabase Dashboard → Auth → URL Configuration
- [ ] Déployer les 3 Edge Functions sur Supabase
- [ ] Upload logo Dôme réel dans `src/lib/brand.ts` (logo: null actuellement)
- [ ] Icônes PWA réelles (actuellement SVG placeholder `/icons/icon.svg`)
- [ ] Clé Google Maps `NEXT_PUBLIC_GOOGLE_MAPS_KEY` dans `.env` (présente mais vide)

## 14. Quirks techniques — ne jamais reproduire ces erreurs
- `conversations` n'a PAS de colonne `updated_at` — ne jamais l'utiliser dans les queries
- `conversations` utilise `proprietaire_id` et `locataire_id` — jamais `user1_id`/`user2_id`
- `conversation_messages` est le nom correct — jamais `messages_prive`
- `NotifBell.tsx` est un export default — jamais named export
- `next.config.mjs` — extension `.mjs` obligatoire, jamais `.ts`
- La fonction de formatage prix est **`formatPrix()`** dans `src/lib/utils.ts` — il n'existe PAS de `formatFCFA()` ni de `src/lib/utils/formatFCFA.ts`
- Tailwind CSS est **v3** (pas v4) — utiliser `@layer base/components/utilities`, PAS `@theme` ni `@import "tailwindcss"`
- Les noms Tailwind dans `tailwind.config.ts` sont : `primary` (bordeaux), `accent` (or) — PAS `bordeaux`/`or` directement
- Les classes CSS utilitaires Dôme sont dans `globals.css` : `.btn-primary`, `.btn-accent`, `.badge-vente`, `.prix`, `.card-bien`, `.input-field`, etc.
- `src/lib/config.ts` n'existe pas — ne jamais l'importer

---

## 15. ⚠️ DESIGN SYSTEM DÔME — RÈGLES VISUELLES ABSOLUES

> S'appliquent à CHAQUE composant, CHAQUE page, CHAQUE modification.
> Ne jamais utiliser les couleurs par défaut de shadcn/ui ou Tailwind sans les remplacer.
> Lire cette section avant de coder tout composant visuel.

### 15.1 Palette — valeurs réelles dans tailwind.config.ts

```ts
// tailwind.config.ts — noms EXACTS à utiliser
colors: {
  primary: {           // ← BORDEAUX
    DEFAULT: '#8B1A2E',
    50:  '#FAE8EC',
    100: '#F4C5CF',
    200: '#E8909F',
    300: '#D85A70',
    400: '#C73050',
    500: '#8B1A2E',    // ← couleur principale
    600: '#6B0F1E',
    700: '#4D0A15',
    foreground: '#ffffff',
  },
  accent: {            // ← OR
    DEFAULT: '#D4A832',
    50:  '#FDF8E8',
    100: '#F8EDBE',
    500: '#D4A832',
    600: '#B08A28',
    700: '#8C6D1F',
    foreground: '#ffffff',
  },
  cream:        '#FFFDF5',   // fond pages
  'or-pale':    '#F5E6C0',   // fond secondaire
  'brun-nuit':  '#1a0a00',   // texte principal
  'brun-doux':  '#7a5c3a',   // texte secondaire
  'vert-foret': '#2D6A4F',   // bouton géo / badges location
}
```

```css
/* globals.css — CSS variables (Tailwind v3 @layer base) */
:root {
  --background: 60 100% 98%;     /* #FFFDF5 crème */
  --foreground: 20 100% 5%;      /* #1a0a00 brun nuit */
  --ring: 349 69% 32%;           /* bordeaux */
  --radius: 0.75rem;
  /* + variables shadcn/ui standards */
}
```

### 15.2 Classes CSS utilitaires Dôme (globals.css)

Ces classes sont prêtes à l'emploi — **les utiliser en priorité** :

| Classe | Usage |
|---|---|
| `.btn-primary` | Bouton principal bordeaux (`bg-primary-500 text-white hover:bg-primary-600`) |
| `.btn-accent` | Bouton doré (`background-color: #D4A832`) |
| `.btn-outline` | Bouton bordure bordeaux |
| `.btn-ghost` | Bouton fantôme |
| `.btn-geo` | Bouton géolocalisation vert forêt |
| `.btn-danger` | Bouton danger rouge |
| `.btn-white` | Bouton blanc (sur fond coloré) |
| `.badge-vente` | Badge vente bordeaux clair |
| `.badge-courte` | Badge courte durée ambre |
| `.badge-longue` | Badge longue durée vert émeraude |
| `.badge-success` | Badge succès vert |
| `.badge-warning` | Badge avertissement |
| `.badge-danger` | Badge erreur rouge |
| `.badge-verifie` | Badge identité vérifiée |
| `.badge-en-attente` | Badge en attente |
| `.badge-geo` | Badge distance géo |
| `.card-bien` | Card propriété (rounded-2xl, border primary-50, hover shadow) |
| `.input-field` | Champ de saisie stylé Dôme |
| `.label-field` | Label de champ |
| `.prix` | Prix FCFA (`font-black text-primary-500`) |
| `.wrap` | Conteneur max-w-7xl centré |
| `.section` | Section `py-12 md:py-16` |
| `.stat-card` | Card statistique dashboard |
| `.dashboard-card` | Card dashboard générique |
| `.page-title` | Titre de page |
| `.page-subtitle` | Sous-titre de page |
| `.section-title` | Titre de section |
| `.skeleton` | Skeleton loader animé |
| `.pb-nav` | Padding bottom pour bottom nav mobile |
| `.safe-area-pb` | Safe area iOS |

### 15.3 Référence rapide couleurs Tailwind

| Élément | Classe Tailwind |
|---|---|
| Fond pages publiques | `bg-cream` |
| Texte principal | `text-brun-nuit` |
| Texte secondaire | `text-brun-doux` |
| Bouton primaire | `bg-primary-500 text-white hover:bg-primary-600` |
| Bouton secondaire | `bg-or-pale text-primary-500 border border-accent` |
| Bouton ghost | `border-2 border-primary-500 text-primary-500 hover:bg-primary-50` |
| Bouton géo | `text-white` + style inline `background-color: #2D6A4F` |
| Bouton désactivé | `bg-gray-100 text-gray-400 cursor-not-allowed` |
| Prix FCFA | `font-black text-primary-500` (ou classe `.prix`) |
| Topbar public | `bg-primary-500` |
| Dashboard Propriétaire header | `bg-primary-500` |
| Dashboard Locataire header | `bg-vert-foret` (inline `#2D6A4F`) |
| Modérateur header + sidebar | `bg-[#3d2c1e]` |
| Admin header + sidebar | `bg-[#1a0a00]` |
| Focus inputs | `focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400` |
| Fond inputs | `bg-white` |
| Border inputs | `border-primary-100` |

### 15.4 Logo LOFIA. — composant ✅ créé

```tsx
// src/components/lofia/LogoLofia.tsx — ✅ EXISTE
// Utiliser partout — jamais de texte "LOFIA." brut sans le composant

import { LogoLofia } from '@/components/lofia/LogoLofia'

// Sur fond clair (navbar publique, pages, etc.)
<LogoLofia variant="dark" />

// Sur fond bordeaux (dashboard, header sombre, etc.)
<LogoLofia variant="light" />

// Avec taille custom via className
<LogoLofia variant="dark" className="text-2xl" />
<LogoLofia variant="dark" className="text-3xl" />
```

**Anatomie du logo :**
- `L` + `FIA.` → texte Inter Black, couleur selon variant (bordeaux ou blanc)
- `O` → SVG inline : cercle bordeaux (#8B1A2E) + double anneau doré (#D4A832) + trou de serrure blanc
- `●` → petit point vert (#2D6A4F) en bas à droite du "."

**Favicon / icône PWA :** `public/favicon.svg` et `public/icons/icon.svg` → uniquement l'icône serrure (cercle bordeaux + anneau doré + serrure blanche)

### 15.5 Navigation mobile — barre fixe en bas, jamais hamburger

```tsx
// fixed bottom-0 left-0 right-0 — 5 éléments max
// bg-white border-t border-gray-100
// Élément actif : text-primary-500 + point indicateur bordeaux sous l'icône
```

### 15.6 Composants — règles visuelles

**BienCard :**
```
rounded-xl  border border-gray-100  bg-white
Jamais de shadow (shadow géré par .card-bien)
Placeholder image vente    : bg-or-pale
Placeholder image location : bg-emerald-50
```

**Boutons :**
```
rounded-xl  min-h-[44px]  px-5 py-2.5
Jamais de gradient  Ombre légère max (shadow-sm)
Utiliser les classes .btn-* de globals.css
```

**Formulaires :**
```
Label visible au-dessus du champ — jamais placeholder seul
Utiliser .input-field et .label-field
Focus : ring-2 ring-primary-500/20 + border-primary-400
Erreur : text-red-500 text-xs mt-1
```

### 15.7 Formatage prix FCFA — fonction obligatoire

```ts
// src/lib/utils.ts — UTILISER CETTE FONCTION
import { formatPrix } from '@/lib/utils'
// formatPrix(45000000) → "45 000 000 FCFA"
// Toujours afficher avec : font-black text-primary-500 (ou classe .prix)
```

⚠️ **Il n'existe PAS de `formatFCFA()` dans ce projet. La fonction s'appelle `formatPrix()`.**

### 15.8 Dashboard toggle Propriétaire / Locataire

```tsx
// src/store/dashboardModeStore.ts
// type DashboardMode = 'proprietaire' | 'locataire'
// Persisté: localStorage key 'dome-dashboard-mode'

// Propriétaire → header bg-primary-500 (bordeaux)
// Locataire    → header bg-[#2D6A4F] (vert forêt)
```

### 15.9 Interfaces par couleur de header

| Interface | Header + Sidebar |
|---|---|
| Pages publiques | `bg-primary-500` |
| Dashboard Propriétaire | `bg-primary-500` |
| Dashboard Locataire | `bg-[#2D6A4F]` |
| Modérateur | `bg-[#3d2c1e]` |
| Admin | `bg-[#1a0a00]` |

### 15.10 Performance

```
next/image        — obligatoire, jamais <img>
Google Maps       — dynamic import { ssr: false }
Listes            — pagination 12 items max
Skeletons         — obligatoires (BienCardSkeleton + classe .skeleton)
Animations        — légères uniquement (transition-all duration-200/300, framer-motion ok)
Vidéo autoplay    — interdit
Carousel photos   — Embla Carousel (embla-carousel-react)
Charts admin      — Recharts
```

### 15.11 ✅ Checklist avant chaque composant visuel

- [ ] Fond page : `bg-cream` ?
- [ ] Prix : `formatPrix()` + `font-black text-primary-500` ?
- [ ] Badges : classes `.badge-*` de globals.css ?
- [ ] Navigation mobile : barre fixe en bas (pas hamburger) ?
- [ ] Images : `next/image` ?
- [ ] Zones tactiles : `min-h-[44px]` sur mobile ?
- [ ] Inputs : label visible + `.input-field` + focus primary ?
- [ ] Skeleton screen implémenté ?
- [ ] Police minimum 14px sur mobile ?
- [ ] Logo : composant `LogoDome` utilisé ?
- [ ] Couleur header : correspond au tableau 15.9 ?
- [ ] Classes CSS utilitaires Dôme utilisées (`.btn-primary`, `.card-bien`, etc.) ?

---

*LOFIA. — CLAUDE.md v4.1 — Synchronisation état réel (localStorage, LogoLofia intégré, package.json) — Avril 2026*
*Ce fichier remplace tous les fichiers CLAUDE.md précédents.*
