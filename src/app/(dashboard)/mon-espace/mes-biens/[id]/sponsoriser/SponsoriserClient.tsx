'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { CheckCircle, BarChart2 } from 'lucide-react'
import CarteFormule from '@/components/sponsoring/CarteFormule'
import BadgeSponsoring from '@/components/biens/BadgeSponsoring'

type Formule = { id: string; nom: string; prix: number; duree_jours: number; avantages: string[] }

export default function SponsoriserClient({ bien, success }: { bien: any; success: boolean }) {
  const [formules, setFormules]   = useState<Formule[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [stats, setStats]         = useState<any[]>([])
  const [sponsos, getSponsos]     = useState<any[]>([])

  useEffect(() => {
    if (success) toast.success('Sponsoring activé avec succès !')
    fetch('/api/sponsoring/formules').then(r => r.json()).then(d => setFormules(d.formules ?? []))
    fetch(`/api/sponsoring/${bien.id}/stats`).then(r => r.json()).then(d => { setStats(d.stats ?? []); getSponsos(d.sponsorisations ?? []) })
  }, [bien.id, success])

  async function souscrire() {
    if (!selected) return toast.error('Choisissez une formule')
    setLoading(true)
    const r = await fetch('/api/sponsoring/souscrire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bien_id: bien.id, formule_id: selected }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.paiement_url) window.location.href = d.paiement_url
    else toast.error(d.error ?? 'Erreur')
  }

  const totalVues   = stats.reduce((a, s) => a + (s.nombre_vues ?? 0), 0)
  const totalClics  = stats.reduce((a, s) => a + (s.nombre_clics_contact ?? 0), 0)

  return (
    <div className="p-4 md:p-6 pb-nav max-w-2xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title">Sponsoriser &quot;{bien.titre}&quot;</h1>
        <div className="flex items-center gap-2">
          <BadgeSponsoring niveau={bien.niveau_sponsoring ?? 'standard'} />
          {bien.sponsoring_actif_jusqu && (
            <p className="text-xs text-brun-doux">Actif jusqu&apos;au {formatDate(bien.sponsoring_actif_jusqu)}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card text-center">
          <BarChart2 className="w-5 h-5 text-primary-400 mx-auto mb-1" />
          <p className="text-2xl font-black text-brun-nuit">{totalVues}</p>
          <p className="text-xs text-brun-doux">Vues (30 jours)</p>
        </div>
        <div className="stat-card text-center">
          <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-2xl font-black text-brun-nuit">{totalClics}</p>
          <p className="text-xs text-brun-doux">Contacts (30 jours)</p>
        </div>
      </div>

      {/* Formules */}
      <div className="space-y-3">
        <h2 className="font-semibold text-brun-nuit">Choisissez une formule</h2>
        {formules.map(f => (
          <CarteFormule key={f.id} formule={f} selected={selected === f.id} onSelect={() => setSelected(f.id)} />
        ))}
      </div>

      <button onClick={souscrire} disabled={loading || !selected} className="btn-accent w-full text-base">
        {loading ? 'Redirection paiement…' : 'Payer et activer'}
      </button>

      {/* Historique */}
      {sponsos.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-brun-nuit">Historique</h2>
          {sponsos.map((s, i) => (
            <div key={i} className="dashboard-card flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold capitalize">{s.formule}</p>
                <p className="text-xs text-brun-doux">{formatDate(s.date_debut)} → {formatDate(s.date_fin)}</p>
              </div>
              <span className={s.statut === 'actif' ? 'badge-success' : s.statut === 'expire' ? 'badge-gray' : 'badge-en-attente'}>
                {s.statut}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
