export const VILLES_TOGO = [
  'Lomé', 'Kpalimé', 'Atakpamé', 'Sokodé', 'Kara',
  'Dapaong', 'Tsévié', 'Aného', 'Vogan', 'Notsé',
  'Bassar', 'Tchamba', 'Mango', 'Badou', 'Amlamé',
]

export const QUARTIERS_LOME = [
  'Adidogomé', 'Agoè', 'Agbalépédogan', 'Amoutivé', 'Bè',
  'Cacavéli', 'Djidjolé', 'Hédzranawoé', 'Kégué', 'Kodjoviakopé',
  'Légos', 'Nyékonakpoè', 'Tokoin', 'Wuiti', 'Zanguéra',
  'Ablogamé', 'Baguida', 'Dékon', 'Gbossimé', 'Légbassito',
]

export const TYPES_BIEN = [
  { value: 'maison',      label: 'Maison',       categorie: ['vente', 'location'] },
  { value: 'villa',       label: 'Villa',         categorie: ['vente', 'location'] },
  { value: 'appartement', label: 'Appartement',   categorie: ['vente', 'location'] },
  { value: 'studio',      label: 'Studio',        categorie: ['vente', 'location'] },
  { value: 'terrain',     label: 'Terrain',       categorie: ['vente'] },
  { value: 'immeuble',    label: 'Immeuble',      categorie: ['vente'] },
  { value: 'boutique',    label: 'Boutique',       categorie: ['vente', 'location'] },
  { value: 'magasin',     label: 'Magasin',        categorie: ['vente', 'location'] },
  { value: 'bureau',      label: 'Bureau',         categorie: ['vente', 'location'] },
] as const

export type TypeBien = typeof TYPES_BIEN[number]['value']

export const EQUIPEMENTS = [
  'Climatisation', 'Eau courante', 'Électricité', 'Groupe électrogène',
  'Parking', 'Piscine', 'Jardin', 'Gardien', 'Interphone',
  'Cuisine équipée', 'Meublé', 'Wifi', 'Balcon/Terrasse',
]

export const PRIX_RANGES_VENTE = [
  { label: 'Moins de 5M FCFA',     min: 0,          max: 5_000_000 },
  { label: '5M – 15M FCFA',         min: 5_000_000,  max: 15_000_000 },
  { label: '15M – 30M FCFA',        min: 15_000_000, max: 30_000_000 },
  { label: '30M – 50M FCFA',        min: 30_000_000, max: 50_000_000 },
  { label: 'Plus de 50M FCFA',      min: 50_000_000, max: null },
]

export const PRIX_RANGES_LOCATION = [
  { label: 'Moins de 50k/mois',    min: 0,       max: 50_000 },
  { label: '50k – 150k/mois',       min: 50_000,  max: 150_000 },
  { label: '150k – 300k/mois',      min: 150_000, max: 300_000 },
  { label: 'Plus de 300k/mois',     min: 300_000, max: null },
]
