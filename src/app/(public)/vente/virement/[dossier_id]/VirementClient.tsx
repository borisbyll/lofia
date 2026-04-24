'use client'
import { useState } from 'react'
import { CheckCircle2, Building2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix } from '@/lib/utils'

interface Props { dossier: any; userId: string }

export default function VirementClient({ dossier, userId }: Props) {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  const isAcheteur = dossier.acheteur_id === userId
  const isVendeur  = dossier.vendeur_id  === userId
  const promesse   = Array.isArray(dossier.promesse) ? dossier.promesse[0] : dossier.promesse
  const bien       = dossier.bien as any

  // Acheteur a déclaré, vendeur confirme réception
  const acheteurDeclare = dossier.acheteur_declare_virement
  const vendeurConfirme = dossier.vendeur_confirme_reception

  async function declarerVirement() {
    setLoading(true)
    const r = await fetch('/api/vente/declarer-virement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_id: dossier.id }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) setDone(true)
    else toast.error(d.error ?? 'Erreur')
  }

  async function confirmerReception() {
    setLoading(true)
    const r = await fetch('/api/vente/confirmer-reception', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_id: dossier.id }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) setDone(true)
    else toast.error(d.error ?? 'Erreur')
  }

  if (done || vendeurConfirme) return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="font-black text-brun-nuit text-xl mb-2">
          {isVendeur ? 'Réception confirmée !' : 'Virement déclaré !'}
        </h1>
        <p className="text-brun-doux text-sm mb-6">
          {isVendeur ? 'Le dossier est transmis au modérateur pour finalisation.' : 'Le vendeur va confirmer la réception.'}
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cream">
      <div className="wrap py-8 max-w-xl mx-auto space-y-6">
        <div className="dashboard-card space-y-3">
          <h1 className="font-black text-brun-nuit text-xl flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-500" /> Virement bancaire
          </h1>
          <p className="text-sm text-brun-doux">{bien?.titre} · {bien?.ville}</p>
        </div>

        {/* Coordonnées bancaires */}
        {promesse && (
          <div className="dashboard-card space-y-3">
            <h2 className="font-semibold text-brun-nuit text-sm">Coordonnées bancaires du vendeur</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 font-mono text-sm">
              {promesse.banque_vendeur && <div><span className="text-brun-doux">Banque :</span> {promesse.banque_vendeur}</div>}
              {promesse.nom_compte_vendeur && <div><span className="text-brun-doux">Nom :</span> {promesse.nom_compte_vendeur}</div>}
              {promesse.numero_compte_vendeur && <div><span className="text-brun-doux">Compte :</span> {promesse.numero_compte_vendeur}</div>}
              <div><span className="text-brun-doux">Montant :</span> <span className="font-black text-primary-600">{formatPrix(promesse.prix_vente)}</span></div>
              <div><span className="text-brun-doux">Référence :</span> {dossier.reference}</div>
            </div>
            {promesse.commission_lofia && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ La commission LOFIA ({promesse.taux_commission}% = {formatPrix(promesse.commission_lofia)}) sera facturée séparément au vendeur par notre équipe.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions selon le rôle */}
        {isAcheteur && !acheteurDeclare && (
          <button onClick={declarerVirement} disabled={loading} className="btn-accent w-full">
            {loading ? 'Envoi…' : "✅ J'ai effectué le virement"}
          </button>
        )}
        {isAcheteur && acheteurDeclare && !vendeurConfirme && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-green-700 font-semibold text-sm">Virement déclaré — en attente de confirmation du vendeur.</p>
          </div>
        )}
        {isVendeur && acheteurDeclare && !vendeurConfirme && (
          <div className="dashboard-card space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-brun-nuit">L&apos;acheteur a déclaré avoir effectué le virement. Confirmez-vous l&apos;avoir reçu ?</p>
            </div>
            <button onClick={confirmerReception} disabled={loading} className="btn-primary w-full">
              {loading ? 'Confirmation…' : '✅ Confirmer la réception du virement'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
