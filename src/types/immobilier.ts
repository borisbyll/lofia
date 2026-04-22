export type Role = 'utilisateur' | 'moderateur' | 'admin'
export type StatutBien = 'brouillon' | 'en_attente' | 'publie' | 'rejete' | 'archive'
export type CategorieBien = 'vente' | 'location'
export type TypeLocation = 'courte_duree' | 'longue_duree'
export type StatutReservation = 'en_attente' | 'confirme' | 'annule' | 'termine' | 'en_sejour'

export interface Profile {
  id: string
  nom: string | null
  phone: string | null
  avatar_url: string | null
  role: Role
  bio: string | null
  is_diaspora: boolean
  cni_recto_url: string | null
  cni_verso_url: string | null
  identite_verifiee: boolean
  created_at: string
  updated_at: string
}

export interface Bien {
  id: string
  owner_id: string
  slug: string
  titre: string
  description: string | null
  categorie: CategorieBien
  type_bien: string
  type_location: TypeLocation | null
  statut: StatutBien
  prix: number
  prix_type: string | null
  prix_negociable: boolean
  superficie: number | null
  nb_salons: number | null
  nb_chambres: number | null
  nb_salles_bain: number | null
  nb_etages: number | null
  annee_construction: number | null
  ville: string
  commune: string | null
  quartier: string | null
  adresse: string | null
  latitude: number | null
  longitude: number | null
  photos: string[]
  photo_principale: string | null
  equipements: string[]
  is_featured: boolean
  niveau_sponsoring: 'standard' | 'boost' | 'premium'
  score_tri: number
  sponsoring_actif_jusqu: string | null
  vues: number
  favoris_count: number
  moderateur_id: string | null
  note_moderation: string | null
  modere_at: string | null
  publie_at: string | null
  created_at: string
  updated_at: string
  // Relations jointes
  proprietaire?: Profile
}

export interface Document {
  id: string
  bien_id: string
  type: 'titre_foncier' | 'attestation' | 'autre'
  url: string
  nom: string | null
  verified: boolean
  created_at: string
}

export interface Avis {
  id: string
  bien_id: string
  reservation_id: string | null
  auteur_id: string
  proprietaire_id: string
  sujet_id: string | null
  note: number
  commentaire: string | null
  type: 'locataire_note_proprio' | 'proprio_note_locataire'
  created_at: string
  auteur?: Profile
}

export interface Reservation {
  id: string
  bien_id: string
  locataire_id: string
  proprietaire_id: string
  date_debut: string
  date_fin: string
  nb_nuits: number
  prix_total: number
  commission: number
  montant_proprio: number
  commission_voyageur: number
  commission_hote: number
  prix_nuit: number | null
  statut: StatutReservation
  paiement_effectue: boolean
  fedapay_status: string | null
  fedapay_transaction_id: string | null
  check_in_at: string | null
  liberation_fonds_at: string | null
  paiement_at: string | null
  proprio_paye: boolean
  proprio_paye_at: string | null
  created_at: string
  updated_at: string
  bien?: Bien
  locataire?: Profile
  proprietaire?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: string
  titre: string
  corps: string
  lien: string | null
  lu: boolean
  created_at: string
}

export interface Conversation {
  id: string
  bien_id: string | null
  proprietaire_id: string
  locataire_id: string
  created_at: string
  bien?: Bien
  proprietaire?: Profile
  locataire?: Profile
}

export interface MessagePrive {
  id: string
  conversation_id: string
  sender_id: string
  contenu: string
  lu: boolean
  created_at: string
  sender?: Profile
}

export interface Signalement {
  id: string
  bien_id: string
  user_id: string
  raison: string
  detail: string | null
  traite: boolean
  created_at: string
  bien?: Bien
  auteur?: Profile
}

export interface MiseEnRelation {
  id: string
  bien_id: string
  locataire_id: string
  proprietaire_id: string
  code_visite: string
  token_confirmation: string
  visite_confirmee_locataire: boolean
  visite_confirmee_proprietaire: boolean
  statut: 'en_attente' | 'visite_confirmee' | 'contrat_genere' | 'signe' | 'expire' | 'annule'
  message: string | null
  expire_at: string
  created_at: string
  bien?: Bien
  locataire?: Profile
  proprietaire?: Profile
}

export interface ContratLocation {
  id: string
  mise_en_relation_id: string
  bien_id: string
  locataire_id: string
  proprietaire_id: string
  numero_contrat: string
  loyer_mensuel: number
  charges: number
  depot_garantie: number
  frais_dossier: number
  frais_dossier_paye: boolean
  date_debut: string
  duree_mois: number
  token_signature_locataire: string
  token_signature_proprietaire: string
  signature_locataire: boolean
  signature_proprietaire: boolean
  statut: 'en_attente_signatures' | 'en_attente_paiement' | 'signe' | 'resilie' | 'expire'
  pdf_url: string | null
  created_at: string
  bien?: Bien
  locataire?: Profile
  proprietaire?: Profile
}

export interface DemandeVisiteVente {
  id: string
  bien_id: string
  acheteur_id: string
  vendeur_id: string
  code_visite: string
  token_confirmation: string
  visite_confirmee_acheteur: boolean
  visite_confirmee_vendeur: boolean
  statut: 'en_attente' | 'visite_confirmee' | 'offre_faite' | 'annule'
  message: string | null
  created_at: string
  bien?: Bien
  acheteur?: Profile
  vendeur?: Profile
}

export interface OffreAchat {
  id: string
  demande_visite_id: string
  bien_id: string
  acheteur_id: string
  vendeur_id: string
  prix_propose: number
  prix_accepte: number | null
  message_acheteur: string | null
  message_vendeur: string | null
  statut: 'en_attente' | 'acceptee' | 'refusee' | 'contre_offre'
  created_at: string
  bien?: Bien
  acheteur?: Profile
  vendeur?: Profile
}

export interface PromesseVente {
  id: string
  offre_id: string
  bien_id: string
  acheteur_id: string
  vendeur_id: string
  numero_promesse: string
  prix_vente: number
  commission_lofia: number
  token_signature_acheteur: string
  token_signature_vendeur: string
  signature_acheteur: boolean
  signature_vendeur: boolean
  statut: 'en_attente_signatures' | 'signe' | 'vendu'
  pdf_url: string | null
  conditions: string | null
  date_limite_signature: string | null
  created_at: string
  bien?: Bien
  acheteur?: Profile
  vendeur?: Profile
}

export interface Sponsorisation {
  id: string
  bien_id: string
  proprietaire_id: string
  formule: 'boost' | 'premium'
  montant: number
  date_debut: string
  date_fin: string
  fedapay_transaction_id: string | null
  statut: 'en_attente' | 'actif' | 'expire' | 'annule'
  created_at: string
  bien?: Bien
}
