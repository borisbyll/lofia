import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { mer_id, date_visite } = await request.json()
    if (!mer_id) return NextResponse.json({ error: 'mer_id manquant' }, { status: 400 })

    const { data: mer } = await supabaseAdmin
      .from('mises_en_relation')
      .select('*')
      .eq('id', mer_id)
      .single()

    if (!mer) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    const isProprietaire = mer.proprietaire_id === user.id
    const isLocataire    = mer.locataire_id === user.id
    if (!isProprietaire && !isLocataire) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const field = isProprietaire
      ? { visite_confirmee_proprietaire: true }
      : { visite_confirmee_locataire: true }

    const extra = date_visite ? { date_visite_proposee: date_visite } : {}

    const { data: updated } = await supabaseAdmin
      .from('mises_en_relation')
      .update({ ...field, ...extra, updated_at: new Date().toISOString() })
      .eq('id', mer_id)
      .select()
      .single()

    if (!updated) return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 })

    if (updated.visite_confirmee_locataire && updated.visite_confirmee_proprietaire) {
      await supabaseAdmin
        .from('mises_en_relation')
        .update({ statut: 'visite_confirmee', updated_at: new Date().toISOString() })
        .eq('id', mer_id)

      await supabaseAdmin.from('notifications').insert([
        { user_id: mer.locataire_id,    type: 'visite_confirmee', titre: 'Visite confirmée !', corps: 'Les deux parties ont confirmé la visite. Le propriétaire va préparer le contrat.', lien: `/mon-espace/mises-en-relation/${mer_id}` },
        { user_id: mer.proprietaire_id, type: 'visite_confirmee', titre: 'Visite confirmée !', corps: 'Les deux parties ont confirmé. Vous pouvez maintenant générer le contrat.', lien: `/mon-espace/mises-en-relation/${mer_id}` },
      ])
    } else {
      const autreId = isProprietaire ? mer.locataire_id : mer.proprietaire_id
      await supabaseAdmin.from('notifications').insert({
        user_id: autreId,
        type: 'visite_confirmee_partielle',
        titre: isProprietaire ? 'Le propriétaire a confirmé la visite' : 'Le locataire a confirmé la visite',
        corps: date_visite
          ? `Une date de visite a été proposée : ${new Date(date_visite).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} à ${new Date(date_visite).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Confirmez depuis votre espace.`
          : 'Connectez-vous pour confirmer la visite de votre côté.',
        lien: `/mon-espace/mises-en-relation/${mer_id}`,
      })
    }

    return NextResponse.json({ success: true, statut: updated.statut })
  } catch (err) {
    console.error('[longue-duree/confirmer-direct]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
