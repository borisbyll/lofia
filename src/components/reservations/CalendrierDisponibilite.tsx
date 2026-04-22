'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

interface Periode { date_debut: string; date_fin: string; type: string }

interface Props {
  bienId:    string
  prixNuit:  number
  onSelect:  (dateArrivee: string, dateDepart: string, nbNuits: number, total: number) => void
}

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const JOURS_FR = ['Lu','Ma','Me','Je','Ve','Sa','Di']

export default function CalendrierDisponibilite({ bienId, prixNuit, onSelect }: Props) {
  const today  = new Date(); today.setHours(0,0,0,0)
  const [mois,  setMois]  = useState(today.getMonth())
  const [annee, setAnnee] = useState(today.getFullYear())
  const [debut, setDebut] = useState<Date | null>(null)
  const [fin,   setFin]   = useState<Date | null>(null)
  const [hover, setHover] = useState<Date | null>(null)
  const [periodes, setPeriodes] = useState<Periode[]>([])

  // Charger disponibilités
  useEffect(() => {
    const load = async () => {
      const debutMois = new Date(annee, mois, 1).toISOString().split('T')[0]
      const finMois   = new Date(annee, mois + 2, 0).toISOString().split('T')[0]
      const { data } = await supabase
        .from('disponibilites')
        .select('date_debut, date_fin, type')
        .eq('bien_id', bienId)
        .in('type', ['reserve', 'bloque'])
        .lt('date_debut', finMois)
        .gt('date_fin',   debutMois)
      setPeriodes(data ?? [])
    }
    load()
  }, [bienId, mois, annee])

  const estBloquee = useCallback((date: Date): boolean => {
    if (date < today) return true
    const ds = date.toISOString().split('T')[0]
    return periodes.some(p => ds >= p.date_debut && ds < p.date_fin)
  }, [periodes, today])

  const estDansSelection = (date: Date): boolean => {
    const ref = hover ?? fin
    if (!debut || !ref) return false
    const [a, b] = debut <= ref ? [debut, ref] : [ref, debut]
    return date > a && date < b
  }

  const handleClick = (date: Date) => {
    if (estBloquee(date)) return
    if (!debut || (debut && fin)) {
      setDebut(date); setFin(null)
    } else {
      if (date < debut) { setDebut(date); setFin(null); return }
      // Vérifier qu'aucune date bloquée n'est dans la sélection
      const d = new Date(debut); d.setDate(d.getDate() + 1)
      while (d < date) {
        if (estBloquee(d)) { setDebut(date); setFin(null); return }
        d.setDate(d.getDate() + 1)
      }
      setFin(date)
      const nbNuits = Math.round((date.getTime() - debut.getTime()) / 86400000)
      if (nbNuits > 0) onSelect(debut.toISOString().split('T')[0], date.toISOString().split('T')[0], nbNuits, nbNuits * prixNuit)
    }
  }

  // Générer les jours du mois
  const premierJour = new Date(annee, mois, 1)
  const dernierJour = new Date(annee, mois + 1, 0)
  const decalage    = (premierJour.getDay() + 6) % 7 // lundi = 0
  const jours: (Date | null)[] = Array(decalage).fill(null)
  for (let d = 1; d <= dernierJour.getDate(); d++) jours.push(new Date(annee, mois, d))

  const prev = () => { if (mois === 0) { setMois(11); setAnnee(a => a - 1) } else setMois(m => m - 1) }
  const next = () => { if (mois === 11) { setMois(0); setAnnee(a => a + 1) } else setMois(m => m + 1) }

  return (
    <div className="bg-white rounded-2xl border border-primary-50 p-4">
      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-primary-50 transition-colors" aria-label="Mois précédent">
          <ChevronLeft size={18} style={{ color: '#8B1A2E' }} />
        </button>
        <span className="font-bold text-sm" style={{ color: '#1a0a00' }}>{MOIS_FR[mois]} {annee}</span>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-primary-50 transition-colors" aria-label="Mois suivant">
          <ChevronRight size={18} style={{ color: '#8B1A2E' }} />
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 mb-2">
        {JOURS_FR.map(j => (
          <div key={j} className="text-center text-[10px] font-bold py-1" style={{ color: '#7a5c3a' }}>{j}</div>
        ))}
      </div>

      {/* Grille jours */}
      <div className="grid grid-cols-7 gap-0.5">
        {jours.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />
          const bloque   = estBloquee(date)
          const isDebut  = debut && date.toDateString() === debut.toDateString()
          const isFin    = fin   && date.toDateString() === fin.toDateString()
          const inRange  = estDansSelection(date)
          const isToday  = date.toDateString() === today.toDateString()

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleClick(date)}
              onMouseEnter={() => debut && !fin && setHover(date)}
              onMouseLeave={() => setHover(null)}
              disabled={bloque}
              className={cn(
                'h-8 w-full rounded-lg text-xs font-semibold transition-all relative',
                bloque   ? 'line-through text-gray-300 cursor-not-allowed' :
                (isDebut || isFin) ? 'bg-primary-500 text-white' :
                inRange  ? 'bg-primary-100 text-primary-700' :
                isToday  ? 'border border-primary-300 text-primary-600' :
                'hover:bg-primary-50 text-gray-700'
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: '#7a5c3a' }}>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary-500" />Sélection</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-200" />Indisponible</div>
      </div>
    </div>
  )
}
