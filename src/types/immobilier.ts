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
  nb_pieces: number | null
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
