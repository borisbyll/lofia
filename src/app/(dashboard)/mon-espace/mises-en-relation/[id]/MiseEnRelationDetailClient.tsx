'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatPrix, formatDate } from '@/lib/utils'
import { CheckCircle, Clock, ArrowLeft, Calendar, FileText, Home, User, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboardMode } from '@/store/dashboardModeStore'

export default function MiseEnRelationDetailClient({ mer, contrat, userId }: { mer: any; contrat: any; userId: string }) {
  const router = useRouter()
  const { mode, setMode } = useDashboardMode()
  const [loading, setLoading]       = useState(false)
  const [dateVisite, setDateVisite] = useState(mer.date_visite_proposee?.split('T')[0] ?? '')
  const [heureVisite, setHeureVisite] = useState(
    mer.date_visite_proposee ? new Date(mer.date_visite_proposee).toTimeString().slice(0, 5) : '09:00'
  )
  const [current, setCurrent]       = useState(mer)

  const bien         = mer.bien as any
  const locataire    = mer.locataire as any
  const proprietaire = mer.proprietaire as any
  const isProprietaire = mer.proprietaire_id === userId

  // Auto-basculer le toggle au chargement selon le rôle sur CETTE demande
  useEffect(() => {
    setMode(isProprietaire ? 'proprietaire' : 'locataire')
  }, [isProprietaire, setMode])

  // Si le mode devient incompatible → retour à la liste
  useEffect(() => {
    if (mode === 'proprietaire' && !isProprietaire) router.push('/mon-espace/mises-en-relation')
    if (mode === 'locataire'    &&  isProprietaire) router.push('/mon-espace/mises-en-relation')
  }, [mode, isProprietaire, router])
  const autre          = isProprietaire ? locataire : proprietaire
  const moi            = isProprietaire ? proprietaire : locataire
  const maConfirmation = isProprietaire ? current.visite_confirmee_proprietaire : current.visite_confirmee_locataire

  async function confirmer() {
    setLoading(true)
    const r = await fetch('/api/longue-duree/confirmer-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mer_id: mer.id, date_visite: dateVisite ? `${dateVisite}T${heureVisite}:00` : undefined }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) {
      toast.success('Confirmation enregistrée !')
      setCurrent((prev: any) => ({
        ...prev,
        visite_confirmee_proprietaire: isProprietaire ? true : prev.visite_confirmee_proprietaire,
        visite_confirmee_locataire:    !isProprietaire ? true : prev.visite_confirmee_locataire,
        statut: d.statut ?? prev.statut,
      }))
    } else toast.error(d.error ?? 'Erreur')
  }

  async function genererContrat() {
    router.push(`/mon-espace/mises-en-relation/${mer.id}/generer-contrat`)
  }

  const statutLabel: Record<string, string> = {
    en_attente: 'En attente de confirmation', visite_confirmee: 'Visite confirmée — contrat à générer',
    contrat_genere: 'Contrat généré — en attente de signature', signe: 'Signé', expire: 'Expiré', annule: 'Annulé',
  }
  const statutBadge: Record<string, string> = {
    en_attente: 'badge-en-attente', visite_confirmee: 'badge-success', contrat_genere: 'badge-accent',
    signe: 'badge-success', expire: 'badge-gray', annule: 'badge-danger',
  }

  return (
    <div className="p-4 md:p-6 pb-nav max-w-2xl mx-auto space-y-5">
      {/* Retour */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-brun-doux hover:text-primary-500 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      {/* Bien */}
      <div className="dashboard-card flex gap-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-or-pale">
          {bien?.photo_principale && <Image src={bien.photo_principale} alt={bien.titre} fill className="object-cover" sizes="80px" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h1 className="font-black text-brun-nuit text-lg leading-snug">{bien?.titre}</h1>
            <span className={statutBadge[current.statut] ?? 'badge-gray'}>{statutLabel[current.statut] ?? current.statut}</span>
          </div>
          <p className="text-sm text-brun-doux">{[bien?.quartier, bien?.ville].filter(Boolean).join(', ')}</p>
          <p className="prix text-base">{formatPrix(bien?.prix)}<span className="text-xs font-normal text-brun-doux ml-1">/mois</span></p>
        </div>
      </div>

      {/* Code visite */}
      <div className="dashboard-card">
        <p className="text-xs text-brun-doux mb-1">Code de visite</p>
        <p className="font-mono font-black text-xl text-primary-500">{mer.code_visite}</p>
        <p className="text-xs text-brun-doux mt-1">Demande reçue le {formatDate(mer.created_at)}</p>
      </div>

      {/* Interlocuteur */}
      <div className="dashboard-card space-y-3">
        <h2 className="font-semibold text-brun-nuit flex items-center gap-2"><User className="w-4 h-4" />
          {isProprietaire ? 'Candidat locataire' : 'Propriétaire'}
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-black text-primary-500 shrink-0">
            {autre?.nom?.charAt(0) ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-brun-nuit">{autre?.nom}</p>
            {autre?.phone && (
              <a href={`tel:${autre.phone}`} className="flex items-center gap-1 text-sm text-primary-500 hover:underline">
                <Phone className="w-3 h-3" /> {autre.phone}
              </a>
            )}
          </div>
        </div>
        {mer.message && (
          <div className="bg-primary-50 rounded-xl p-3">
            <p className="text-xs text-brun-doux mb-1">Message</p>
            <p className="text-sm text-brun-nuit">{mer.message}</p>
          </div>
        )}
      </div>

      {/* Confirmations */}
      <div className="dashboard-card space-y-4">
        <h2 className="font-semibold text-brun-nuit flex items-center gap-2"><Calendar className="w-4 h-4" /> Confirmation de visite</h2>

        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-sm ${current.visite_confirmee_proprietaire ? 'text-green-600' : 'text-brun-doux'}`}>
            {current.visite_confirmee_proprietaire ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            Propriétaire : {proprietaire?.nom}
          </div>
          <div className={`flex items-center gap-2 text-sm ${current.visite_confirmee_locataire ? 'text-green-600' : 'text-brun-doux'}`}>
            {current.visite_confirmee_locataire ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            Locataire : {locataire?.nom}
          </div>
        </div>

        {/* Proposer une date + heure */}
        {current.statut === 'en_attente' && (
          <div className="space-y-3">
            <p className="label-field text-xs">Date et heure de visite proposées (facultatif)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-brun-doux font-medium mb-1 block">Date</label>
                <input type="date" value={dateVisite} onChange={e => setDateVisite(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} className="input-field" />
              </div>
              <div>
                <label className="text-[11px] text-brun-doux font-medium mb-1 block">Heure</label>
                <input type="time" value={heureVisite} onChange={e => setHeureVisite(e.target.value)}
                  className="input-field" />
              </div>
            </div>
          </div>
        )}

        {/* Bouton confirmer */}
        {!maConfirmation && current.statut === 'en_attente' && (
          <button onClick={confirmer} disabled={loading} className="btn-primary w-full">
            {loading ? 'Confirmation…' : 'Confirmer ma participation à la visite'}
          </button>
        )}

        {maConfirmation && current.statut === 'en_attente' && (
          <p className="text-sm text-green-600 text-center">Vous avez confirmé — en attente de l&apos;autre partie.</p>
        )}

        {current.date_visite_proposee && (
          <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-600 shrink-0" />
            <div>
              <p className="text-sm text-green-700 font-semibold">
                {formatDate(current.date_visite_proposee)}
              </p>
              <p className="text-xs text-green-600">
                {new Date(current.date_visite_proposee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Générer contrat (proprio, visite confirmée, pas encore de contrat) */}
      {isProprietaire && current.statut === 'visite_confirmee' && !contrat && (
        <div className="dashboard-card space-y-3">
          <h2 className="font-semibold text-brun-nuit flex items-center gap-2"><FileText className="w-4 h-4" /> Prochaine étape</h2>
          <p className="text-sm text-brun-doux">Les deux parties ont confirmé. Vous pouvez maintenant générer le contrat de location.</p>
          <Link href={`/mon-espace/mises-en-relation/${mer.id}/generer-contrat`} className="btn-accent w-full block text-center">
            Générer le contrat de location
          </Link>
        </div>
      )}

      {/* Lien vers contrat existant */}
      {contrat && (
        <Link href={`/mon-espace/contrats/${contrat.id}`} className="dashboard-card flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary-400" />
            <div>
              <p className="font-semibold text-brun-nuit">Contrat {contrat.numero_contrat}</p>
              <p className="text-sm text-brun-doux capitalize">{contrat.statut?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <span className="btn-outline text-sm px-3 py-1.5">Voir le contrat</span>
        </Link>
      )}
    </div>
  )
}
