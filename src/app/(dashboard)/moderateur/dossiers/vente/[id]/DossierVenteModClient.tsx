'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Phone, User } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix, formatDate } from '@/lib/utils'
import ProcessTracker, { ETAPES_VENTE } from '@/components/ProcessTracker'

interface Props { dossier: any; agents: any[] }

export default function DossierVenteModClient({ dossier: initial, agents }: Props) {
  const router = useRouter()
  const [dossier,  setDossier]  = useState(initial)
  const [loading,  setLoading]  = useState(false)
  const [dateV,    setDateV]    = useState('')
  const [heureV,   setHeureV]   = useState('09:00')
  const [agentId,  setAgentId]  = useState('')
  const [decVend,  setDecVend]  = useState<'accepte' | 'refuse'>('accepte')
  const [confirm,  setConfirm]  = useState(false)

  const bien     = dossier.bien as any
  const acheteur = dossier.acheteur as any
  const vendeur  = dossier.vendeur as any
  const promesse = Array.isArray(dossier.promesse) ? dossier.promesse[0] : dossier.promesse

  async function planifier() {
    if (!dateV) return toast.error('Date requise')
    setLoading(true)
    const r = await fetch('/api/moderateur/vente/planifier-visite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_id: dossier.id, date_visite: `${dateV}T${heureV}:00`, agent_id: agentId || undefined }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success('Visite planifiée !'); setDossier((p: any) => ({ ...p, statut: 'visite_planifiee' })) }
    else toast.error(d.error ?? 'Erreur')
  }

  async function enregistrerDecisionVendeur() {
    setLoading(true)
    const r = await fetch('/api/vente/decision-vendeur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_id: dossier.id, decision: decVend }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success('Décision enregistrée !'); setDossier((p: any) => ({ ...p, statut: decVend === 'accepte' ? 'vendeur_accepte' : 'vendeur_refuse' })) }
    else toast.error(d.error ?? 'Erreur')
  }

  async function marquerVendu() {
    if (!confirm) return toast.error('Cochez la confirmation')
    setLoading(true)
    const r = await fetch('/api/vente/marquer-vendu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_id: dossier.id }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success('Vente finalisée !'); setDossier((p: any) => ({ ...p, statut: 'vendu' })) }
    else toast.error(d.error ?? 'Erreur')
  }

  // Action contextuelle
  let action: React.ReactNode = null
  if (dossier.statut === 'demande_recue') {
    action = (
      <div className="space-y-2 mt-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={dateV} onChange={e => setDateV(e.target.value)} className="input-field text-xs" />
          <input type="time" value={heureV} onChange={e => setHeureV(e.target.value)} className="input-field text-xs" />
        </div>
        <select value={agentId} onChange={e => setAgentId(e.target.value)} className="input-field text-xs w-full">
          <option value="">— Choisir un agent (optionnel)</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.prenom} {a.nom} — {a.telephone}</option>)}
        </select>
        <button onClick={planifier} disabled={loading} className="btn-primary text-sm w-full">Planifier la visite</button>
      </div>
    )
  } else if (dossier.statut === 'acheteur_interesse') {
    action = (
      <div className="space-y-2 mt-2">
        <div className="flex gap-2">
          <button onClick={() => setDecVend('accepte')} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border ${decVend === 'accepte' ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 text-brun-doux'}`}>Accepter</button>
          <button onClick={() => setDecVend('refuse')}  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border ${decVend === 'refuse'  ? 'bg-red-500 text-white border-red-500'     : 'border-gray-200 text-brun-doux'}`}>Refuser</button>
        </div>
        <button onClick={enregistrerDecisionVendeur} disabled={loading} className="btn-primary text-sm w-full">Enregistrer la décision du vendeur</button>
      </div>
    )
  } else if (dossier.statut === 'vendeur_accepte') {
    action = (
      <Link href={`/moderateur/dossiers/vente/${dossier.id}/generer-promesse`} className="btn-accent text-sm mt-2 inline-block">
        Générer la promesse de vente
      </Link>
    )
  } else if (dossier.statut === 'virement_confirme') {
    action = (
      <div className="space-y-2 mt-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="w-4 h-4 mt-0.5 accent-primary-500" />
          <span className="text-xs text-brun-nuit">Je confirme que la vente de {bien?.titre} est finalisée</span>
        </label>
        <button onClick={marquerVendu} disabled={loading || !confirm} className="btn-primary text-sm w-full bg-green-600 hover:bg-green-700">
          ✅ Marquer comme vendu
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 pb-nav max-w-2xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-brun-doux hover:text-primary-500 text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="dashboard-card flex gap-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-or-pale">
          {bien?.photo_principale && <Image src={bien.photo_principale} alt={bien.titre} fill className="object-cover" sizes="80px" />}
        </div>
        <div>
          <h1 className="font-black text-brun-nuit">{bien?.titre}</h1>
          <p className="text-sm text-brun-doux">{bien?.ville} · {formatPrix(bien?.prix)}</p>
          <p className="font-mono text-xs text-primary-500 mt-1">{dossier.reference}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="dashboard-card space-y-2">
          <h3 className="font-semibold text-brun-nuit text-sm flex items-center gap-1"><User className="w-3.5 h-3.5" /> Acheteur</h3>
          <p className="text-sm">{acheteur?.nom}</p>
          {acheteur?.phone && <a href={`tel:${acheteur.phone}`} className="flex items-center gap-1 text-xs text-primary-500"><Phone className="w-3 h-3" />{acheteur.phone}</a>}
        </div>
        <div className="dashboard-card space-y-2">
          <h3 className="font-semibold text-brun-nuit text-sm flex items-center gap-1"><User className="w-3.5 h-3.5" /> Vendeur</h3>
          <p className="text-sm">{vendeur?.nom}</p>
          {vendeur?.phone && <a href={`tel:${vendeur.phone}`} className="flex items-center gap-1 text-xs text-primary-500"><Phone className="w-3 h-3" />{vendeur.phone}</a>}
        </div>
      </div>

      {dossier.date_visite && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-700 font-semibold">Visite : {formatDate(dossier.date_visite)}</p>
        </div>
      )}

      <div className="dashboard-card">
        <h2 className="font-semibold text-brun-nuit mb-4">Avancement</h2>
        <ProcessTracker etapes={ETAPES_VENTE} statut={dossier.statut} action={action} />
      </div>

      {promesse && (
        <Link href={`/vente/promesse/${promesse.id}`} className="dashboard-card flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="font-semibold text-brun-nuit">{promesse.numero_promesse}</p>
            <p className="text-sm text-brun-doux">{promesse.statut?.replace(/_/g,' ')}</p>
          </div>
          <span className="btn-outline text-sm px-3 py-1.5">Voir</span>
        </Link>
      )}
    </div>
  )
}
