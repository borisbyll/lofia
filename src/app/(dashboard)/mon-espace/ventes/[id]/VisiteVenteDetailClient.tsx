'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { formatPrix, formatDate } from '@/lib/utils'
import { CheckCircle, Clock, FileText, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboardMode } from '@/store/dashboardModeStore'

type Props = {
  dvv: any
  offre: any | null
  userId: string
}

export default function VisiteVenteDetailClient({ dvv, offre, userId }: Props) {
  const router = useRouter()
  const { mode, setMode } = useDashboardMode()
  const [loading, setLoading]     = useState(false)
  const [prix, setPrix]           = useState('')
  const [message, setMessage]     = useState('')
  const [reponse, setReponse]     = useState<'acceptee' | 'refusee' | 'contre_offre'>('acceptee')
  const [prixContreOffre, setPrixCO] = useState('')
  const [conditions, setConditions] = useState('')
  const [dateLimite, setDateLimite] = useState('')

  const bien    = dvv.bien as any
  const acheteur = dvv.acheteur as any
  const vendeur  = dvv.vendeur as any
  const isVendeur = dvv.vendeur_id === userId

  useEffect(() => {
    setMode(isVendeur ? 'proprietaire' : 'locataire')
  }, [isVendeur, setMode])

  useEffect(() => {
    if (mode === 'proprietaire' && !isVendeur)  router.push('/mon-espace/ventes')
    if (mode === 'locataire'    &&  isVendeur)  router.push('/mon-espace/ventes')
  }, [mode, isVendeur, router])

  async function faireOffre() {
    if (!prix) return toast.error('Saisissez un prix')
    setLoading(true)
    const r = await fetch('/api/vente/faire-offre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demande_visite_id: dvv.id, prix_propose: Number(prix), message }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success('Offre envoyée !'); window.location.reload() }
    else toast.error(d.error ?? 'Erreur')
  }

  async function repondreOffre() {
    setLoading(true)
    const r = await fetch('/api/vente/repondre-offre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offre_id: offre.id,
        statut: reponse,
        prix_accepte: reponse === 'contre_offre' ? Number(prixContreOffre) : undefined,
        message,
      }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success('Réponse envoyée !'); window.location.reload() }
    else toast.error(d.error ?? 'Erreur')
  }

  async function genererPromesse() {
    setLoading(true)
    const r = await fetch('/api/vente/generer-promesse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offre_id: offre.id, conditions, date_limite_signature: dateLimite || undefined }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success('Promesse générée !'); window.location.href = `/mon-espace/ventes/promesse/${d.promesse_id}` }
    else toast.error(d.error ?? 'Erreur')
  }

  const canFaireOffre  = dvv.visite_confirmee_acheteur && dvv.visite_confirmee_vendeur && !offre && dvv.acheteur_id === userId
  const canRepondre    = offre && offre.statut === 'en_attente' && isVendeur
  const canGenPromesse = offre && offre.statut === 'acceptee' && isVendeur

  return (
    <div className="p-4 md:p-6 pb-nav max-w-2xl mx-auto space-y-6">
      {/* Bien */}
      <div className="dashboard-card flex gap-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-or-pale">
          {bien?.photo_principale && <Image src={bien.photo_principale} alt={bien.titre} fill className="object-cover" />}
        </div>
        <div>
          <h1 className="font-black text-brun-nuit text-lg">{bien?.titre}</h1>
          <p className="text-brun-doux text-sm">{bien?.ville}</p>
          <p className="prix text-base">{formatPrix(bien?.prix)}</p>
        </div>
      </div>

      {/* Statut visite */}
      <div className="dashboard-card space-y-3">
        <h2 className="font-semibold text-brun-nuit flex items-center gap-2"><Clock className="w-4 h-4" /> Confirmation visite</h2>
        <p className="text-sm">Code visite : <span className="font-mono font-bold text-primary-500">{dvv.code_visite}</span></p>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className={`flex items-center gap-1 ${dvv.visite_confirmee_acheteur ? 'text-green-600' : 'text-brun-doux'}`}>
            {dvv.visite_confirmee_acheteur ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            Acheteur : {acheteur?.nom}
          </span>
          <span className={`flex items-center gap-1 ${dvv.visite_confirmee_vendeur ? 'text-green-600' : 'text-brun-doux'}`}>
            {dvv.visite_confirmee_vendeur ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            Vendeur : {vendeur?.nom}
          </span>
        </div>
      </div>

      {/* Offre acheteur */}
      {canFaireOffre && (
        <div className="dashboard-card space-y-3">
          <h2 className="font-semibold text-brun-nuit flex items-center gap-2"><Send className="w-4 h-4" /> Faire une offre</h2>
          <div>
            <label className="label-field">Prix proposé (FCFA)</label>
            <input type="number" value={prix} onChange={e => setPrix(e.target.value)} className="input-field" placeholder="Ex: 45000000" />
          </div>
          <div>
            <label className="label-field">Message (facultatif)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="input-field resize-none" rows={3} />
          </div>
          <button onClick={faireOffre} disabled={loading} className="btn-primary w-full">{loading ? 'Envoi…' : 'Soumettre l\'offre'}</button>
        </div>
      )}

      {/* Offre existante */}
      {offre && (
        <div className="dashboard-card space-y-3">
          <h2 className="font-semibold text-brun-nuit flex items-center gap-2"><FileText className="w-4 h-4" /> Offre d&apos;achat</h2>
          <div className="flex items-center justify-between">
            <span className="text-brun-doux">Prix proposé</span>
            <span className="prix">{formatPrix(offre.prix_propose)}</span>
          </div>
          {offre.prix_accepte && (
            <div className="flex items-center justify-between">
              <span className="text-brun-doux">Prix négocié</span>
              <span className="prix">{formatPrix(offre.prix_accepte)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-brun-doux">Statut</span>
            <span className={`badge-${offre.statut === 'acceptee' ? 'success' : offre.statut === 'refusee' ? 'danger' : offre.statut === 'contre_offre' ? 'warning' : 'en-attente'}`}>
              {offre.statut === 'acceptee' ? 'Acceptée' : offre.statut === 'refusee' ? 'Refusée' : offre.statut === 'contre_offre' ? 'Contre-offre' : 'En attente'}
            </span>
          </div>
          {offre.message_acheteur && <p className="text-sm text-brun-doux italic">&quot;{offre.message_acheteur}&quot;</p>}
        </div>
      )}

      {/* Réponse vendeur */}
      {canRepondre && (
        <div className="dashboard-card space-y-3">
          <h2 className="font-semibold text-brun-nuit flex items-center gap-2"><Send className="w-4 h-4" /> Répondre à l&apos;offre</h2>
          <div className="flex flex-wrap gap-2">
            {(['acceptee', 'refusee', 'contre_offre'] as const).map(r => (
              <button key={r} onClick={() => setReponse(r)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${reponse === r ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-brun-doux hover:border-primary-300'}`}>
                {r === 'acceptee' ? 'Accepter' : r === 'refusee' ? 'Refuser' : 'Contre-offre'}
              </button>
            ))}
          </div>
          {reponse === 'contre_offre' && (
            <div>
              <label className="label-field">Prix contre-offre (FCFA)</label>
              <input type="number" value={prixContreOffre} onChange={e => setPrixCO(e.target.value)} className="input-field" />
            </div>
          )}
          <div>
            <label className="label-field">Message (facultatif)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="input-field resize-none" rows={2} />
          </div>
          <button onClick={repondreOffre} disabled={loading} className="btn-primary w-full">{loading ? 'Envoi…' : 'Envoyer ma réponse'}</button>
        </div>
      )}

      {/* Générer promesse */}
      {canGenPromesse && (
        <div className="dashboard-card space-y-3">
          <h2 className="font-semibold text-brun-nuit flex items-center gap-2"><FileText className="w-4 h-4" /> Générer la promesse de vente</h2>
          <div>
            <label className="label-field">Conditions suspensives (facultatif)</label>
            <textarea value={conditions} onChange={e => setConditions(e.target.value)} className="input-field resize-none" rows={3} placeholder="Ex : Obtention prêt bancaire, levée d'hypothèque…" />
          </div>
          <div>
            <label className="label-field">Date limite de signature</label>
            <input type="date" value={dateLimite} onChange={e => setDateLimite(e.target.value)} className="input-field" />
          </div>
          <button onClick={genererPromesse} disabled={loading} className="btn-accent w-full">{loading ? 'Génération…' : 'Générer la promesse PDF'}</button>
        </div>
      )}
    </div>
  )
}
