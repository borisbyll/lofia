import { ShieldCheck, CreditCard, MessageSquare, Star } from 'lucide-react'

const items = [
  {
    icon: ShieldCheck,
    title: 'Annonces vérifiées',
    desc: 'Chaque bien de vente est contrôlé par notre équipe de modérateurs avant publication.',
    iconColor: '#8B1A2E',
    bg: '#FAE8EC',
  },
  {
    icon: CreditCard,
    title: 'Paiement sécurisé',
    desc: 'Transactions via FedaPay (Flooz, T-Money, Wave, CB). Vos fonds sont protégés par séquestre.',
    iconColor: '#2D6A4F',
    bg: '#ECFDF5',
  },
  {
    icon: MessageSquare,
    title: 'Messagerie intégrée',
    desc: 'Communiquez directement avec les propriétaires en temps réel, sans divulguer vos coordonnées.',
    iconColor: '#D4A832',
    bg: '#FDF8E8',
  },
  {
    icon: Star,
    title: 'Avis authentiques',
    desc: 'Chaque avis est lié à une réservation confirmée, garantissant des évaluations fiables.',
    iconColor: '#6B0F1E',
    bg: '#FAE8EC',
  },
]

export default function TrustSection() {
  return (
    <section className="section" style={{ background: '#F5E6C033' }}>
      <div className="wrap">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="section-title">Pourquoi nous faire confiance ?</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            Votre sécurité et votre satisfaction sont notre priorité absolue.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map(({ icon: Icon, title, desc, iconColor, bg }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-4 sm:p-6 border border-primary-50 shadow-sm hover:shadow-[0_8px_32px_rgba(139,26,46,.08)] transition-shadow"
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-5"
                style={{ background: bg }}
              >
                <Icon size={20} style={{ color: iconColor }} />
              </div>
              <h3 className="font-black mb-1.5 sm:mb-2 text-sm sm:text-base" style={{ color: '#1a0a00' }}>{title}</h3>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#7a5c3a' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
