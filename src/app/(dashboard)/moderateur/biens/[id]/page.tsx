'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CheckCircle, XCircle, ChevronLeft, Loader2, Home, MapPin, DollarSign, User, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { formatPrix, formatDate } from '@/lib/utils'

export default function ReviewBienPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthStore()
  const bienId = params.id as string

  const [bien,    setBien]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [action,  setAction]  = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => { loadBien() }, [bienId])

  const loadBien = async () => {
    const { data } = await supabase
      .from('biens')
      .select(`
        *, proprietaire:profiles!owner_id(*),
        documents(id, type_doc, url, created_at)
      `)
      .eq('id', bienId)
      .single()
    setBien(data)
    setLoading(false)
  }

  const handleDecision = async (decision: 'publie' | 'rejete') => {
    if (decision === 'rejete' && !comment.trim()) {
      toast.error('Ajoutez un commentaire pour justifier le rejet')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('biens').update({
        statut:           decision,
        moderateur_id:    user!.id,
        modere_at:        new Date().toISOString(),
        note_moderation:  comment || null,
      }).eq('id', bienId)

      if (error) throw error

      // Notification au propriétaire
      await supabase.from('notifications').insert({
        user_id: bien.owner_id,
        type:    decision === 'publie' ? 'bien_approuve' : 'bien_rejete',
        titre:   decision === 'publie' ? 'Annonce approuvée ✅' : 'Annonce rejetée ❌',
        corps:   decision === 'publie'
          ? `Votre annonce "${bien.titre}" a été approuvée et est maintenant visible.`
          : `Votre annonce "${bien.titre}" a été rejetée. Motif : ${comment}`,
        lien:    `/mon-espace/mes-biens`,
      })

      toast.success(decision === 'publie' ? 'Annonce approuvée !' : 'Annonce rejetée')
      router.push('/moderateur')
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  )

  if (!bien) return (
    <div className="p-8 text-center text-gray-500">Annonce introuvable</div>
  )

  const photos = bien.photos ?? []
  const propData = bien.proprietaire ?? {}

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900">Examen de l'annonce</h1>
          <p className="text-sm text-gray-400">Soumise le {formatDate(bien.created_at)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Contenu bien */}
        <div className="space-y-5">
          {/* Carousel photos */}
          {photos.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="relative aspect-video bg-gray-100">
                <img src={photos[photoIdx]} alt="" className="w-full h-full object-cover" />
                {photos.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {photos.map((_: any, i: number) => (
                      <button key={i} onClick={() => setPhotoIdx(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? 'bg-white scale-125' : 'bg-white/50'}`} />
                    ))}
                  </div>
                )}
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {photos.map((url: string, i: number) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === photoIdx ? 'border-primary-500' : 'border-transparent'}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Infos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-black text-gray-900 text-lg mb-1">{bien.titre}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge badge-primary">{bien.categorie}</span>
              <span className="badge">{bien.type_bien}</span>
              {bien.meuble && <span className="badge badge-success">Meublé</span>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign size={15} className="text-gray-400" />
                <span className="font-bold text-gray-900">{formatPrix(bien.prix)}</span>
                {bien.prix_negociable && <span className="text-xs text-green-600">négociable</span>}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={15} className="text-gray-400" />
                {bien.ville}{bien.commune ? `, ${bien.commune}` : ''}
              </div>
              {bien.surface && <div className="text-gray-600">Surface : <strong>{bien.surface} m²</strong></div>}
              {bien.nb_chambres && <div className="text-gray-600">Chambres : <strong>{bien.nb_chambres}</strong></div>}
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 border-t border-gray-100 pt-4">
              <p className="whitespace-pre-wrap">{bien.description}</p>
            </div>

            {bien.equipements?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2">Équipements</p>
                <div className="flex flex-wrap gap-1.5">
                  {bien.equipements.map((eq: string) => (
                    <span key={eq} className="badge">{eq}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          {bien.documents?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-primary-500" /> Documents joints
              </h3>
              <div className="space-y-2">
                {bien.documents.map((doc: any) => (
                  <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-sm">
                    <FileText size={16} className="text-gray-400" />
                    <span className="flex-1 font-medium text-gray-700">{doc.type_doc}</span>
                    <span className="text-xs text-primary-500">Ouvrir →</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel décision */}
        <div className="space-y-4">
          {/* Propriétaire */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User size={16} className="text-primary-500" /> Propriétaire
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                {propData.avatar_url
                  ? <img src={propData.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : <span className="text-primary-600 font-bold text-sm">{propData.nom?.charAt(0) ?? '?'}</span>
                }
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{propData.nom ?? '—'}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {propData.identite_verifiee && <span className="badge badge-success text-xs">Identité vérifiée</span>}
              {propData.is_diaspora && <span className="badge badge-primary text-xs">Diaspora</span>}
            </div>
          </div>

          {/* Décision */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-4">
            <h3 className="font-bold text-gray-900 mb-3">Décision</h3>

            <div className="mb-4">
              <label className="label-field">Commentaire</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                rows={4} placeholder="Remarques ou motif de rejet…"
                className="input-field resize-none text-sm" maxLength={500} />
            </div>

            <div className="space-y-2">
              <button onClick={() => handleDecision('publie')} disabled={saving || bien.statut !== 'en_attente'}
                className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                Approuver et publier
              </button>
              <button onClick={() => handleDecision('rejete')} disabled={saving || bien.statut !== 'en_attente'}
                className="btn btn-danger w-full justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                Rejeter
              </button>
            </div>

            {bien.statut !== 'en_attente' && (
              <p className="text-xs text-gray-400 text-center mt-3">
                Annonce déjà traitée : <strong>{bien.statut}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
