import { supabaseAdmin } from '@/lib/supabase/admin'
import { envoyerWhatsApp } from './whatsapp'

export type NotifType = 'info' | 'succes' | 'action_requise' | 'alerte'
export type NotifModule = 'courte_duree' | 'longue_duree' | 'vente' | 'sponsoring' | 'moderation'

interface NotifierParams {
  destinataire_id:      string
  titre:                string
  message:              string
  lien?:                string
  type?:                NotifType
  module?:              NotifModule
  dossier_id?:          string
  whatsapp_telephone?:  string
}

export async function notifier(params: NotifierParams): Promise<void> {
  const {
    destinataire_id, titre, message, lien,
    type = 'info', module: mod, dossier_id,
    whatsapp_telephone,
  } = params

  // 1. Notification in-app (toujours)
  await supabaseAdmin.from('notifications').insert({
    user_id:  destinataire_id,
    type,
    titre,
    corps:    message,
    lien:     lien ?? null,
    module:   mod ?? null,
    dossier_id: dossier_id ?? null,
  })

  // 2. WhatsApp si numéro disponible
  if (whatsapp_telephone) {
    await envoyerWhatsApp({
      telephone: whatsapp_telephone,
      message:   `${titre}\n\n${message}`,
    }).catch(() => { /* non bloquant */ })
  }
}

// Notification à plusieurs destinataires en parallèle
export async function notifierPlusieurs(
  destinataires: Array<{ id: string; telephone?: string }>,
  params: Omit<NotifierParams, 'destinataire_id' | 'whatsapp_telephone'>
): Promise<void> {
  await Promise.all(
    destinataires.map(d =>
      notifier({ ...params, destinataire_id: d.id, whatsapp_telephone: d.telephone })
    )
  )
}
