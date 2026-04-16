'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Mail, Home, User, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { formatDate, cn } from '@/lib/utils'

interface Message {
  id: string
  nom: string
  email: string
  message: string
  lu: boolean
  created_at: string
  bien: { titre: string; slug: string } | null
}

export default function MessagesPage() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Message | null>(null)

  useEffect(() => {
    if (!user) return
    loadMessages()
  }, [user])

  const loadMessages = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('messages_contact')
      .select('id, nom, email, message, lu, created_at, bien:biens!bien_id(titre, slug)')
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: false })
    setMessages((data as any) ?? [])
    setLoading(false)
  }

  const marquerLu = async (id: string) => {
    await supabase.from('messages_contact').update({ lu: true }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, lu: true } : m))
  }

  const handleSelect = (msg: Message) => {
    setSelected(msg)
    if (!msg.lu) marquerLu(msg.id)
  }

  const nonLus = messages.filter(m => !m.lu).length

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Demandes reçues</h1>
        {nonLus > 0 && (
          <p className="text-sm text-primary-600 font-semibold mt-0.5">
            {nonLus} message{nonLus > 1 ? 's' : ''} non lu{nonLus > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4 min-h-[500px]">
        {/* Liste messages */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune demande reçue</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {messages.map(msg => {
                const bienData = msg.bien as any
                return (
                  <button key={msg.id}
                    onClick={() => handleSelect(msg)}
                    className={cn(
                      'w-full text-left p-4 hover:bg-gray-50 transition-colors',
                      selected?.id === msg.id && 'bg-primary-50',
                      !msg.lu && 'border-l-4 border-l-primary-500'
                    )}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn('text-sm truncate', !msg.lu ? 'font-bold text-gray-900' : 'font-medium text-gray-700')}>
                            {msg.nom}
                          </p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {bienData?.titre ?? 'Bien inconnu'}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Détail message */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400">
              <MessageSquare size={40} className="mb-3 opacity-20" />
              <p className="text-sm">Sélectionnez un message</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Expéditeur */}
              <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <User size={22} className="text-primary-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selected.nom}</p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <a href={`mailto:${selected.email}`}
                      className="text-xs text-primary-500 flex items-center gap-1 hover:underline">
                      <Mail size={11} /> {selected.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Bien concerné */}
              {(selected.bien as any)?.titre && (
                <div className="mt-4 mb-4 p-3 bg-gray-50 rounded-xl flex items-center gap-2.5">
                  <Home size={14} className="text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Annonce concernée</p>
                    <p className="text-sm font-semibold text-gray-900">{(selected.bien as any).titre}</p>
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Clock size={11} /> {new Date(selected.created_at).toLocaleString('fr-FR')}
                </p>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selected.message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-5">
                <a href={`mailto:${selected.email}?subject=Re: ${(selected.bien as any)?.titre ?? 'Votre demande'}`}
                  className="btn btn-primary flex-1 justify-center gap-2 text-sm">
                  <Mail size={15} /> Répondre par email
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
