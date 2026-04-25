'use client'

import { Zap } from 'lucide-react'

export default function ForceMajeureBadge() {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-primary-600 bg-primary-50 border border-primary-100 cursor-help"
      title="Décès, hospitalisation, urgence administrative — nous comprenons. Annulation sur justificatif acceptée."
    >
      <Zap size={11} className="text-primary-500" />
      <span>Annulation pour cas exceptionnels acceptée</span>
    </div>
  )
}
