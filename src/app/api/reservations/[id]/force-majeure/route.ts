import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const TYPE_CATEGORIE: Record<string, 'A' | 'B' | 'C'> = {
  deces_famille: 'A',
  hospitalisation: 'A',
  decision_administrative: 'A',
  accident: 'B',
  catastrophe_naturelle: 'B',
  urgence_medicale: 'B',
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { type_evenement, description, justificatif_url } = body

    if (!type_evenement || !TYPE_CATEGORIE[type_evenement]) {
      return NextResponse.json({ error: 'Type d\'événement invalide' }, { status: 400 })
    }

    const { data: resa } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!resa) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    if (resa.locataire_id !== session.user.id)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const annulables = ['en_attente', 'confirmee', 'en_cours']
    if (!annulables.includes(resa.statut))
      return NextResponse.json({ error: 'Cette réservation ne peut pas faire l\'objet d\'une force majeure' }, { status: 400 })

    // Vérifier qu'aucune demande FM n'est déjà en cours
    const { data: existante } = await supabaseAdmin
      .from('demandes_force_majeure')
      .select('id')
      .eq('reservation_id', params.id)
      .in('statut', ['en_attente', 'en_recours'])
      .single()

    if (existante) {
      return NextResponse.json({ error: 'Une demande de force majeure est déjà en cours pour cette réservation' }, { status: 409 })
    }

    const categorie = TYPE_CATEGORIE[type_evenement]

    const { data: demande } = await supabaseAdmin
      .from('demandes_force_majeure')
      .insert({
        reservation_id: params.id,
        locataire_id: session.user.id,
        type_evenement,
        categorie,
        description: description ?? null,
        justificatif_url: justificatif_url ?? null,
        statut: 'en_attente',
      })
      .select('id')
      .single()

    // Suspendre la réservation le temps du traitement
    await supabaseAdmin
      .from('reservations')
      .update({ statut: 'force_majeure_en_cours' })
      .eq('id', params.id)

    // Notifier les modérateurs
    const { data: mods } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'moderateur')

    if (mods && mods.length > 0) {
      await supabaseAdmin.from('notifications').insert(
        mods.map(mod => ({
          user_id: mod.id,
          type: 'force_majeure_nouvelle',
          titre: 'Demande de force majeure',
          corps: `Nouvelle demande de force majeure (catégorie ${categorie}) à traiter sous 4h.`,
          lien: '/moderateur/force-majeure',
        }))
      )
    }

    // Notifier le locataire
    await supabaseAdmin.from('notifications').insert({
      user_id: session.user.id,
      type: 'force_majeure_soumise',
      titre: 'Demande reçue',
      corps: 'Votre demande d\'annulation exceptionnelle a bien été reçue. Notre équipe l\'examine sous 4h.',
      lien: '/mon-espace/reservations',
    })

    return NextResponse.json({ success: true, demande_id: demande?.id })
  } catch (err) {
    console.error('[force-majeure]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
