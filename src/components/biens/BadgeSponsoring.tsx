import { Zap, Star } from 'lucide-react'

type Props = { niveau: 'standard' | 'boost' | 'premium'; className?: string }

export default function BadgeSponsoring({ niveau, className = '' }: Props) {
  if (niveau === 'standard') return null

  if (niveau === 'boost') {
    return (
      <span className={`inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full ${className}`}>
        <Zap className="w-3 h-3" /> Boost
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-accent-100 to-or-pale text-accent-600 text-xs font-bold px-2 py-0.5 rounded-full border border-accent-300 ${className}`}>
      <Star className="w-3 h-3 fill-accent-500" /> Premium
    </span>
  )
}
