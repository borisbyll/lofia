'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, User, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  autre_user_id: string
  autre_nom: string
  autre_avatar: string | null
  dernierMessage: string
  dernierAt: string
  nonLus: number
  bien_titre?: string
}

interface Message {
  id: string
  contenu: string
  sender_id: string
  created_at: string
  lu: boolean
}

export default function MessageriePage() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv,    setActiveConv]    = useState<Conversation | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [newMsg,        setNewMsg]        = useState('')
  const [loading,       setLoading]       = useState(true)
  const [sending,       setSending]       = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    if (!user) return
    loadConversations()
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current)
    }
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    setLoading(true)
    // Toutes les conversations de l'utilisateur
    const { data: convs } = await supabase
      .from('conversations')
      .select(`
        id,
        proprietaire_id, locataire_id,
        bien:biens!bien_id(titre),
        conversation_messages(contenu, created_at, sender_id, lu)
      `)
      .or(`proprietaire_id.eq.${user!.id},locataire_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!convs) { setLoading(false); return }

    // Récupérer les profils des autres utilisateurs
    const otherIds = convs.map(c => c.proprietaire_id === user!.id ? c.locataire_id : c.proprietaire_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nom, avatar_url')
      .in('id', Array.from(new Set(otherIds)))

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

    const formatted: Conversation[] = convs.map(c => {
      const otherId = c.proprietaire_id === user!.id ? c.locataire_id : c.proprietaire_id
      const profile = profileMap[otherId] ?? {}
      const msgs = (c.conversation_messages as any[]) ?? []
      const last = msgs[msgs.length - 1]
      const nonLus = msgs.filter((m: any) => m.sender_id !== user!.id && !m.lu).length
      return {
        id: c.id,
        autre_user_id: otherId,
        autre_nom: profile.nom ?? 'Utilisateur',
        autre_avatar: profile.avatar_url ?? null,
        dernierMessage: last?.contenu ?? '',
        dernierAt: last?.created_at ?? '',
        nonLus,
        bien_titre: (c.bien as any)?.titre,
      }
    })

    setConversations(formatted)
    setLoading(false)
  }

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv)
    // Charger les messages
    const { data } = await supabase
      .from('conversation_messages')
      .select('id, contenu, sender_id, created_at, lu')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages((data as any) ?? [])

    // Marquer comme lus
    await supabase
      .from('conversation_messages')
      .update({ lu: true })
      .eq('conversation_id', conv.id)
      .neq('sender_id', user!.id)

    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, nonLus: 0 } : c))

    // Subscription realtime
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
    }
    const channelName = `conv-${conv.id}`
    supabase.removeChannel(supabase.channel(channelName))
    subscriptionRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_messages',
        filter: `conversation_id=eq.${conv.id}`
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMsg.trim() || !activeConv) return
    setSending(true)
    const { error } = await supabase.from('conversation_messages').insert({
      conversation_id: activeConv.id,
      sender_id: user!.id,
      contenu: newMsg.trim(),
    })
    if (!error) {
      setNewMsg('')
      setConversations(prev => prev.map(c =>
        c.id === activeConv.id ? { ...c, dernierMessage: newMsg.trim(), dernierAt: new Date().toISOString() } : c
      ))
    }
    setSending(false)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)]">
      {/* Liste conversations */}
      <div className={cn(
        'bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto',
        'w-full lg:w-80',
        activeConv ? 'hidden lg:block' : 'block'
      )}>
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
          <h1 className="font-black text-gray-900 text-lg">Messagerie</h1>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <MessageCircle size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune conversation</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {conversations.map(conv => (
              <button key={conv.id}
                onClick={() => openConversation(conv)}
                className={cn(
                  'w-full text-left p-4 hover:bg-gray-50 transition-colors',
                  activeConv?.id === conv.id && 'bg-primary-50'
                )}>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center">
                      {conv.autre_avatar
                        ? <img src={conv.autre_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        : <User size={18} className="text-primary-500" />
                      }
                    </div>
                    {conv.nonLus > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {conv.nonLus}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn('text-sm truncate', conv.nonLus ? 'font-bold text-gray-900' : 'font-medium text-gray-700')}>
                        {conv.autre_nom}
                      </p>
                      {conv.dernierAt && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                          {formatDate(conv.dernierAt)}
                        </span>
                      )}
                    </div>
                    {conv.bien_titre && (
                      <p className="text-[10px] text-primary-500 font-medium truncate">{conv.bien_titre}</p>
                    )}
                    <p className="text-xs text-gray-400 truncate mt-0.5">{conv.dernierMessage}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zone chat */}
      <div className={cn(
        'flex-1 flex flex-col bg-gray-50',
        activeConv ? 'flex' : 'hidden lg:flex'
      )}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageCircle size={48} className="mb-3 opacity-20" />
            <p>Sélectionnez une conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <button onClick={() => setActiveConv(null)} className="lg:hidden text-gray-400 hover:text-gray-600 mr-1">←</button>
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                {activeConv.autre_avatar
                  ? <img src={activeConv.autre_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  : <User size={16} className="text-primary-500" />
                }
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">{activeConv.autre_nom}</p>
                {activeConv.bien_titre && (
                  <p className="text-xs text-gray-400">{activeConv.bien_titre}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => {
                const mine = msg.sender_id === user!.id
                return (
                  <div key={msg.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                      mine
                        ? 'bg-primary-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                    )}>
                      <p className="leading-relaxed">{msg.contenu}</p>
                      <p className={cn('text-[10px] mt-1', mine ? 'text-white/60' : 'text-gray-400')}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Saisie */}
            <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 p-3 flex gap-2">
              <input
                type="text"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder="Votre message…"
                className="input-field flex-1 text-sm"
              />
              <button type="submit" disabled={!newMsg.trim() || sending}
                className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 transition-colors flex-shrink-0">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
