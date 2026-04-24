'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Phone, User, Calendar, FileText } from 'lucide-react'
import { formatPrix, formatDate } from '@/lib/utils'
import { useDashboardMode } from '@/store/dashboardModeStore'
import ProcessTracker, { ETAPES_VENTE } from '@/components/ProcessTracker'

interface Props { dossier: any; userId: string }

export default function DossierVenteUserClient({ dossier, userId }: Props) {
  const router = useRouter()
  const { mode, setMode } = useDashboardMode()
  const prevModeRef = useRef<string | null>(null)

  const bien     = dossier.bien as any
  const acheteur = dossier.acheteur as any
  const vendeur  = dossier.vendeur as any
  const isVendeur = dossier.vendeur_id === userId
  const promesse  = Array.isArray(dossier.promesse) ? dossier.promesse[0] : dossier.promesse

  const expectedMode = isVendeur ? 'proprietaire' : 'locataire'

  useEffect(() => { setMode(expectedMode) }, [expectedMode, setMode])

  useEffect(() => {
    const prev = prevModeRef.current
    if (prev === null) { prevModeRef.current = mode; return }
    if (prev === mode) return
    if (mode === expectedMode) { prevModeRef.current = mode; return }
    prevModeRef.current = mode
    router.replace('/mon-espace/ventes')
  }, [mode, expectedMode, router])

  const contact = isVendeur ? acheteur : vendeur
  const contactLabel = isVendeur ? 'Acheteur' : 'Vendeur'

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
          <p className="text-sm text-brun-doux">{bien?.ville}</p>
          <p className="font-black text-primary-500">{formatPrix(bien?.prix)}</p>
          <p className="font-mono text-xs text-primary-400 mt-1">{dossier.reference}</p>
        </div>
      </div>

      <div className="dashboard-card space-y-2">
        <h3 className="font-semibold text-brun-nuit text-sm flex items-center gap-1"><User className="w-3.5 h-3.5" /> {contactLabel}</h3>
        <p className="text-sm">{contact?.nom}</p>
        {contact?.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-primary-500">
            <Phone className="w-3 h-3" />{contact.phone}
          </a>
        )}
      </div>

      {dossier.date_visite && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-700 font-semibold">Visite : {formatDate(dossier.date_visite)}</p>
        </div>
      )}

      <div className="dashboard-card">
        <h2 className="font-semibold text-brun-nuit mb-4">Avancement</h2>
        <ProcessTracker etapes={ETAPES_VENTE} statut={dossier.statut} />
      </div>

      {promesse && (
        <Link href={`/vente/promesse/${promesse.id}`} className="dashboard-card flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary-500" />
            <div>
              <p className="font-semibold text-brun-nuit text-sm">Promesse de vente</p>
              <p className="text-xs text-brun-doux capitalize">{promesse.statut?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <span className="btn-outline text-sm px-3 py-1.5">Voir / Signer</span>
        </Link>
      )}

      {dossier.statut === 'promesse_signee' && (
        <Link href={`/vente/virement/${dossier.id}`} className="dashboard-card flex items-center justify-between hover:shadow-md transition-shadow bg-blue-50 border border-blue-200">
          <p className="font-semibold text-blue-800 text-sm">
            {isVendeur ? 'Attendez le virement de l\'acheteur' : 'Effectuer le virement bancaire'}
          </p>
          <span className="btn-outline text-sm px-3 py-1.5 border-blue-400 text-blue-700">Détails</span>
        </Link>
      )}
    </div>
  )
}
