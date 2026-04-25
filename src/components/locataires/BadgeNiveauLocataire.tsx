'use client'

import { Star, Check, AlertTriangle, ShieldAlert } from 'lucide-react'
import type { NiveauLocataire } from '@/lib/locataires/gestion-score'

interface Props {
  niveau: NiveauLocataire
  showForProprio?: boolean
  showForStaff?: boolean
  className?: string
}

export default function BadgeNiveauLocataire({
  niveau,
  showForProprio = false,
  showForStaff = false,
  className = '',
}: Props) {
  if (niveau === 'platine') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-accent-50 text-accent-700 border border-accent-200 ${className}`}>
        <Star size={11} className="fill-current" />
        Locataire de confiance
      </span>
    )
  }

  if (niveau === 'or') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ${className}`}>
        <Check size={11} />
        Bon locataire
      </span>
    )
  }

  if (niveau === 'standard') {
    // Invisible pour le locataire et les visiteurs — uniquement si staff l'affiche
    if (!showForProprio && !showForStaff) return null
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 ${className}`}>
        Profil standard
      </span>
    )
  }

  if (niveau === 'vigilance') {
    if (!showForProprio && !showForStaff) return null
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
        <AlertTriangle size={11} />
        {showForStaff ? 'Vigilance' : 'Annulations récentes'}
      </span>
    )
  }

  if (niveau === 'alerte') {
    if (!showForStaff) return null
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 ${className}`}>
        <ShieldAlert size={11} />
        Profil à examiner
      </span>
    )
  }

  if (niveau === 'suspendu' || niveau === 'banni') {
    if (!showForStaff) return null
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 ${className}`}>
        <ShieldAlert size={11} />
        {niveau === 'banni' ? 'Compte banni' : 'Suspendu'}
      </span>
    )
  }

  return null
}
