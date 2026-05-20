import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatPrix } from '@/lib/utils'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return session
}

// POST /api/admin/fonds/[id]  body: { action: 'bloquer' | 'debloquer' | 'liberer', raison?: string }
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { action, raison } = await request.json()

  const { data: resa } = await supabaseAdmin
    .from('reservations')
    .select('id, proprietaire_id, locataire_id, montant_proprio, proprio_paye, liberation_bloquee')
    .eq('id', params.id)
    .single()

  if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

  if (action === 'bloquer') {
    await supabaseAdmin.from('reservations').update({
      liberation_bloquee: true,
      liberation_bloquee_raison: raison ?? 'Bloqué par un administrateur',
      updated_at: new Date().toISOString(),
    }).eq('id', params.id)

    // Notifier le propriétaire
    await supabaseAdmin.from('notifications').insert({
      user_id: resa.proprietaire_id,
      type: 'fonds_bloques',
      titre: '⚠️ Libération de fonds suspendue',
      corps: `La libération automatique de vos fonds (${formatPrix(resa.montant_proprio)}) a été suspendue par l'administration. Raison : ${raison ?? 'Vérification en cours'}. Contactez-nous si vous avez des questions.`,
      lien: `/mon-espace/reservations/${params.id}`,
    })

    return NextResponse.json({ success: true, action: 'bloquer' })
  }

  if (action === 'debloquer') {
    await supabaseAdmin.from('reservations').update({
      liberation_bloquee: false,
      liberation_bloquee_raison: null,
      updated_at: new Date().toISOString(),
    }).eq('id', params.id)

    // Notifier le propriétaire
    await supabaseAdmin.from('notifications').insert({
      user_id: resa.proprietaire_id,
      type: 'fonds_debloques',
      titre: '✅ Libération de fonds rétablie',
      corps: `La suspension sur vos fonds (${formatPrix(resa.montant_proprio)}) a été levée. La libération automatique reprendra selon le calendrier prévu.`,
      lien: `/mon-espace/reservations/${params.id}`,
    })

    return NextResponse.json({ success: true, action: 'debloquer' })
  }

  if (action === 'liberer') {
    if (resa.proprio_paye) {
      return NextResponse.json({ error: 'Fonds déjà libérés' }, { status: 400 })
    }

    await supabaseAdmin.from('reservations').update({
      proprio_paye: true,
      proprio_paye_at: new Date().toISOString(),
      liberation_bloquee: false,
      liberation_bloquee_raison: null,
      statut: 'termine',
      updated_at: new Date().toISOString(),
    }).eq('id', params.id)

    await supabaseAdmin.from('notifications').insert([
      {
        user_id: resa.proprietaire_id,
        type: 'fonds_liberes',
        titre: '💰 Vos fonds ont été libérés !',
        corps: `Votre revenu de ${formatPrix(resa.montant_proprio)} a été libéré manuellement par l'administration et vous sera transféré selon vos coordonnées bancaires.`,
        lien: `/mon-espace/reservations/${params.id}`,
      },
      {
        user_id: resa.locataire_id,
        type: 'sejour_termine',
        titre: '🏁 Séjour terminé',
        corps: `Votre séjour est terminé. Merci d'avoir utilisé LOFIA. N'oubliez pas de laisser un avis !`,
        lien: `/mon-espace/reservations/${params.id}`,
      },
    ])

    return NextResponse.json({ success: true, action: 'liberer' })
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}
