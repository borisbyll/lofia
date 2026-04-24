'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

interface Periode { debut: string; fin: string; type: 'reserve' | 'bloque' | 'en_attente' }

interface Props {
  bienId:    string
  prixNuit?: number
  readOnly?: boolean
  onSelect?: (dateArrivee: string, dateDepart: string, nbNuits: number, total: number) => void
}

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const JOURS_FR = ['Lu','Ma','Me','Je','Ve','Sa','Di']

export default function CalendrierDisponibilite({ bienId, prixNuit = 0, readOnly = false, onSelect }: Props) {
  const today  = new Date(); today.setHours(0,0,0,0)
  const [mois,    setMois]    = useState(today.getMonth())
  const [annee,   setAnnee]   = useState(today.getFullYear())
  const [debut,   setDebut]   = useState<Date | null>(null)
  const [fin,     setFin]     = useState<Date | null>(null)
  const [hover,   setHover]   = useState<Date | null>(null)
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [loading,  setLoading] = useState(true)

  // Charger disponibilités depuis les deux sources
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const debutPeriode = new Date(annee, mois - 1, 1).toISOString().split('T')[0]
      const finPeriode   = new Date(annee, mois + 3, 0).toISOString().split('T')[0]

      // 1. Disponibilités confirmées / bloquées manuellement
      const { data: dispo } = await supabase
        .from('disponibilites')
        .select('date_debut, date_fin, type')
        .eq('bien_id', bienId)
        .in('type', ['reserve', 'bloque'])
        .lt('date_debut', finPeriode)
        .gt('date_fin',   debutPeriode)

      // 2. Réservations en attente de paiement (pas encore dans disponibilites)
      const { data: enAttente } = await supabase
        .from('reservations')
        .select('date_debut, date_fin')
        .eq('bien_id', bienId)
        .eq('statut', 'en_attente')
        .lt('date_debut', finPeriode)
        .gt('date_fin',   debutPeriode)

      const resultat: Periode[] = [
        ...(dispo ?? []).map(d => ({ debut: d.date_debut, fin: d.date_fin, type: d.type as Periode['type'] })),
        ...(enAttente ?? []).map(r => ({ debut: r.date_debut, fin: r.date_fin, type: 'en_attente' as const })),
      ]
      setPeriodes(resultat)
      setLoading(false)
    }
    load()
  }, [bienId, mois, annee])

  const getTypeJour = useCallback((date: Date): Periode['type'] | null => {
    if (date < today) return 'bloque'
    const ds = date.toISOString().split('T')[0]
    for (const p of periodes) {
      if (ds >= p.debut && ds < p.fin) return p.type
    }
    return null
  }, [periodes, today])

  const estBloquee = useCallback((date: Date) => getTypeJour(date) !== null, [getTypeJour])

  const estDansSelection = (date: Date): boolean => {
    const ref = hover ?? fin
    if (!debut || !ref) return false
    const [a, b] = debut <= ref ? [debut, ref] : [ref, debut]
    return date > a && date < b
  }

  const handleClick = (date: Date) => {
    if (readOnly || estBloquee(date)) return
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
      if (nbNuits > 0 && onSelect) {
        onSelect(debut.toISOString().split('T')[0], date.toISOString().split('T')[0], nbNuits, nbNuits * prixNuit)
      }
    }
  }

  // Générer les jours du mois
  const premierJour = new Date(annee, mois, 1)
  const dernierJour = new Date(annee, mois + 1, 0)
  const decalage    = (premierJour.getDay() + 6) % 7
  const jours: (Date | null)[] = Array(decalage).fill(null)
  for (let d = 1; d <= dernierJour.getDate(); d++) jours.push(new Date(annee, mois, d))

  const canPrev = annee > today.getFullYear() || mois > today.getMonth()
  const prev = () => {
    if (!canPrev) return
    if (mois === 0) { setMois(11); setAnnee(a => a - 1) } else setMois(m => m - 1)
  }
  const next = () => {
    if (mois === 11) { setMois(0); setAnnee(a => a + 1) } else setMois(m => m + 1)
  }

  return (
    <div className="bg-white rounded-2xl border border-primary-50 p-4">
      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prev}
          disabled={!canPrev}
          className="p-1.5 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Mois précédent"
        >
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
      {loading ? (
        <div className="grid grid-cols-7 gap-0.5">
          {Array(35).fill(null).map((_, i) => (
            <div key={i} className="h-8 rounded-lg skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5">
          {jours.map((date, i) => {
            if (!date) return <div key={`e-${i}`} />
            const typeJour = getTypeJour(date)
            const bloque   = typeJour !== null
            const isDebut  = debut && date.toDateString() === debut.toDateString()
            const isFin    = fin   && date.toDateString() === fin.toDateString()
            const inRange  = estDansSelection(date)
            const isToday  = date.toDateString() === today.toDateString()

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleClick(date)}
                onMouseEnter={() => !readOnly && debut && !fin && setHover(date)}
                onMouseLeave={() => setHover(null)}
                disabled={bloque || readOnly}
                title={typeJour === 'en_attente' ? 'Réservation en attente de paiement' : typeJour === 'reserve' ? 'Déjà réservé' : typeJour === 'bloque' ? 'Indisponible' : ''}
                className={cn(
                  'h-8 w-full rounded-lg text-xs font-semibold transition-all',
                  typeJour === 'reserve'    ? 'line-through text-gray-300 cursor-not-allowed bg-gray-50' :
                  typeJour === 'en_attente' ? 'line-through text-orange-300 cursor-not-allowed bg-orange-50' :
                  typeJour === 'bloque'     ? 'line-through text-gray-300 cursor-not-allowed bg-gray-50' :
                  (isDebut || isFin) ? 'bg-primary-500 text-white' :
                  inRange   ? 'bg-primary-100 text-primary-700' :
                  isToday   ? 'border border-primary-300 text-primary-600' :
                  readOnly  ? 'text-gray-700' :
                  'hover:bg-primary-50 text-gray-700'
                )}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px]" style={{ color: '#7a5c3a' }}>
        {!readOnly && <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary-500" />Sélection</div>}
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-200" />Réservé</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-orange-100" />En attente</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm border border-primary-300" />Aujourd&apos;hui</div>
      </div>
    </div>
  )
}
