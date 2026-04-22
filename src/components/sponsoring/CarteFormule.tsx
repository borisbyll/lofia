import { Check } from 'lucide-react'
import { formatPrix } from '@/lib/utils'

type Formule = { id: string; nom: string; prix: number; duree_jours: number; avantages: string[] }

type Props = {
  formule: Formule
  selected: boolean
  onSelect: () => void
}

export default function CarteFormule({ formule, selected, onSelect }: Props) {
  const isPremium = formule.id === 'premium'

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-5 transition-all ${selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-200'} ${isPremium ? 'relative overflow-hidden' : ''}`}>
      {isPremium && (
        <div className="absolute top-0 right-0 bg-accent-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">Recommandé</div>
      )}
      <p className={`font-black text-lg mb-1 ${isPremium ? 'text-primary-500' : 'text-brun-nuit'}`}>{formule.nom}</p>
      <p className="prix text-2xl mb-3">{formatPrix(formule.prix)}</p>
      <ul className="space-y-1.5">
        {formule.avantages.map((a, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-brun-doux">
            <Check className="w-4 h-4 text-green-500 shrink-0" /> {a}
          </li>
        ))}
      </ul>
    </button>
  )
}
