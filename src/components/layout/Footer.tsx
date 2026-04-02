import { Link } from 'react-router-dom'
import { Home, Mail, Phone } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export default function Footer() {
  return (
    <footer className="bg-[#1a3c5e] text-white mt-auto">
      <div className="wrap py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand — modifier dans src/lib/brand.ts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {BRAND.logo && BRAND.logo !== '/logo.png' ? (
                <img src={BRAND.logo} alt={BRAND.name} className="h-8 brightness-0 invert"/>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                    <Home size={16} className="text-white"/>
                  </div>
                  <span className="font-black text-lg tracking-tight">{BRAND.logoText}</span>
                </div>
              )}
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{BRAND.tagline}</p>
            <p className="text-white/40 text-xs mt-4">Togo · Afrique de l'Ouest</p>
          </div>

          {/* Liens */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-4">Navigation</h4>
            <ul className="space-y-2.5">
              {[
                { to: '/',          label: 'Accueil' },
                { to: '/vente',     label: 'Acheter un bien' },
                { to: '/location',  label: 'Louer un bien' },
                { to: '/inscription', label: 'Publier une annonce' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-white/70 text-sm hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-4">Contact</h4>
            <ul className="space-y-3">
              {BRAND.email && (
                <li className="flex items-center gap-2.5 text-sm text-white/70">
                  <Mail size={15} className="text-white/40 flex-shrink-0"/>
                  <a href={`mailto:${BRAND.email}`} className="hover:text-white transition-colors">
                    {BRAND.email}
                  </a>
                </li>
              )}
              {BRAND.phone && (
                <li className="flex items-center gap-2.5 text-sm text-white/70">
                  <Phone size={15} className="text-white/40 flex-shrink-0"/>
                  {BRAND.phone}
                </li>
              )}
            </ul>
            {(BRAND.social.facebook || BRAND.social.instagram) && (
              <div className="flex gap-3 mt-5">
                {BRAND.social.facebook && (
                  <a href={BRAND.social.facebook} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white text-xs font-bold">
                    f
                  </a>
                )}
                {BRAND.social.instagram && (
                  <a href={BRAND.social.instagram} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white text-xs font-bold">
                    ig
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} {BRAND.name}. Tous droits réservés.
          </p>
          <p className="text-white/30 text-xs">Plateforme immobilière au Togo</p>
        </div>
      </div>
    </footer>
  )
}
