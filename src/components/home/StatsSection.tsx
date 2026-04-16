import { Building2, Users, ShieldCheck, MapPin } from 'lucide-react'

const stats = [
  { icon: Building2,   label: 'Annonces publiées',  value: '500+',   iconColor: '#8B1A2E', bg: '#FAE8EC' },
  { icon: Users,       label: 'Utilisateurs actifs', value: '1 200+', iconColor: '#D4A832', bg: '#FDF8E8' },
  { icon: ShieldCheck, label: 'Annonces vérifiées',  value: '100%',   iconColor: '#2D6A4F', bg: '#ECFDF5' },
  { icon: MapPin,      label: 'Villes couvertes',    value: '15',     iconColor: '#6B0F1E', bg: '#FAE8EC' },
]

export default function StatsSection() {
  return (
    <section className="section border-b border-primary-50" style={{ background: '#FFFDF5' }}>
      <div className="wrap">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {stats.map(({ icon: Icon, label, value, iconColor, bg }) => (
            <div
              key={label}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-primary-50 shadow-sm text-center hover:shadow-[0_4px_20px_rgba(139,26,46,.08)] transition-shadow"
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3"
                style={{ background: bg }}
              >
                <Icon size={20} style={{ color: iconColor }} />
              </div>
              <p className="text-xl sm:text-2xl font-black" style={{ color: iconColor }}>{value}</p>
              <p className="text-[11px] sm:text-xs mt-1" style={{ color: '#7a5c3a' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
