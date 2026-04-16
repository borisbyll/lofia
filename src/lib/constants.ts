/** Villes du Togo */
export const VILLES_TOGO = [
  'Lomé', 'Kpalimé', 'Atakpamé', 'Sokodé', 'Kara',
  'Tsévié', 'Aného', 'Notsé', 'Dapaong', 'Mango',
  'Bassar', 'Bafilo', 'Kandé', 'Niamtougou', 'Pagouda',
] as const

/** Types de biens */
export const TYPES_BIEN = [
  { value: 'maison',       label: 'Maison',          categorie: ['vente', 'location'] },
  { value: 'villa',        label: 'Villa',            categorie: ['vente', 'location'] },
  { value: 'appartement',  label: 'Appartement',      categorie: ['vente', 'location'] },
  { value: 'studio',       label: 'Studio',           categorie: ['location'] },
  { value: 'terrain',      label: 'Terrain',          categorie: ['vente'] },
  { value: 'immeuble',     label: 'Immeuble',         categorie: ['vente'] },
  { value: 'local_comm',   label: 'Local commercial', categorie: ['vente', 'location'] },
  { value: 'bureau',       label: 'Bureau',           categorie: ['location'] },
  { value: 'boutique',     label: 'Boutique',         categorie: ['location'] },
  { value: 'magasin',      label: 'Magasin',          categorie: ['location'] },
] as const

/** Équipements */
export const EQUIPEMENTS = [
  'Climatisation', 'Wi-Fi', 'Parking', 'Piscine', 'Gardien',
  'Groupe électrogène', 'Eau courante', 'Cuisine équipée',
  'Lave-linge', 'Télévision', 'Terrasse', 'Jardin',
] as const

/** Plages de prix — Vente */
export const PRIX_RANGES_VENTE = [
  { label: 'Moins de 5M', min: 0, max: 5_000_000 },
  { label: '5M – 15M',    min: 5_000_000, max: 15_000_000 },
  { label: '15M – 30M',   min: 15_000_000, max: 30_000_000 },
  { label: '30M – 50M',   min: 30_000_000, max: 50_000_000 },
  { label: '50M – 100M',  min: 50_000_000, max: 100_000_000 },
  { label: 'Plus de 100M', min: 100_000_000, max: null },
] as const

/** Plages de prix — Location mensuelle */
export const PRIX_RANGES_LOCATION = [
  { label: 'Moins de 30k',  min: 0, max: 30_000 },
  { label: '30k – 80k',     min: 30_000, max: 80_000 },
  { label: '80k – 150k',    min: 80_000, max: 150_000 },
  { label: '150k – 300k',   min: 150_000, max: 300_000 },
  { label: 'Plus de 300k',  min: 300_000, max: null },
] as const

/** Plages de prix — Location nuitée */
export const PRIX_RANGES_NUIT = [
  { label: 'Moins de 10k',  min: 0, max: 10_000 },
  { label: '10k – 25k',     min: 10_000, max: 25_000 },
  { label: '25k – 50k',     min: 25_000, max: 50_000 },
  { label: '50k – 100k',    min: 50_000, max: 100_000 },
  { label: 'Plus de 100k',  min: 100_000, max: null },
] as const

/** Commissions (CDC §5) */
export const COMMISSION = {
  VOYAGEUR_PCT: 8,   // 8% payé par le locataire
  HOTE_PCT: 3,       // 3% prélevé sur le paiement hôte
} as const

/** Rayon géolocalisation */
export const RAYON_OPTIONS = [
  { label: '500 m', value: 0.5 },
  { label: '1 km',  value: 1 },
  { label: '2 km',  value: 2 },
  { label: '5 km',  value: 5 },
  { label: '10 km', value: 10 },
] as const

/** Types par catégorie (helper) */
export const TYPES_PAR_CATEGORIE: Record<string, string[]> = {
  vente:    ['Maison', 'Villa', 'Appartement', 'Terrain', 'Immeuble', 'Local commercial'],
  location: ['Maison', 'Villa', 'Appartement', 'Studio', 'Local commercial', 'Bureau', 'Boutique', 'Magasin'],
}

/** Motifs de signalement */
export const MOTIFS_SIGNALEMENT = [
  'Annonce frauduleuse',
  'Photos non conformes',
  'Prix incorrect',
  'Bien inexistant',
  'Contenu inapproprié',
  'Informations trompeuses',
  'Autre',
] as const
