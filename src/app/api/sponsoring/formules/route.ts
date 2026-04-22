import { NextResponse } from 'next/server'

export const FORMULES = [
  {
    id: 'boost',
    nom: 'Boost',
    prix: 5000,
    duree_jours: 7,
    score_tri: 10,
    avantages: [
      'Mise en avant dans les résultats',
      'Badge "Boost" sur la fiche',
      '3× plus de visibilité',
      '7 jours',
    ],
  },
  {
    id: 'premium',
    nom: 'Premium',
    prix: 15000,
    duree_jours: 30,
    score_tri: 20,
    avantages: [
      'Position prioritaire en tête',
      'Badge "Premium" doré',
      '10× plus de visibilité',
      'Statistiques détaillées',
      '30 jours',
    ],
  },
]

export async function GET() {
  return NextResponse.json({ formules: FORMULES })
}
