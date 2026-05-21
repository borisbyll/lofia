import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Link from 'next/link'
import {
  ChevronLeft, CheckCircle2, Clock, XCircle, Home,
  MapPin, Phone, User, Calendar, Lock, Unlock, AlertTriangle, LogOut,
} from 'lucide-react'
import { formatPrix, formatDate } from '@/lib/utils'
import { BRAND } from '@/lib/brand'
import CheckoutButton from './CheckoutButton'

function fmtHeure(h: string) {
  return h.substring(0, 5).replace(':', 'h')
}

function fmtDateHeure(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}

export default async function ReservationDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/connexion?next=/mon-espace/reservations/${params.id}`)

  /* Fetch complet avec supabaseAdmin pour avoir locataire + proprietaire */
  const { data: resa } = await supabaseAdmin
    .from('reservations')
    .select(`
      id, statut, date_debut, date_fin, nb_nuits,
      prix_total, commission, montant_proprio, prix_nuit,
      paiement_effectue, paiement_at,
      check_in_at, liberation_fonds_at, heure_arrivee_prevue,
      arrivee_confirmee, proprio_paye, proprio_paye_at,
      checkout_confirme, checkout_confirme_at,
      locataire_id, proprietaire_id,
      bien:biens!bien_id(id, titre, slug, ville, adresse, latitude, longitude, photos, photo_principale),
      locataire:profiles!locataire_id(nom, phone, avatar_url),
      proprietaire:profiles!proprietaire_id(nom, phone, avatar_url)
    `)
    .eq('id', params.id)
    .single()

  if (!resa) redirect('/mon-espace/reservations')

  const uid = session.user.id
  const isProprietaire = resa.proprietaire_id === uid
  const isLocataire    = resa.locataire_id    === uid
  if (!isProprietaire && !isLocataire) redirect('/mon-espace/reservations')

  const bien        = resa.bien        as any
  const locataire   = resa.locataire   as any
  const proprietaire = resa.proprietaire as any
  const ref         = `LOFIA-${resa.id.slice(0, 8).toUpperCase()}`

  const liberationAt = resa.liberation_fonds_at ? new Date(resa.liberation_fonds_at) : null
  const fondsLiberes      = resa.proprio_paye === true
  const checkInFait       = resa.arrivee_confirmee === true
  const checkoutFait      = (resa as any).checkout_confirme === true
  const checkoutPossible  = isProprietaire && resa.statut === 'en_sejour' && !checkoutFait
    && new Date(resa.date_fin) <= new Date()

  const photo = bien?.photo_principale ?? bien?.photos?.[0] ?? null
  const mapsUrl = bien?.latitude && bien?.longitude
    ? `https://maps.google.com/?q=${bien.latitude},${bien.longitude}`
    : null

  /* Timeline statuts */
  type Step = { label: string; done: boolean; date?: string; sub?: string }
  const timeline: Step[] = [
    {
      label:  'Paiement reçu',
      done:   !!resa.paiement_effectue,
      date:   resa.paiement_at ? fmtDateHeure(resa.paiement_at) : undefined,
    },
    {
      label:  'Check-in confirmé',
      done:   checkInFait,
      date:   resa.check_in_at ? fmtDateHeure(resa.check_in_at) : undefined,
      sub:    !checkInFait ? 'En attente de l\'arrivée du locataire' : undefined,
    },
    {
      label:  checkoutFait ? 'Check-out validé par vous' : 'Check-out à valider',
      done:   checkoutFait,
      date:   (resa as any).checkout_confirme_at
        ? fmtDateHeure((resa as any).checkout_confirme_at)
        : liberationAt
        ? `Libération auto le ${fmtDateHeure(liberationAt.toISOString())} si non validé`
        : undefined,
      sub:    !checkoutFait && checkInFait ? 'Validez le départ du locataire le jour J' : undefined,
    },
    {
      label:  'Fonds libérés',
      done:   fondsLiberes,
      date:   resa.proprio_paye_at ? fmtDateHeure(resa.proprio_paye_at) : undefined,
    },
  ]

  return (
    <div className="p-4 lg:p-8 max-w-xl mx-auto pb-24 lg:pb-8 space-y-4">

      {/* Retour */}
      <Link href="/mon-espace/reservations"
        className="inline-flex items-center gap-1.5 text-sm text-brun-doux hover:text-primary-500 transition-colors">
        <ChevronLeft size={15} /> Retour aux réservations
      </Link>

      {/* Photo + titre bien */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {photo && (
          <div className="relative h-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={bien?.titre ?? ''} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute bottom-3 left-4 text-white text-xs font-semibold bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
              Réf : {ref}
            </span>
          </div>
        )}
        <div className="p-4">
          <h1 className="font-black text-brun-nuit text-lg">{bien?.titre ?? '—'}</h1>
          <p className="text-sm text-brun-doux mt-0.5 flex items-center gap-1">
            <MapPin size={11} /> {bien?.ville}
          </p>
        </div>
      </div>

      {/* ── ROLE : PROPRIÉTAIRE ─────────────────────────────────── */}
      {isProprietaire && (
        <>
          {/* Bannière fonds libérés */}
          {fondsLiberes && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Unlock size={20} />
                </div>
                <div>
                  <p className="font-black">Fonds libérés !</p>
                  <p className="text-sm text-green-100">
                    {formatPrix(resa.montant_proprio ?? 0)} vous ont été transférés
                    {resa.proprio_paye_at && ` le ${new Date(resa.proprio_paye_at).toLocaleDateString('fr-FR')}`}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Votre locataire */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <User size={16} className="text-primary-500" />
              </div>
              <p className="font-bold text-brun-nuit">Votre locataire</p>
            </div>
            <div className="flex items-center gap-3 pl-1">
              <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 font-black">
                {locataire?.nom?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-brun-nuit">{locataire?.nom ?? '—'}</p>
                {locataire?.phone ? (
                  <a href={`tel:${locataire.phone}`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 mt-0.5">
                    <Phone size={13} /> {locataire.phone}
                  </a>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Téléphone non renseigné</p>
                )}
              </div>
            </div>
          </div>

          {/* Heure d'arrivée */}
          {resa.heure_arrivee_prevue && (
            <div className="bg-primary-50 border-2 border-primary-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Clock size={16} className="text-primary-500" />
                </div>
                <p className="font-bold text-brun-nuit">Heure d&apos;arrivée prévue</p>
              </div>
              <p className="text-3xl font-black text-primary-500 pl-11">
                {fmtHeure(resa.heure_arrivee_prevue)}
              </p>
              <p className="text-sm text-primary-700 pl-11 mt-1">
                Soyez présent sur les lieux pour accueillir votre locataire et lui remettre les clés.
              </p>
            </div>
          )}

          {!resa.heure_arrivee_prevue && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Heure d&apos;arrivée non encore précisée</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Le locataire n&apos;a pas encore indiqué son heure d&apos;arrivée. Vous recevrez une notification dès que ce sera fait.
                </p>
              </div>
            </div>
          )}

          {/* Bouton checkout */}
          {checkoutPossible && (
            <CheckoutButton
              resaId={resa.id}
              bienId={(bien as any)?.id ?? ''}
              locataireId={resa.locataire_id}
              locataireNom={locataire?.nom ?? 'le locataire'}
            />
          )}

          {/* Checkout déjà validé — bannière */}
          {checkoutFait && !fondsLiberes && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Check-out validé</p>
                <p className="text-xs text-emerald-600 mt-0.5">Les fonds sont en cours de transfert vers votre compte.</p>
              </div>
            </div>
          )}

          {/* Rappel checkout à venir */}
          {!checkoutFait && checkInFait && !checkoutPossible && resa.statut === 'en_sejour' && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
              <LogOut size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Check-out prévu le {formatDate(resa.date_fin)}</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Le bouton de validation apparaîtra ce jour-là. Vous recevrez aussi une notification.
                </p>
              </div>
            </div>
          )}

          {/* Dates + Finances */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Calendar size={16} className="text-amber-500" />
              </div>
              <p className="font-bold text-brun-nuit">Séjour &amp; Finances</p>
            </div>
            <div className="pl-11 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-brun-doux">Période</span>
                <span className="font-semibold text-brun-nuit">
                  {formatDate(resa.date_debut)} → {formatDate(resa.date_fin)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brun-doux">Durée</span>
                <span className="font-semibold text-brun-nuit">
                  {resa.nb_nuits} nuit{resa.nb_nuits > 1 ? 's' : ''}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="text-brun-doux">Total payé par le locataire</span>
                <span className="font-semibold text-brun-nuit">{formatPrix(resa.prix_total ?? 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Commission LOFIA. (9%)</span>
                <span className="text-gray-400">- {formatPrix(resa.commission ?? 0)}</span>
              </div>
              <div className="flex justify-between font-black text-base border-t border-gray-100 pt-2">
                <span className="text-brun-nuit">Votre revenu</span>
                <span className="text-green-600">{formatPrix(resa.montant_proprio ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Timeline séquestre */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Lock size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-brun-nuit">Séquestre &amp; libération des fonds</p>
                <p className="text-xs text-brun-doux">Fonds libérés après votre validation du check-out</p>
              </div>
            </div>
            <ol className="space-y-0">
              {timeline.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {step.done
                        ? <CheckCircle2 size={14} className="text-green-600" />
                        : <Clock size={12} className="text-gray-400" />
                      }
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 ${step.done ? 'bg-green-200' : 'bg-gray-100'}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm font-semibold ${step.done ? 'text-green-700' : 'text-brun-doux'}`}>
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{step.date}</p>
                    )}
                    {step.sub && (
                      <p className="text-xs text-amber-600 mt-0.5">{step.sub}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {/* ── ROLE : LOCATAIRE ────────────────────────────────────── */}
      {isLocataire && (
        <>
          {/* Propriétaire contact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <Home size={16} className="text-primary-500" />
              </div>
              <p className="font-bold text-brun-nuit">Votre hôte</p>
            </div>
            <div className="flex items-center gap-3 pl-1">
              <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 font-black">
                {proprietaire?.nom?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-brun-nuit">{proprietaire?.nom ?? '—'}</p>
                {proprietaire?.phone && (
                  <a href={`tel:${proprietaire.phone}`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 mt-0.5">
                    <Phone size={13} /> {proprietaire.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Heure d'arrivée */}
          {resa.heure_arrivee_prevue && (
            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-primary-600 mb-1">Votre heure d&apos;arrivée confirmée</p>
              <p className="text-2xl font-black text-primary-500">{fmtHeure(resa.heure_arrivee_prevue)}</p>
              <p className="text-xs text-primary-700 mt-1">Le propriétaire vous attendra sur les lieux.</p>
            </div>
          )}

          {/* Localisation */}
          {resa.paiement_effectue && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <MapPin size={16} className="text-emerald-600" />
                </div>
                <p className="font-bold text-brun-nuit">Localisation du bien</p>
              </div>
              <div className="pl-11 space-y-2">
                {bien?.adresse && (
                  <p className="text-sm text-brun-doux">{bien.adresse}, {bien.ville}</p>
                )}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-colors">
                    <MapPin size={13} /> Ouvrir dans Google Maps
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Calendar size={16} className="text-amber-500" />
              </div>
              <p className="font-bold text-brun-nuit">Période de séjour</p>
            </div>
            <div className="pl-11 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-brun-doux">Arrivée</span>
                <span className="font-semibold text-brun-nuit">{formatDate(resa.date_debut)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brun-doux">Départ</span>
                <span className="font-semibold text-brun-nuit">{formatDate(resa.date_fin)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-100 pt-2">
                <span className="text-brun-nuit">{resa.nb_nuits} nuit{resa.nb_nuits > 1 ? 's' : ''}</span>
                <span className="text-primary-500">{formatPrix(resa.prix_total ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Info séquestre pour locataire */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-start gap-3">
            <Lock size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Votre paiement est sécurisé en séquestre. Les fonds sont transmis à l&apos;hôte uniquement après la validation du check-out par le propriétaire le jour de votre départ.
            </p>
          </div>
        </>
      )}

      {/* Service client commun */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
          <Phone size={14} className="text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-brun-nuit">Besoin d&apos;aide ? Service client {BRAND.name}</p>
          <a href={`https://wa.me/${BRAND.whatsapp.replace('+', '')}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-green-700 font-semibold hover:underline">
            {BRAND.whatsapp} — WhatsApp
          </a>
        </div>
      </div>

      {/* Actions locataire */}
      {isLocataire && (
        <div className="space-y-2">
          {['confirmee', 'en_sejour', 'confirme'].includes(resa.statut) && (
            <Link href={`/mon-espace/reservations/${resa.id}/signaler-probleme`}
              className="btn btn-outline w-full justify-center text-sm text-amber-700 border-amber-300 hover:bg-amber-50">
              <AlertTriangle size={14} /> Signaler un problème
            </Link>
          )}
          {['confirmee', 'confirme'].includes(resa.statut) && !checkInFait && (
            <Link href={`/mon-espace/reservations/${resa.id}/annuler`}
              className="btn btn-ghost w-full justify-center text-sm text-gray-500">
              Annuler ma réservation
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
