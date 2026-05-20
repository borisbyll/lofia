'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatPrix, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Lock, Unlock, AlertTriangle, CheckCircle2, Clock,
  ChevronRight, Shield, Ban, PlayCircle, RefreshCw,
} from 'lucide-react'

type Tab = 'sequestre' | 'liberes'

interface ResaFonds {
  id: string
  statut: string
  prix_total: number
  montant_proprio: number
  commission: number
  paiement_at: string | null
  check_in_at: string | null
  liberation_fonds_at: string | null
  proprio_paye: boolean
  proprio_paye_at: string | null
  liberation_bloquee: boolean
  liberation_bloquee_raison: string | null
  date_debut: string
  date_fin: string
  bien: { titre: string; ville: string } | null
  locataire: { nom: string; phone: string } | null
  proprietaire: { nom: string; phone: string } | null
}

export default function AdminFondsPage() {
  const [tab, setTab] = useState<Tab>('sequestre')
  const [sequestre, setSequestre] = useState<ResaFonds[]>([])
  const [liberes, setLiberes] = useState<ResaFonds[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ResaFonds | null>(null)
  const [raisonBlocage, setRaisonBlocage] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'bloquer' | 'debloquer' | 'liberer' | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const fields = 'id, statut, prix_total, montant_proprio, commission, paiement_at, check_in_at, liberation_fonds_at, proprio_paye, proprio_paye_at, liberation_bloquee, liberation_bloquee_raison, date_debut, date_fin, bien:biens!bien_id(titre,ville), locataire:profiles!locataire_id(nom,phone), proprietaire:profiles!proprietaire_id(nom,phone)'

    const [{ data: seq }, { data: lib }] = await Promise.all([
      supabase.from('reservations')
        .select(fields)
        .in('statut', ['confirme', 'en_sejour'])
        .eq('paiement_effectue', true)
        .eq('proprio_paye', false)
        .order('liberation_fonds_at', { ascending: true }),
      supabase.from('reservations')
        .select(fields)
        .eq('proprio_paye', true)
        .order('proprio_paye_at', { ascending: false })
        .limit(50),
    ])
    setSequestre((seq as any) ?? [])
    setLiberes((lib as any) ?? [])
    setLoading(false)
  }

  const doAction = async (action: 'bloquer' | 'debloquer' | 'liberer') => {
    if (!selected) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/fonds/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, raison: raisonBlocage || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSelected(null)
      setConfirmAction(null)
      setRaisonBlocage('')
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const librerationCountdown = (at: string | null) => {
    if (!at) return null
    const diff = new Date(at).getTime() - Date.now()
    if (diff <= 0) return 'Libération imminente'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}min restant`
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Gestion des fonds</h1>
        <p className="text-gray-500 text-sm mt-0.5">Séquestre en cours et transferts effectués</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([
          { key: 'sequestre', label: 'En séquestre', count: sequestre.length, icon: Lock },
          { key: 'liberes',   label: 'Libérés',      count: liberes.length,   icon: Unlock },
        ] as const).map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all', {
                'bg-primary-500 text-white shadow-sm': tab === t.key,
                'bg-white text-gray-600 border border-gray-200 hover:border-primary-200': tab !== t.key,
              })}>
              <Icon size={15} />
              {t.label}
              <span className={cn('text-xs rounded-full px-1.5 py-0.5 font-bold', {
                'bg-white/20 text-white': tab === t.key,
                'bg-gray-100 text-gray-500': tab !== t.key,
              })}>{loading ? '…' : t.count}</span>
            </button>
          )
        })}
        <button onClick={load} className="ml-auto p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-primary-200 hover:text-primary-500 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Tableau séquestre */}
      {tab === 'sequestre' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex gap-4">
                  <div className="skeleton h-4 rounded w-1/4" />
                  <div className="skeleton h-4 rounded w-1/4" />
                  <div className="skeleton h-4 rounded w-1/5 ml-auto" />
                </div>
              ))}
            </div>
          ) : sequestre.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Lock size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun fond en séquestre</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                  <tr>
                    <th className="text-left px-4 py-3">Bien / Locataire</th>
                    <th className="text-left px-4 py-3">Propriétaire</th>
                    <th className="text-left px-4 py-3">Montant</th>
                    <th className="text-left px-4 py-3">Libération prévue</th>
                    <th className="text-left px-4 py-3">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sequestre.map(r => {
                    const bloque = r.liberation_bloquee
                    const countdown = librerationCountdown(r.liberation_fonds_at)
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 truncate max-w-[180px]">
                            {(r.bien as any)?.titre ?? '—'}
                          </p>
                          <p className="text-xs text-gray-400">{(r.locataire as any)?.nom ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700">{(r.proprietaire as any)?.nom ?? '—'}</p>
                          <p className="text-xs text-gray-400">{(r.proprietaire as any)?.phone ?? ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-black text-primary-600">{formatPrix(r.montant_proprio)}</p>
                          <p className="text-[10px] text-gray-400">Total : {formatPrix(r.prix_total)}</p>
                        </td>
                        <td className="px-4 py-3">
                          {r.liberation_fonds_at ? (
                            <>
                              <p className="text-xs text-gray-700">{formatDate(r.liberation_fonds_at)}</p>
                              {countdown && (
                                <p className={cn('text-[10px] font-semibold mt-0.5', {
                                  'text-amber-600': !bloque,
                                  'text-red-500': bloque,
                                })}>{bloque ? 'BLOQUÉ' : countdown}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Check-in non confirmé</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {bloque ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                              <Ban size={10} /> Bloqué
                            </span>
                          ) : r.statut === 'en_sejour' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                              <Clock size={10} /> En séjour
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                              <Shield size={10} /> Confirmé
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setSelected(r); setConfirmAction(null); setRaisonBlocage('') }}
                            className="flex items-center gap-1 text-xs text-primary-500 font-semibold hover:text-primary-700">
                            Actions <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tableau libérés */}
      {tab === 'liberes' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex gap-4">
                  <div className="skeleton h-4 rounded w-1/4" />
                  <div className="skeleton h-4 rounded w-1/5 ml-auto" />
                </div>
              ))}
            </div>
          ) : liberes.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Unlock size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun transfert effectué</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                  <tr>
                    <th className="text-left px-4 py-3">Bien</th>
                    <th className="text-left px-4 py-3">Propriétaire</th>
                    <th className="text-left px-4 py-3">Locataire</th>
                    <th className="text-left px-4 py-3">Montant transféré</th>
                    <th className="text-left px-4 py-3">Libéré le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {liberes.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 truncate max-w-[180px]">
                          {(r.bien as any)?.titre ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400">{(r.bien as any)?.ville ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{(r.proprietaire as any)?.nom ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{(r.locataire as any)?.nom ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-black text-green-700">{formatPrix(r.montant_proprio)}</p>
                        <p className="text-[10px] text-gray-400">sur {formatPrix(r.prix_total)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                          <span className="text-xs text-gray-600">{r.proprio_paye_at ? formatDate(r.proprio_paye_at) : '—'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Panel latéral actions */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => { setSelected(null); setConfirmAction(null) }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-t-3xl lg:rounded-2xl w-full max-w-md p-6 shadow-2xl z-10"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-black text-gray-900">{(selected.bien as any)?.titre ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Proprio : {(selected.proprietaire as any)?.nom ?? '—'} · Locataire : {(selected.locataire as any)?.nom ?? '—'}
                </p>
              </div>
              <p className="font-black text-primary-600 text-lg">{formatPrix(selected.montant_proprio)}</p>
            </div>

            {/* Infos séquestre */}
            <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Check-in</span>
                <span className="font-semibold">{selected.check_in_at ? formatDate(selected.check_in_at) : 'Non confirmé'}</span>
              </div>
              <div className="flex justify-between">
                <span>Libération prévue</span>
                <span className="font-semibold">{selected.liberation_fonds_at ? formatDate(selected.liberation_fonds_at) : '—'}</span>
              </div>
              {selected.liberation_bloquee && (
                <div className="flex justify-between text-red-600">
                  <span>Raison blocage</span>
                  <span className="font-semibold text-right max-w-[200px]">{selected.liberation_bloquee_raison ?? '—'}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {!confirmAction && (
              <div className="space-y-2">
                {!selected.liberation_bloquee ? (
                  <button
                    onClick={() => setConfirmAction('bloquer')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold">
                    <Ban size={16} />
                    Bloquer la libération
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction('debloquer')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-green-200 text-green-700 hover:bg-green-50 transition-colors text-sm font-semibold">
                    <Unlock size={16} />
                    Débloquer la libération
                  </button>
                )}

                {!selected.proprio_paye && (
                  <button
                    onClick={() => setConfirmAction('liberer')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary-200 text-primary-600 hover:bg-primary-50 transition-colors text-sm font-semibold">
                    <PlayCircle size={16} />
                    Libérer manuellement maintenant
                  </button>
                )}

                <button onClick={() => { setSelected(null); setConfirmAction(null) }}
                  className="w-full p-3 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                  Annuler
                </button>
              </div>
            )}

            {/* Confirmation bloquer */}
            {confirmAction === 'bloquer' && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Raison du blocage</p>
                <textarea
                  className="input-field w-full h-20 resize-none text-sm mb-4"
                  placeholder="Ex : litige signalé par le locataire, vérification en cours..."
                  value={raisonBlocage}
                  onChange={e => setRaisonBlocage(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => setConfirmAction(null)}
                    className="flex-1 p-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    Retour
                  </button>
                  <button onClick={() => doAction('bloquer')} disabled={actionLoading}
                    className="flex-1 p-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                    {actionLoading ? 'En cours…' : 'Confirmer le blocage'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation débloquer */}
            {confirmAction === 'debloquer' && (
              <div>
                <p className="text-sm text-gray-700 mb-4">
                  La libération automatique sera rétablie. Le propriétaire recevra une notification.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmAction(null)}
                    className="flex-1 p-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    Retour
                  </button>
                  <button onClick={() => doAction('debloquer')} disabled={actionLoading}
                    className="flex-1 p-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                    {actionLoading ? 'En cours…' : 'Débloquer'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation libérer manuellement */}
            {confirmAction === 'liberer' && (
              <div>
                <p className="text-sm text-gray-700 mb-1">
                  Vous allez libérer <span className="font-black text-primary-600">{formatPrix(selected.montant_proprio)}</span> immédiatement vers le propriétaire.
                </p>
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mb-4">
                  Cette action est irréversible. Le propriétaire et le locataire recevront une notification.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmAction(null)}
                    className="flex-1 p-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    Retour
                  </button>
                  <button onClick={() => doAction('liberer')} disabled={actionLoading}
                    className="flex-1 p-3 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 disabled:opacity-50">
                    {actionLoading ? 'En cours…' : 'Libérer maintenant'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
