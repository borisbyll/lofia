import Link from 'next/link'
import { Building2, CalendarDays, Clock, ArrowRight } from 'lucide-react'

const categories = [
  {
    href: '/vente',
    icon: Building2,
    title: 'Acheter',
    desc: 'Terrains, maisons, villas, immeubles — annonces vérifiées par notre équipe avant publication.',
    badge: 'Modération incluse',
    topColor: '#8B1A2E',
    iconBg: '#FAE8EC',
    iconColor: '#8B1A2E',
    badgeBg: '#FAE8EC',
    badgeColor: '#8B1A2E',
    ctaColor: '#8B1A2E',
    cta: 'Voir les biens à vendre',
  },
  {
    href: '/location?type=longue_duree',
    icon: CalendarDays,
    title: 'Louer',
    desc: 'Appartements, maisons, bureaux, boutiques — longue durée avec mise en relation directe.',
    badge: 'Longue durée',
    topColor: '#2D6A4F',
    iconBg: '#ECFDF5',
    iconColor: '#2D6A4F',
    badgeBg: '#ECFDF5',
    badgeColor: '#2D6A4F',
    ctaColor: '#2D6A4F',
    cta: 'Voir les locations',
  },
  {
    href: '/location?type=courte_duree',
    icon: Clock,
    title: 'Séjour court',
    desc: 'Logements meublés pour vos voyages et séjours — paiement sécurisé via Flooz & T-Money.',
    badge: 'Courte durée',
    topColor: '#D4A832',
    iconBg: '#FDF8E8',
    iconColor: '#B08A28',
    badgeBg: '#FDF8E8',
    badgeColor: '#B08A28',
    ctaColor: '#B08A28',
    cta: 'Réserver un séjour',
  },
]

export default function CategoriesSection() {
  return (
    <section className="section" style={{ background: '#F5E6C033' }}>
      <div className="wrap">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="section-title">Que recherchez-vous ?</h2>
          <p className="section-subtitle">
            Achat, location longue durée ou séjour — nous avons ce qu&apos;il vous faut.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {categories.map(({ href, icon: Icon, title, desc, badge, topColor, iconBg, iconColor, badgeBg, badgeColor, ctaColor, cta }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-primary-50 shadow-sm hover:shadow-[0_12px_40px_rgba(139,26,46,.12)] transition-all duration-300 hover:-translate-y-1"
            >
              {/* Barre colorée haute */}
              <div className="h-1.5 w-full" style={{ background: topColor }} />

              {/* Layout mobile : horizontal condensé */}
              <div className="flex sm:flex-col flex-row items-center sm:items-start gap-4 p-4 sm:p-7 flex-1">

                {/* Icône */}
                <div
                  className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
                  style={{ background: iconBg, minWidth: 48, minHeight: 48 }}
                >
                  <Icon size={22} style={{ color: iconColor }} />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0 flex flex-col sm:gap-3 gap-1">
                  {/* Badge — caché sur mobile dans le layout horizontal */}
                  <div className="hidden sm:flex items-center justify-between">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: badgeBg, color: badgeColor }}
                    >
                      {badge}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-xl font-black" style={{ color: '#1a0a00' }}>{title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed hidden sm:block" style={{ color: '#7a5c3a' }}>{desc}</p>
                  <p className="text-xs leading-relaxed sm:hidden line-clamp-2" style={{ color: '#7a5c3a' }}>{desc}</p>

                  {/* CTA */}
                  <div
                    className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold sm:pt-4 sm:border-t sm:border-primary-50 transition-all mt-1 sm:mt-0"
                    style={{ color: ctaColor }}
                  >
                    <span className="hidden sm:inline">{cta}</span>
                    <span className="sm:hidden">En savoir plus</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1.5 transition-transform shrink-0" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
