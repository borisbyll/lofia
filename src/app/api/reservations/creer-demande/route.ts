import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

// CDC v2 §1.2 — Création d'une demande de réservation (mode Sur demande / Niveau 1)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { bien_id, date_arrivee, date_depart, message } = body

    if (!bien_id || !date_arrivee || !date_depart) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Récupérer le bien
    const { data: bien } = await supabaseAdmin
      .from('biens')
      .select('id, titre, owner_id, prix, statut, categorie, type_location')
      .eq('id', bien_id)
      .eq('statut', 'publie')
      .single()

    if (!bien) return NextResponse.json({ error: 'Bien introuvable ou non disponible' }, { status: 404 })
    if (bien.owner_id === session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas réserver votre propre bien' }, { status: 400 })
    }

    // Vérifier qu'une demande active n'existe pas déjà sur ce bien
    const { data: demandeExistante } = await supabaseAdmin
      .from('demandes_reservation')
      .select('id')
      .eq('bien_id', bien_id)
      .eq('locataire_id', session.user.id)
      .in('statut', ['en_attente', 'confirmee'])
      .maybeSingle()

    if (demandeExistante) {
      return NextResponse.json({
        error: 'Vous avez déjà une demande en cours pour ce bien',
        demande_id: demandeExistante.id,
      }, { status: 409 })
    }

    // Vérifier disponibilité des dates
    const { data: conflit } = await supabaseAdmin
      .from('disponibilites')
      .select('id')
      .eq('bien_id', bien_id)
      .or(`and(date_debut.lte.${date_arrivee},date_fin.gte.${date_arrivee}),and(date_debut.lte.${date_depart},date_fin.gte.${date_depart})`)
      .maybeSingle()

    if (conflit) {
      return NextResponse.json({ error: 'Ces dates viennent d\'être réservées. Veuillez choisir d\'autres dates.' }, { status: 409 })
    }

    const d1 = new Date(date_arrivee)
    const d2 = new Date(date_depart)
    const nb_nuits = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
    const montant_total = (bien.prix ?? 0) * nb_nuits

    // Générer tokens uniques
    const token_confirmation = randomBytes(32).toString('hex')
    const token_refus = randomBytes(32).toString('hex')
    const expire_at = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

    const { data: demande, error: demandeError } = await supabaseAdmin
      .from('demandes_reservation')
      .insert({
        bien_id,
        locataire_id: session.user.id,
        proprietaire_id: bien.owner_id,
        date_arrivee,
        date_depart,
        nb_nuits,
        montant_total,
        token_confirmation,
        token_refus,
        expire_at,
        message_locataire: message?.trim() || null,
        statut: 'en_attente',
      })
      .select()
      .single()

    if (demandeError) throw demandeError

    // Notification in-app au propriétaire
    await supabaseAdmin.from('notifications').insert({
      user_id: bien.owner_id,
      type: 'demande_reservation',
      titre: 'Nouvelle demande de réservation',
      corps: `${session.user.email} souhaite réserver "${bien.titre}" du ${date_arrivee} au ${date_depart} (${nb_nuits} nuit${nb_nuits > 1 ? 's' : ''}).`,
      lien: `/mon-espace/reservations`,
    })

    // Notification in-app au locataire
    await supabaseAdmin.from('notifications').insert({
      user_id: session.user.id,
      type: 'demande_envoyee',
      titre: 'Demande envoyée',
      corps: `Votre demande pour "${bien.titre}" a été envoyée. Le propriétaire a jusqu'à ${new Date(expire_at).toLocaleString('fr-FR')} pour répondre.`,
      lien: `/reservations/demandes/${demande.id}`,
    })

    return NextResponse.json({ success: true, demande_id: demande.id })
  } catch (err) {
    console.error('[creer-demande]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
