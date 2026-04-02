export type Role = 'visiteur' | 'utilisateur' | 'moderateur' | 'admin'

export type Categorie = 'vente' | 'location'
export type TypeLocation = 'courte_duree' | 'longue_duree'
export type StatutBien = 'brouillon' | 'en_attente' | 'publie' | 'rejete' | 'archive'
export type PrixType = 'total' | 'par_mois' | 'par_nuit'

export interface Profile {
  id:          string
  nom:         string
  phone:       string | null
  avatar_url:  string | null
  role:        Role
  bio:         string | null
  is_diaspora: boolean
  created_at:  string
}

export interface Bien {
  id:                string
  owner_id:          string
  categorie:         Categorie
  type_location:     TypeLocation | null
  type_bien:         string
  titre:             string
  description:       string | null
  slug:              string
  ville:             string
  commune:           string | null
  quartier:          string | null
  adresse:           string | null
  latitude:          number | null
  longitude:         number | null
  prix:              number
  devise:            string
  prix_type:         PrixType
  prix_negociable:   boolean
  superficie:        number | null
  nb_pieces:         number | null
  nb_chambres:       number | null
  nb_salles_bain:    number | null
  nb_etages:         number | null
  annee_construction: number | null
  equipements:       string[]
  photos:            string[]
  photo_principale:  string | null
  statut:            StatutBien
  moderateur_id:     string | null
  note_moderation:   string | null
  modere_at:         string | null
  publie_at:         string | null
  vues:              number
  favoris_count:     number
  is_featured:       boolean
  created_at:        string
  updated_at:        string
  // Join
  owner?:            Profile
}

export interface MessageContact {
  id:         string
  bien_id:    string
  owner_id:   string
  sender_id:  string | null
  nom:        string
  email:      string
  phone:      string | null
  message:    string
  lu:         boolean
  created_at: string
  bien?:      Pick<Bien, 'titre' | 'slug' | 'photo_principale'>
}

export interface Favori {
  id:         string
  user_id:    string
  bien_id:    string
  created_at: string
  bien?:      Bien
}

export interface Signalement {
  id:         string
  bien_id:    string
  user_id:    string | null
  raison:     string
  detail:     string | null
  traite:     boolean
  created_at: string
}

export interface SearchFilters {
  categorie:     Categorie | null
  type_location: TypeLocation | null
  type_bien:     string | null
  ville:         string | null
  quartier:      string | null
  prix_min:      number | null
  prix_max:      number | null
  query:         string
}
