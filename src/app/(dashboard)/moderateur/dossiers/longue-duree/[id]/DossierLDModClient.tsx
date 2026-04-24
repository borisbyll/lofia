'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, User, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix, formatDate } from '@/lib/utils'
import ProcessTracker, { ETAPES_LONGUE_DUREE } from '@/components/ProcessTracker'

interface Props { dossier: any; agents: any[] }

export default function DossierLDModClient({ dossier: initial, agents }: Props) {
  const router  = useRouter()
  const [dossier,  setDossier]  = useState(initial)
  const [loading,  setLoading]  = useState(false)
  const [dateV,    setDateV]    = useState('')
  const [heureV,   setHeureV]   = useState('09:00')
  const [agentId,  setAgentId]  = useState('')
  const [decProp,  setDecProp]  = useState<'accepte' | 'refuse'>('accepte')

  const bien    = dossier.bien as any
  const loc     = dossier.locataire as any
  const proprio = dossier.proprietaire as any

  async function planifier() {
    if (!dateV) return toast.error('Date requise')
    setLoading(true)
    const r = await fetch('/api/moderateur/longue-duree/planifier-visite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_id: dossier.id, date_visite: `${dateV}T${heureV}:00`, agent_id: agentId || undefined }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success('Visite planifiée !'); setDossier((p: any) => ({ ...p, statut: 'visite_planifiee', date_visite: `${dateV}T${heureV}:00` })) }
    else toast.error(d.error ?? 'Erreur')
  }

  async function enregistrerDecisionProprietaire() {
    setLoading(true)
    const r = await fetch('/api/longue-duree/decision-proprietaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_id: dossier.id, decision: decProp }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success('Décision enregistrée !'); setDossier((p: any) => ({ ...p, statut: decProp === 'accepte' ? 'proprietaire_accepte' : 'proprietaire_refuse' })) }
    else toast.error(d.error ?? 'Erreur')
  }

  async function genererContrat() {
    router.push(`/moderateur/dossiers/longue-duree/${dossier.id}/generer-contrat`)
  }

  // Action contextuelle selon statut
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
  } else if (dossier.statut === 'locataire_interesse') {
    action = (
      <div className="space-y-2 mt-2">
        <div className="flex gap-2">
          <button onClick={() => setDecProp('accepte')}  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border ${decProp === 'accepte'  ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 text-brun-doux'}`}>Accepter</button>
          <button onClick={() => setDecProp('refuse')}   className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border ${decProp === 'refuse'   ? 'bg-red-500 text-white border-red-500'     : 'border-gray-200 text-brun-doux'}`}>Refuser</button>
        </div>
        <button onClick={enregistrerDecisionProprietaire} disabled={loading} className="btn-primary text-sm w-full">Enregistrer la décision du propriétaire</button>
      </div>
    )
  } else if (dossier.statut === 'proprietaire_accepte') {
    action = <button onClick={genererContrat} className="btn-accent text-sm mt-2">Générer le contrat</button>
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
          <p className="text-sm text-brun-doux">{bien?.ville} · {formatPrix(bien?.prix)}/mois</p>
          <p className="font-mono text-xs text-primary-500 mt-1">{dossier.reference}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="dashboard-card space-y-2">
          <h3 className="font-semibold text-brun-nuit text-sm flex items-center gap-1"><User className="w-3.5 h-3.5" /> Locataire</h3>
          <p className="text-sm">{loc?.nom}</p>
          {loc?.phone && <a href={`tel:${loc.phone}`} className="flex items-center gap-1 text-xs text-primary-500"><Phone className="w-3 h-3" />{loc.phone}</a>}
        </div>
        <div className="dashboard-card space-y-2">
          <h3 className="font-semibold text-brun-nuit text-sm flex items-center gap-1"><User className="w-3.5 h-3.5" /> Propriétaire</h3>
          <p className="text-sm">{proprio?.nom}</p>
          {proprio?.phone && <a href={`tel:${proprio.phone}`} className="flex items-center gap-1 text-xs text-primary-500"><Phone className="w-3 h-3" />{proprio.phone}</a>}
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
        <ProcessTracker etapes={ETAPES_LONGUE_DUREE} statut={dossier.statut} action={action} />
      </div>
    </div>
  )
}
