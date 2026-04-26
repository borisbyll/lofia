import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, CheckCircle2, XCircle, AlertTriangle, MapPin, Phone, User, Calendar, Clock } from 'lucide-react'
import { formatPrix, formatDate } from '@/lib/utils'

export default async function ReservationDetailDashboardPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/connexion')

  const { data: resa } = await supabase
    .from('reservations')
    .select(`
      id, statut, date_debut, date_fin, nb_nuits, prix_total, commission,
      montant_proprio, prix_nuit, paiement_effectue, paiement_at, check_in_at,
      liberation_fonds_at, proprio_paye, proprio_paye_at,
      locataire_id, proprietaire_id,
      biens (
        id, titre, slug, adresse, ville, commune, quartier,
        latitude, longitude, photos, photo_principale
      ),
      profiles!reservations_proprietaire_id_fkey (id, nom, phone, avatar_url)
    `)
    .eq('id', params.id)
    .single()

  if (!resa) redirect('/mon-espace/reservations')

  const userId = session.user.id
  const isLocataire  = resa.locataire_id  === userId
  const isProprietaire = resa.proprietaire_id === userId
  if (!isLocataire && !isProprietaire) redirect('/mon-espace/reservations')

  const bien   = resa.biens  as any
  const proprio = resa.profiles as any
  const ref    = `LOFIA-RES-${resa.id.slice(0, 8).toUpperCase()}`

  const adresseComplete = [bien?.adresse, bien?.quartier, bien?.commune, bien?.ville]
    .filter(Boolean).join(', ')

  const mapsUrl = bien?.latitude && bien?.longitude
    ? `https://www.google.com/maps?q=${bien.latitude},${bien.longitude}`
    : null

  const STATUT_CONFIG: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    confirmee: { icon: <CheckCircle2 size={18} className="text-green-600" />, label: 'Confirmée', className: 'badge-success' },
    en_cours:  { icon: <CheckCircle2 size={18} className="text-blue-600" />,  label: 'En cours',  className: 'badge-primary' },
    termine:   { icon: <CheckCircle2 size={18} className="text-gray-500" />,  label: 'Terminée',  className: 'badge-gray' },
    terminee:  { icon: <CheckCircle2 size={18} className="text-gray-500" />,  label: 'Terminée',  className: 'badge-gray' },
    annulee:   { icon: <XCircle size={18} className="text-red-500" />,        label: 'Annulée',   className: 'badge-danger' },
    no_show:   { icon: <AlertTriangle size={18} className="text-red-500" />,  label: 'No-show',   className: 'badge-danger' },
  }
  const sc = STATUT_CONFIG[resa.statut] ?? { icon: null, label: resa.statut, className: 'badge-gray' }

  return (
    <div className="p-4 lg:p-8 max-w-xl mx-auto pb-24 lg:pb-8 space-y-5">
      {/* Retour */}
      <Link href="/mon-espace/reservations" className="inline-flex items-center gap-1.5 text-sm text-brun-doux hover:text-primary-500">
        <ChevronLeft size={15} /> Mes réservations
      </Link>

      {/* Photo + titre */}
      {bien && (
        <div className="dashboard-card p-0 overflow-hidden">
          {bien.photo_principale && (
            <div className="relative w-full h-44">
              <Image src={bien.photo_principale} alt={bien.titre} fill className="object-cover" />
            </div>
          )}
          <div className="p-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-black text-brun-nuit text-lg leading-tight">{bien.titre}</h1>
              <p className="text-sm text-brun-doux mt-0.5">{bien.ville}</p>
            </div>
            <span className={`${sc.className} flex items-center gap-1 shrink-0 text-xs`}>
              {sc.icon} {sc.label}
            </span>
          </div>
        </div>
      )}

      {/* Référence */}
      <p className="text-xs text-center font-mono text-brun-doux">Réf : {ref}</p>

      {/* Dates et montant */}
      <div className="dashboard-card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={15} className="text-primary-500" />
          <span className="font-semibold text-brun-nuit text-sm">Période</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-brun-doux mb-0.5">Arrivée</p>
            <p className="font-semibold text-brun-nuit">{formatDate(resa.date_debut)}</p>
          </div>
          <div>
            <p className="text-xs text-brun-doux mb-0.5">Départ</p>
            <p className="font-semibold text-brun-nuit">{formatDate(resa.date_fin)}</p>
          </div>
        </div>
        <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
          <span className="text-brun-doux">{resa.nb_nuits} nuit{resa.nb_nuits > 1 ? 's' : ''} × {formatPrix(resa.prix_nuit)}</span>
          <span className="font-black text-primary-500">{formatPrix(resa.prix_total)}</span>
        </div>
      </div>

      {/* Paiement */}
      <div className="dashboard-card space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={15} className="text-primary-500" />
          <span className="font-semibold text-brun-nuit text-sm">Paiement & séquestre</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-brun-doux">Statut</span>
          <span className={`font-semibold ${resa.paiement_effectue ? 'text-green-600' : 'text-amber-600'}`}>
            {resa.paiement_effectue ? '✅ Payé' : '⏳ En attente'}
          </span>
        </div>
        {isProprietaire && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-brun-doux">Votre part</span>
              <span className="font-semibold text-brun-nuit">{formatPrix(resa.montant_proprio ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brun-doux">Virement</span>
              <span className={`font-semibold ${resa.proprio_paye ? 'text-green-600' : 'text-brun-doux'}`}>
                {resa.proprio_paye ? `✅ Versé le ${new Date(resa.proprio_paye_at!).toLocaleDateString('fr-FR')}` : 'En attente de fin de séjour'}
              </span>
            </div>
          </>
        )}
        {resa.liberation_fonds_at && (
          <p className="text-xs text-brun-doux">
            Fonds libérés le {new Date(resa.liberation_fonds_at).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>

      {/* Adresse (locataire uniquement, après paiement) */}
      {isLocataire && resa.paiement_effectue && bien && (
        <div className="dashboard-card space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={15} className="text-primary-500" />
            <span className="font-semibold text-brun-nuit text-sm">Adresse</span>
          </div>
          <p className="text-sm text-brun-nuit">{adresseComplete || bien.ville}</p>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary-500 font-semibold hover:text-primary-600">
              🗺️ Voir l&apos;itinéraire
            </a>
          )}
        </div>
      )}

      {/* Contact (locataire → proprio, et proprio → locataire via conversations) */}
      {isLocataire && resa.paiement_effectue && proprio && (
        <div className="dashboard-card space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <User size={15} className="text-primary-500" />
            <span className="font-semibold text-brun-nuit text-sm">Contact propriétaire</span>
          </div>
          <div className="flex items-center gap-3">
            {proprio.avatar_url ? (
              <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0">
                <Image src={proprio.avatar_url} alt={proprio.nom ?? ''} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary-600 text-sm">{proprio.nom?.[0] ?? '?'}</span>
              </div>
            )}
            <div>
              <p className="font-semibold text-brun-nuit text-sm">{proprio.nom}</p>
              {proprio.phone && (
                <a href={`tel:${proprio.phone}`} className="flex items-center gap-1 text-xs text-primary-500 font-semibold">
                  <Phone size={11} /> {proprio.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2.5">
        {bien && (
          <Link href={`/biens/${bien.slug}`} className="btn btn-outline w-full justify-center text-sm">
            Voir la fiche du bien
          </Link>
        )}

        {isLocataire && ['confirmee', 'en_cours'].includes(resa.statut) && (
          <Link
            href={`/mon-espace/reservations/${resa.id}/signaler-probleme`}
            className="btn btn-ghost w-full justify-center text-sm text-amber-700 border-amber-200 hover:bg-amber-50"
          >
            <AlertTriangle size={14} /> Signaler un problème
          </Link>
        )}

        {isLocataire && resa.statut === 'confirmee' && (
          <Link
            href={`/mon-espace/reservations/${resa.id}/annuler`}
            className="btn btn-ghost w-full justify-center text-sm"
          >
            Annuler ma réservation
          </Link>
        )}
      </div>
    </div>
  )
}
