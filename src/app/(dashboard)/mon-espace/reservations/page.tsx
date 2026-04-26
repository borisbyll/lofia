'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarCheck, CheckCircle, Clock, XCircle,
  Home, Loader2, Lock, Unlock, MapPin, User, Star,
  CreditCard, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useDashboardMode } from '@/store/dashboardModeStore'
import { formatPrix, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import AvisModal from '@/components/ui/AvisModal'
import TimerExpiration from '@/components/locataires/TimerExpiration'

interface Reservation {
  id: string
  statut: string
  date_debut: string
  date_fin: string
  nb_nuits: number
  prix_total: number
  commission_voyageur: number
  commission_hote: number
  montant_proprio: number
  paiement_effectue: boolean
  check_in_at: string | null
  liberation_fonds_at: string | null
  proprietaire_id: string | null
  bien: { id: string; titre: string; slug: string; ville: string; photos: string[] } | null
  locataire: { nom: string } | null
  proprietaire: { nom: string } | null
}

const STATUT: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  en_attente: { label: 'En attente',  cls: 'badge-warning', icon: Clock },
  confirme:   { label: 'Confirmé',    cls: 'badge-success', icon: CheckCircle },
  en_sejour:  { label: 'En séjour',   cls: 'badge-primary', icon: Home },
  termine:    { label: 'Terminé',     cls: 'badge-gray',    icon: CheckCircle },
  annule:     { label: 'Annulé',      cls: 'badge-danger',  icon: XCircle },
}

const today = new Date().toISOString().split('T')[0]

function normaliser(r: Reservation): Reservation {
  if ((r.statut === 'en_sejour' || r.statut === 'confirme') && r.date_fin < today) {
    return { ...r, statut: 'termine' }
  }
  return r
}

interface AvisTarget {
  reservationId: string
  bienId: string
  bienTitre: string
  proprietaireId: string
}

/* ── Carte réservation générique ────────────────────────────── */
function ResaCard({
  r,
  vue,
  onConfirmerArrivee,
  loadingId,
  onOpenAvis,
}: {
  r: Reservation
  vue: 'proprietaire' | 'locataire'
  onConfirmerArrivee?: (id: string) => void
  loadingId: string | null
  onOpenAvis?: (target: AvisTarget) => void
}) {
  const sc = STATUT[r.statut] ?? { label: r.statut, cls: 'badge-gray', icon: Clock }
  const Icon = sc.icon
  const bienData = r.bien as any
  const tiers = vue === 'proprietaire' ? (r.locataire as any) : (r.proprietaire as any)
  const fonds_liberes = r.liberation_fonds_at && new Date(r.liberation_fonds_at) <= new Date()

  return (
    <div className="bg-white rounded-2xl border border-primary-50 shadow-sm overflow-hidden">
      {/* Photo + titre */}
      <div className="flex items-center gap-4 p-4 border-b border-primary-50">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary-50 flex-shrink-0">
          {bienData?.photos?.[0] ? (
            <img src={bienData.photos[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home size={20} style={{ color: '#E8909F' }} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: '#1a0a00' }}>
            {bienData?.titre ?? '—'}
          </p>
          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#7a5c3a' }}>
            <MapPin size={11} /> {bienData?.ville ?? '—'}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={cn('badge text-xs flex items-center gap-1', sc.cls)}>
              <Icon size={10} /> {sc.label}
            </span>
            {!r.paiement_effectue && r.statut !== 'annule' && (
              <span className="badge badge-warning text-xs">Non payé</span>
            )}
          </div>
        </div>
      </div>

      {/* Détails */}
      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs mb-0.5" style={{ color: '#7a5c3a' }}>Dates</p>
          <p className="font-semibold text-xs" style={{ color: '#1a0a00' }}>
            {formatDate(r.date_debut)} → {formatDate(r.date_fin)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#7a5c3a' }}>
            {r.nb_nuits} nuit{r.nb_nuits > 1 ? 's' : ''}
          </p>
        </div>
        <div>
          <p className="text-xs mb-0.5" style={{ color: '#7a5c3a' }}>
            {vue === 'proprietaire' ? 'Locataire' : 'Propriétaire'}
          </p>
          <p className="font-semibold text-xs flex items-center gap-1" style={{ color: '#1a0a00' }}>
            <User size={11} /> {tiers?.nom ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs mb-0.5" style={{ color: '#7a5c3a' }}>Prix total</p>
          <p className="font-black text-sm" style={{ color: '#8B1A2E' }}>{formatPrix(r.prix_total)}</p>
        </div>
        <div>
          <p className="text-xs mb-0.5" style={{ color: '#7a5c3a' }}>
            {vue === 'proprietaire' ? 'Votre part' : 'Frais service'}
          </p>
          <p className="font-bold text-sm" style={{ color: '#1a0a00' }}>
            {vue === 'proprietaire'
              ? formatPrix(r.montant_proprio ?? 0)
              : formatPrix(r.commission_voyageur ?? 0)}
          </p>
        </div>
      </div>

      {/* Séquestre (propriétaire) */}
      {vue === 'proprietaire' && (r.statut === 'confirme' || r.statut === 'en_sejour') && (
        <div className={cn(
          'mx-4 mb-4 p-3 rounded-xl text-xs flex items-start gap-2',
          fonds_liberes
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-accent-50 border border-accent-200'
        )}>
          {fonds_liberes ? (
            <><Unlock size={14} className="shrink-0 mt-0.5" style={{ color: '#2D6A4F' }} />
              <p className="font-medium" style={{ color: '#2D6A4F' }}>Fonds libérés et disponibles</p></>
          ) : (
            <><Lock size={14} className="shrink-0 mt-0.5" style={{ color: '#B08A28' }} />
              <div>
                <p className="font-medium" style={{ color: '#B08A28' }}>Fonds en séquestre</p>
                {r.liberation_fonds_at && (
                  <p className="mt-0.5" style={{ color: '#B08A28' }}>
                    Libération : {new Date(r.liberation_fonds_at).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Action confirmer arrivée (locataire) */}
      {vue === 'locataire' && r.statut === 'confirme' && r.paiement_effectue && onConfirmerArrivee && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onConfirmerArrivee(r.id)}
            disabled={loadingId === r.id}
            className="btn btn-primary w-full justify-center gap-2"
          >
            {loadingId === r.id
              ? <Loader2 size={15} className="animate-spin" />
              : <CheckCircle size={15} />}
            Confirmer mon arrivée
          </button>
          <p className="text-[10px] text-center mt-1" style={{ color: '#7a5c3a' }}>
            Déclenche la libération des fonds 24h après votre arrivée
          </p>
        </div>
      )}

      {/* Payer (locataire, non payé) */}
      {vue === 'locataire' && !r.paiement_effectue && r.statut === 'en_attente' && (
        <div className="px-4 pb-4">
          <Link href={`/mon-espace/paiement/${r.id}`} className="btn btn-accent w-full justify-center text-sm">
            Procéder au paiement
          </Link>
        </div>
      )}

      {/* Annuler (locataire, réservation active et payée) */}
      {vue === 'locataire' && r.paiement_effectue && ['en_attente', 'confirme', 'en_sejour', 'en_cours'].includes(r.statut) && (
        <div className="px-4 pb-3 flex gap-2">
          <Link
            href={`/mon-espace/reservations/${r.id}/annuler`}
            className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors"
          >
            Annuler cette réservation
          </Link>
        </div>
      )}

      {/* Laisser un avis (locataire, terminé) */}
      {vue === 'locataire' && r.statut === 'termine' && bienData && r.proprietaire_id && onOpenAvis && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onOpenAvis({
              reservationId: r.id,
              bienId: bienData.id,
              bienTitre: bienData.titre,
              proprietaireId: r.proprietaire_id!,
            })}
            className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
            style={{ color: '#D4A832' }}
          >
            <Star size={12} /> Laisser un avis
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Section avec filtre par statut ─────────────────────────── */
function SectionReservations({
  titre,
  resas,
  vue,
  onConfirmerArrivee,
  loadingId,
  onOpenAvis,
}: {
  titre: string
  resas: Reservation[]
  vue: 'proprietaire' | 'locataire'
  onConfirmerArrivee?: (id: string) => void
  loadingId: string | null
  onOpenAvis?: (target: AvisTarget) => void
}) {
  const [filter, setFilter] = useState('all')

  const counts = {
    all:        resas.length,
    en_attente: resas.filter(r => r.statut === 'en_attente').length,
    confirme:   resas.filter(r => r.statut === 'confirme').length,
    en_sejour:  resas.filter(r => r.statut === 'en_sejour').length,
    termine:    resas.filter(r => r.statut === 'termine').length,
    annule:     resas.filter(r => r.statut === 'annule').length,
  }

  const tabs = [
    { v: 'all',        l: 'Toutes' },
    { v: 'en_attente', l: 'En attente' },
    { v: 'confirme',   l: 'Confirmées' },
    { v: 'en_sejour',  l: 'En séjour' },
    { v: 'termine',    l: 'Terminées' },
  ].filter(t => t.v === 'all' || counts[t.v as keyof typeof counts] > 0)

  const filtered = filter === 'all' ? resas : resas.filter(r => r.statut === filter)

  if (resas.length === 0) return (
    <div className="bg-white rounded-2xl border border-primary-50 shadow-sm">
      <div className="px-5 py-4 border-b border-primary-50">
        <h2 className="font-bold text-base" style={{ color: '#1a0a00' }}>{titre}</h2>
      </div>
      <div className="p-12 text-center">
        <CalendarCheck size={36} className="mx-auto mb-3 opacity-20" style={{ color: '#8B1A2E' }} />
        <p className="text-sm" style={{ color: '#7a5c3a' }}>
          {vue === 'locataire' ? 'Aucune réservation effectuée' : 'Aucune réservation reçue'}
        </p>
        {vue === 'locataire' && (
          <Link href="/location" className="inline-block mt-3 text-xs font-bold hover:underline" style={{ color: '#8B1A2E' }}>
            Explorer les locations →
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-primary-50 shadow-sm overflow-hidden">
      {/* En-tête */}
      <div className="px-5 py-4 border-b border-primary-50 flex items-center justify-between gap-3">
        <h2 className="font-bold text-base flex items-center gap-2" style={{ color: '#1a0a00' }}>
          {titre}
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: '#8B1A2E' }}
          >
            {resas.length}
          </span>
        </h2>
      </div>

      {/* Filtres par statut */}
      {tabs.length > 1 && (
        <div className="flex gap-2 px-5 py-3 border-b border-primary-50 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.v}
              onClick={() => setFilter(t.v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                filter === t.v
                  ? 'text-white'
                  : 'bg-primary-50 hover:bg-primary-100'
              )}
              style={
                filter === t.v
                  ? { background: '#8B1A2E', color: '#fff' }
                  : { color: '#7a5c3a' }
              }
            >
              {t.l}
              {t.v !== 'all' && (
                <span className={cn(
                  'px-1 py-0 rounded-full text-[10px]',
                  filter === t.v ? 'bg-white/20' : 'bg-primary-100'
                )}>
                  {counts[t.v as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      <div className="p-4 space-y-4">
        {filtered.map(r => (
          <ResaCard
            key={r.id}
            r={r}
            vue={vue}
            onConfirmerArrivee={onConfirmerArrivee}
            loadingId={loadingId}
            onOpenAvis={onOpenAvis}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Carte demande reçue (propriétaire) ─────────────────────── */
function DemandePropCard({ d }: { d: Demande }) {
  const bien     = Array.isArray(d.biens) ? d.biens[0] : (d as any).biens
  const locataire = (d as any).locataire
  const expired  = new Date(d.expire_at) < new Date()
  return (
    <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden">
      <div className="bg-amber-50 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
          <Clock size={12} /> Réponse requise
        </span>
        {!expired && <TimerExpiration expire_at={d.expire_at} label="Expire dans" />}
        {expired && <span className="text-xs text-red-500 font-semibold">Expirée</span>}
      </div>
      <div className="flex items-center gap-4 p-4 border-b border-amber-50">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary-50 flex-shrink-0">
          {bien?.photos?.[0]
            ? <img src={bien.photos[0]} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Home size={18} style={{ color: '#E8909F' }} /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate text-brun-nuit">{bien?.titre ?? '—'}</p>
          <p className="text-xs text-brun-doux mt-0.5">
            {locataire?.nom ?? 'Locataire'} · {formatDate(d.date_arrivee)} → {formatDate(d.date_depart)} ({d.nb_nuits} nuit{d.nb_nuits > 1 ? 's' : ''})
          </p>
          <p className="font-black text-primary-500 text-sm mt-0.5">{formatPrix(d.montant_total)}</p>
        </div>
      </div>
      <div className="p-4 flex gap-3">
        <Link
          href={`/reservations/decision/${(d as any).token_refus}`}
          className="btn btn-outline flex-1 justify-center text-sm border-red-200 text-red-600 hover:bg-red-50"
        >
          <XCircle size={14} /> Refuser
        </Link>
        <Link
          href={`/reservations/decision/${(d as any).token_confirmation}`}
          className="btn btn-primary flex-1 justify-center text-sm"
        >
          <CheckCircle size={14} /> Confirmer
        </Link>
      </div>
    </div>
  )
}

/* ── Carte demande CDC v2 §6.1 ───────────────────────────────── */
interface Demande {
  id: string
  statut: string
  date_arrivee: string
  date_depart: string
  nb_nuits: number
  montant_total: number
  expire_at: string
  lien_paiement_expire_at?: string | null
  tentatives_paiement?: number
  biens?: any
}

function DemandeCard({ d }: { d: Demande }) {
  const bien = Array.isArray(d.biens) ? d.biens[0] : d.biens
  return (
    <div className="bg-white rounded-2xl border border-primary-50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4 border-b border-primary-50">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary-50 flex-shrink-0">
          {bien?.photos?.[0]
            ? <img src={bien.photos[0]} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Home size={18} style={{ color: '#E8909F' }} /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate text-brun-nuit">{bien?.titre ?? '—'}</p>
          <p className="text-xs text-brun-doux mt-0.5">{formatDate(d.date_arrivee)} → {formatDate(d.date_depart)} — {d.nb_nuits} nuit{d.nb_nuits > 1 ? 's' : ''}</p>
          <p className="font-black text-primary-500 text-sm mt-0.5">{formatPrix(d.montant_total)}</p>
        </div>
        <span className={cn('badge text-xs shrink-0', d.statut === 'en_attente' ? 'badge-warning' : d.statut === 'confirmee' ? 'badge-success' : 'badge-gray')}>
          {d.statut === 'en_attente' ? '⏳ En attente' : d.statut === 'confirmee' ? '✅ Confirmée' : d.statut}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {d.statut === 'en_attente' && (
          <TimerExpiration expire_at={d.expire_at} label="Expire dans" />
        )}
        {d.statut === 'confirmee' && d.lien_paiement_expire_at && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              <TimerExpiration expire_at={d.lien_paiement_expire_at} label="Paiement expire dans" />
            </div>
            <Link href={`/reservations/payer/${d.id}`} className="btn btn-primary text-sm px-4 py-2 gap-1.5">
              <CreditCard size={13} /> Payer maintenant
            </Link>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Link href={`/reservations/demandes/${d.id}`} className="text-xs text-primary-500 hover:underline font-semibold">
            Voir le détail →
          </Link>
          {['en_attente', 'confirmee'].includes(d.statut) && (
            <Link href={`/reservations/demandes/${d.id}`} className="text-xs text-red-400 hover:text-red-600 transition-colors">
              Annuler
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════════════ */
export default function ReservationsPage() {
  const { user }      = useAuthStore()
  const { mode }      = useDashboardMode()
  const [resasProp, setResasProp] = useState<Reservation[]>([])
  const [resasLoc,  setResasLoc]  = useState<Reservation[]>([])
  const [demandes,      setDemandes]      = useState<Demande[]>([])
  const [demandesProp,  setDemandesProp]  = useState<Demande[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [avisTarget, setAvisTarget] = useState<AvisTarget | null>(null)
  const [tabLoc, setTabLoc] = useState<'demandes' | 'avenir' | 'passes' | 'annulations'>('demandes')

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const baseSelect = `
      id, statut, date_debut, date_fin, nb_nuits,
      prix_total, commission_voyageur, commission_hote, montant_proprio,
      paiement_effectue, check_in_at, liberation_fonds_at, proprietaire_id,
      bien:biens!bien_id(id, titre, slug, ville, photos),
      locataire:profiles!locataire_id(nom),
      proprietaire:profiles!proprietaire_id(nom)
    `
    const [resProp, resLoc, resDemLoc, resDemProp] = await Promise.all([
      supabase.from('reservations').select(baseSelect)
        .eq('proprietaire_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('reservations').select(baseSelect)
        .eq('locataire_id', user!.id)
        .neq('proprietaire_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50),
      // Demandes envoyées par le locataire
      supabase.from('demandes_reservation')
        .select('id, statut, date_arrivee, date_depart, nb_nuits, montant_total, expire_at, lien_paiement_expire_at, tentatives_paiement, token_confirmation, token_refus, biens(id, titre, photos, photo_principale, ville), locataire:profiles!demandes_reservation_locataire_id_fkey(nom, avatar_url)')
        .eq('locataire_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(30),
      // Demandes reçues par le propriétaire
      supabase.from('demandes_reservation')
        .select('id, statut, date_arrivee, date_depart, nb_nuits, montant_total, expire_at, token_confirmation, token_refus, biens(id, titre, photos, photo_principale, ville), locataire:profiles!demandes_reservation_locataire_id_fkey(nom, avatar_url)')
        .eq('proprietaire_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    if (resProp.error || resLoc.error) toast.error('Erreur de chargement')

    setResasProp(((resProp.data ?? []) as unknown as Reservation[]).map(normaliser))
    setResasLoc(((resLoc.data ?? []) as unknown as Reservation[]).map(normaliser))
    setDemandes((resDemLoc.data ?? []) as unknown as Demande[])
    setDemandesProp((resDemProp.data ?? []) as unknown as Demande[])
    setLoading(false)
  }

  const confirmerArrivee = async (id: string) => {
    setLoadingId(id)
    try {
      const { error } = await supabase.rpc('confirmer_arrivee', { reservation_id: id })
      if (error) throw error
      toast.success('Arrivée confirmée ! Les fonds seront libérés dans 24h.')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur')
    } finally {
      setLoadingId(null)
    }
  }

  if (loading) return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full space-y-5 pb-24 lg:pb-8">
      <div className="skeleton h-8 w-48 rounded-xl" />
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
    </div>
  )

  const isProprio = mode === 'proprietaire'

  // Ventilation des réservations locataire dans les 4 onglets CDC v2 §6.1
  const demandesActives = demandes.filter(d => ['en_attente', 'confirmee'].includes(d.statut))
  const resasAvenir = resasLoc.filter(r => ['confirme', 'en_cours', 'en_sejour'].includes(r.statut) && r.date_debut >= today)
  const resasPassees = resasLoc.filter(r => r.statut === 'termine')
  const resasAnnulees = resasLoc.filter(r => ['annule', 'no_show'].includes(r.statut))
  const demandesInactives = demandes.filter(d => ['refusee', 'expiree', 'annulee_locataire', 'annulee_systeme'].includes(d.statut))

  const LOC_TABS = [
    { key: 'demandes',    label: 'Demandes en cours', count: demandesActives.length },
    { key: 'avenir',      label: 'À venir',           count: resasAvenir.length },
    { key: 'passes',      label: 'Séjours passés',    count: resasPassees.length },
    { key: 'annulations', label: 'Annulations',        count: resasAnnulees.length + demandesInactives.length },
  ] as const

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full space-y-6 pb-24 lg:pb-8">

      {/* Titre */}
      <div className="flex items-center gap-3">
        <span className="w-1 h-7 rounded-full shrink-0" style={{ background: isProprio ? '#8B1A2E' : '#2D6A4F' }} />
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1a0a00' }}>Réservations</h1>
          <p className="text-xs mt-0.5" style={{ color: isProprio ? '#8B1A2E' : '#2D6A4F' }}>
            {isProprio ? 'En tant que propriétaire — réservations reçues' : 'En tant que locataire — réservations émises'}
          </p>
        </div>
      </div>

      {isProprio ? (
        <>
          {/* Demandes en attente de réponse */}
          {demandesProp.filter(d => d.statut === 'en_attente').length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-800 text-sm">Demandes à traiter</h2>
                <span className="badge badge-warning text-xs">{demandesProp.filter(d => d.statut === 'en_attente').length}</span>
              </div>
              {demandesProp.filter(d => d.statut === 'en_attente').map(d => (
                <DemandePropCard key={d.id} d={d} />
              ))}
            </div>
          )}
          <SectionReservations
            titre="Réservations reçues"
            resas={resasProp}
            vue="proprietaire"
            loadingId={loadingId}
          />
        </>
      ) : (
        <>
          {/* 4 onglets CDC v2 */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            {LOC_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTabLoc(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-1 justify-center',
                  tabLoc === t.key ? 'text-white' : 'text-brun-doux hover:bg-primary-50'
                )}
                style={tabLoc === t.key ? { background: '#8B1A2E' } : {}}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={cn('px-1.5 py-0 rounded-full text-[10px] font-bold', tabLoc === t.key ? 'bg-white/30 text-white' : 'bg-primary-50 text-primary-600')}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Onglet Demandes en cours */}
          {tabLoc === 'demandes' && (
            <div className="space-y-4">
              {demandesActives.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <Clock size={36} className="mx-auto mb-3 opacity-20 text-primary-300" />
                  <p className="text-sm text-brun-doux">Aucune demande en cours</p>
                  <Link href="/location" className="inline-block mt-3 text-xs font-bold text-primary-500 hover:underline">Explorer les locations →</Link>
                </div>
              ) : (
                demandesActives.map(d => <DemandeCard key={d.id} d={d} />)
              )}
            </div>
          )}

          {/* Onglet À venir */}
          {tabLoc === 'avenir' && (
            <div className="space-y-4">
              {resasAvenir.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <CalendarCheck size={36} className="mx-auto mb-3 opacity-20 text-primary-300" />
                  <p className="text-sm text-brun-doux">Aucune réservation à venir</p>
                </div>
              ) : (
                resasAvenir.map(r => (
                  <ResaCard key={r.id} r={r} vue="locataire" onConfirmerArrivee={confirmerArrivee} loadingId={loadingId} onOpenAvis={setAvisTarget} />
                ))
              )}
            </div>
          )}

          {/* Onglet Séjours passés */}
          {tabLoc === 'passes' && (
            <div className="space-y-4">
              {resasPassees.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <Home size={36} className="mx-auto mb-3 opacity-20 text-primary-300" />
                  <p className="text-sm text-brun-doux">Aucun séjour passé</p>
                </div>
              ) : (
                resasPassees.map(r => (
                  <ResaCard key={r.id} r={r} vue="locataire" loadingId={loadingId} onOpenAvis={setAvisTarget} />
                ))
              )}
            </div>
          )}

          {/* Onglet Annulations */}
          {tabLoc === 'annulations' && (
            <div className="space-y-4">
              {resasAnnulees.length === 0 && demandesInactives.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <XCircle size={36} className="mx-auto mb-3 opacity-20 text-primary-300" />
                  <p className="text-sm text-brun-doux">Aucune annulation</p>
                </div>
              ) : (
                <>
                  {resasAnnulees.map(r => (
                    <ResaCard key={r.id} r={r} vue="locataire" loadingId={loadingId} />
                  ))}
                  {demandesInactives.map(d => (
                    <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm text-brun-nuit">{(Array.isArray(d.biens) ? d.biens[0] : d.biens)?.titre ?? '—'}</p>
                          <p className="text-xs text-brun-doux mt-0.5">{formatDate(d.date_arrivee)} → {formatDate(d.date_depart)}</p>
                          <p className="text-xs text-gray-400 mt-1">{d.statut === 'refusee' ? '❌ Refusée' : d.statut === 'expiree' ? '⏰ Expirée' : '🚫 Annulée'}</p>
                        </div>
                        <p className="font-black text-primary-500 text-sm shrink-0">{formatPrix(d.montant_total)}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {avisTarget && (
        <AvisModal
          reservationId={avisTarget.reservationId}
          bienId={avisTarget.bienId}
          bienTitre={avisTarget.bienTitre}
          proprietaireId={avisTarget.proprietaireId}
          onClose={() => setAvisTarget(null)}
          onSuccess={() => { setAvisTarget(null); load() }}
        />
      )}
    </div>
  )
}
