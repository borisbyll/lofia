'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CreditCard, CheckCircle, Loader2, MapPin, Calendar,
  Shield, Printer, Home
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { formatPrix, formatDate } from '@/lib/utils'

interface ReservationDetail {
  id: string
  statut: string
  date_debut: string
  date_fin: string
  nb_nuits: number
  prix_nuit: number
  prix_total: number
  commission_voyageur: number
  commission_hote: number
  montant_proprio: number
  paiement_effectue: boolean
  bien: {
    titre: string; slug: string; ville: string; adresse: string
    photos: string[]; latitude: number | null; longitude: number | null
  } | null
  proprietaire: { nom: string } | null
}

declare global {
  interface Window { FedaPay: any }
}

export default function PaiementPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const resaId = params.id as string

  const [resa,    setResa]    = useState<ReservationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState(false)
  const [paid,    setPaid]    = useState(false)
  const fedaScriptLoaded = useRef(false)

  useEffect(() => {
    loadResa()
    loadFedaScript()
  }, [resaId])

  const loadFedaScript = () => {
    if (fedaScriptLoaded.current) return
    const script = document.createElement('script')
    script.src = 'https://cdn.fedapay.com/checkout.js?v=1.1.7'
    script.async = true
    script.onload = () => { fedaScriptLoaded.current = true }
    document.head.appendChild(script)
  }

  const loadResa = async () => {
    const { data } = await supabase
      .from('reservations')
      .select(`
        id, statut, date_debut, date_fin, nb_nuits, prix_nuit, prix_total,
        commission_voyageur, commission_hote, montant_proprio, paiement_effectue,
        bien:biens!bien_id(titre, slug, ville, adresse, photos, latitude, longitude),
        proprietaire:profiles!proprietaire_id(nom)
      `)
      .eq('id', resaId)
      .eq('locataire_id', user!.id)
      .single()

    if (!data) { toast.error('Réservation introuvable'); router.push('/mon-espace/reservations'); return }
    setResa(data as any)
    if ((data as any).paiement_effectue) setPaid(true)
    setLoading(false)
  }

  const lancerPaiement = async () => {
    if (!resa) return
    setPaying(true)
    try {
      // Récupérer le token JWT — getSession() lit depuis le storage (cookies/localStorage)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { toast.error('Session expirée, veuillez vous reconnecter'); setPaying(false); return }

      const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const authToken    = session.access_token

      const callFn = async (name: string, body: object) => {
        const url = `${supabaseUrl}/functions/v1/${name}`
        console.log('callFn URL:', url, '| token length:', authToken?.length)
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey':        supabaseAnon,
          },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`${name} ${res.status}: ${text}`)
        }
        return res.json()
      }

      // Vérifier la réservation via Edge Function (auth + ownership check)
      const fnData = await callFn('create-fedapay-transaction', {
        reservation_id: resa.id,
      })

      // Ouvrir widget FedaPay — passer les données directement (pas de token pré-créé)
      if (!window.FedaPay) { toast.error('Widget FedaPay non chargé, veuillez réessayer'); setPaying(false); return }

      const bienTitre = (resa.bien as any)?.titre ?? 'Bien immobilier'
      const nomParts  = (user!.user_metadata?.nom ?? 'Locataire').split(' ')

      window.FedaPay.init({
        public_key:  process.env.NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY ?? '',
        transaction: {
          amount:      fnData.prix_total,
          description: `Réservation — ${bienTitre}`,
          currency:    { iso: 'XOF' },
        },
        customer: {
          email:     user!.email ?? '',
          firstname: nomParts[0] ?? 'Locataire',
          lastname:  nomParts.slice(1).join(' ') || 'Client',
        },
        onComplete: async (resp: any) => {
          if (resp.reason === window.FedaPay.CHECKOUT_COMPLETED) {
            const transactionId = resp.transaction?.id ?? fnData.transaction_id
            await callFn('confirm-fedapay-payment', {
              reservation_id: resa.id, transaction_id: transactionId
            })
            setPaid(true)
            setResa(prev => prev ? { ...prev, paiement_effectue: true, statut: 'confirme' } : prev)
            toast.success('Paiement confirmé ! Votre réservation est validée.')
          } else {
            toast.error('Paiement annulé ou échoué')
          }
          setPaying(false)
        }
      }).open()

    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors du paiement')
      setPaying(false)
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  )

  if (!resa) return null

  const bienData = resa.bien as any
  const propData = resa.proprietaire as any

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">
          {paid ? 'Réservation confirmée ✅' : 'Paiement de la réservation'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Réf: #{resa.id.slice(0, 8).toUpperCase()}</p>
      </div>

      {/* Succès */}
      {paid && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5 text-center">
          <CheckCircle size={40} className="mx-auto mb-2 text-green-500" />
          <p className="font-bold text-green-800">Paiement reçu et réservation confirmée !</p>
          <p className="text-sm text-green-600 mt-1">
            Votre hôte a été notifié. L'adresse GPS vous a été transmise.
          </p>
        </div>
      )}

      {/* Récapitulatif */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        {/* Photo */}
        {bienData?.photos?.[0] && (
          <div className="aspect-video">
            <img src={bienData.photos[0]} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Bien */}
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{bienData?.titre ?? '—'}</h2>
            <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
              <MapPin size={12} />
              {bienData?.ville ?? '—'}
              {paid && bienData?.adresse && ` · ${bienData.adresse}`}
            </p>
          </div>

          {/* GPS après paiement */}
          {paid && bienData?.latitude && bienData?.longitude && (
            <div className="bg-primary-50 rounded-xl p-3 border border-primary-100">
              <p className="text-xs font-semibold text-primary-700 flex items-center gap-1.5 mb-1">
                <MapPin size={13} /> Coordonnées GPS débloquées
              </p>
              <p className="text-xs text-primary-600 font-mono">
                {bienData.latitude}, {bienData.longitude}
              </p>
              <a href={`https://maps.google.com/?q=${bienData.latitude},${bienData.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary-500 hover:underline font-semibold mt-1 inline-block">
                Ouvrir dans Google Maps →
              </a>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={15} className="text-gray-400" />
            <span>
              {formatDate(resa.date_debut)} → {formatDate(resa.date_fin)}
              {' · '}<strong>{resa.nb_nuits} nuit{resa.nb_nuits > 1 ? 's' : ''}</strong>
            </span>
          </div>

          {/* Propriétaire */}
          {paid && propData && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Home size={16} className="text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Votre hôte</p>
                <p className="text-sm font-semibold text-gray-900">{propData.nom}</p>
              </div>
            </div>
          )}

          {/* Détail prix */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{formatPrix(resa.prix_nuit)} × {resa.nb_nuits} nuit{resa.nb_nuits > 1 ? 's' : ''}</span>
              <span>{formatPrix(resa.prix_nuit * resa.nb_nuits)}</span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>Frais de service (8%)</span>
              <span>{formatPrix(resa.commission_voyageur ?? 0)}</span>
            </div>
            <div className="flex justify-between font-black text-gray-900 border-t border-gray-200 pt-2">
              <span>Total à payer</span>
              <span className="text-primary-600 text-lg">{formatPrix(resa.prix_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sécurité */}
      <div className="flex items-center gap-2.5 p-3.5 bg-primary-50 rounded-xl border border-primary-100 mb-4">
        <Shield size={16} className="text-primary-500 flex-shrink-0" />
        <p className="text-xs text-primary-700">
          Paiement sécurisé via <strong>FedaPay</strong> — Flooz, T-Money, Wave, Carte bancaire.
          Les fonds sont conservés en séquestre et libérés 24h après votre arrivée.
        </p>
      </div>

      {/* Actions */}
      {!paid ? (
        <button onClick={lancerPaiement} disabled={paying}
          className="btn btn-primary w-full justify-center gap-3 py-4 text-base font-black disabled:opacity-50 shadow-xl shadow-primary-500/30">
          {paying ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
          {paying ? 'Chargement du paiement…' : `Payer ${formatPrix(resa.prix_total)}`}
        </button>
      ) : (
        <div className="space-y-3">
          <button onClick={() => window.print()}
            className="btn btn-outline w-full justify-center gap-2">
            <Printer size={16} /> Imprimer le reçu
          </button>
          <a href="/mon-espace/reservations" className="btn btn-primary w-full justify-center">
            Voir mes réservations
          </a>
        </div>
      )}
    </div>
  )
}
