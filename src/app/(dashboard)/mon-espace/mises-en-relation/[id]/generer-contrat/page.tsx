'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import { toast } from 'sonner'

export default function GenererContratPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    loyer_mensuel: '', charges: '0', depot_garantie: '',
    frais_dossier: '25000', date_debut: '', duree_mois: '12',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function generer() {
    if (!form.loyer_mensuel || !form.date_debut) { toast.error('Remplissez le loyer et la date de début'); return }
    setLoading(true)
    const r = await fetch('/api/longue-duree/generer-contrat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mise_en_relation_id: id,
        loyer_mensuel:  Number(form.loyer_mensuel),
        charges:        Number(form.charges),
        depot_garantie: Number(form.depot_garantie || form.loyer_mensuel),
        frais_dossier:  Number(form.frais_dossier),
        date_debut:     form.date_debut,
        duree_mois:     Number(form.duree_mois),
      }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.contrat_id) {
      toast.success('Contrat généré !')
      router.push(`/mon-espace/contrats/${d.contrat_id}`)
    } else toast.error(d.error ?? 'Erreur')
  }

  return (
    <div className="p-4 md:p-6 pb-nav max-w-xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-brun-doux hover:text-primary-500 text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><FileText className="w-5 h-5" /> Générer le contrat</h1>
        <p className="page-subtitle">Les deux parties ont confirmé la visite</p>
      </div>

      <div className="dashboard-card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Loyer mensuel (FCFA) *</label>
            <input type="number" value={form.loyer_mensuel} onChange={e => set('loyer_mensuel', e.target.value)} className="input-field" placeholder="ex: 150000" />
          </div>
          <div>
            <label className="label-field">Charges (FCFA)</label>
            <input type="number" value={form.charges} onChange={e => set('charges', e.target.value)} className="input-field" placeholder="0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Dépôt de garantie (FCFA)</label>
            <input type="number" value={form.depot_garantie} onChange={e => set('depot_garantie', e.target.value)} className="input-field" placeholder="= 1 mois de loyer" />
          </div>
          <div>
            <label className="label-field">Frais de dossier LOFIA (FCFA)</label>
            <input type="number" value={form.frais_dossier} onChange={e => set('frais_dossier', e.target.value)} className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Date d&apos;entrée *</label>
            <input type="date" value={form.date_debut} onChange={e => set('date_debut', e.target.value)}
              min={new Date().toISOString().split('T')[0]} className="input-field" />
          </div>
          <div>
            <label className="label-field">Durée (mois)</label>
            <select value={form.duree_mois} onChange={e => set('duree_mois', e.target.value)} className="input-field">
              {[6, 12, 24, 36].map(m => <option key={m} value={m}>{m} mois</option>)}
            </select>
          </div>
        </div>

        <div className="bg-primary-50 rounded-xl p-3 text-sm text-brun-doux">
          <p>Le contrat PDF sera généré avec les informations du bien et des deux parties. Chacun recevra un lien de signature unique.</p>
        </div>

        <button onClick={generer} disabled={loading} className="btn-accent w-full text-base">
          {loading ? 'Génération du PDF…' : 'Générer et envoyer le contrat'}
        </button>
      </div>
    </div>
  )
}
