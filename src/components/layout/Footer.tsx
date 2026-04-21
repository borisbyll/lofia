import Link from 'next/link'
import { Phone, Mail, MapPin, Facebook, Instagram } from 'lucide-react'
import { BRAND } from '@/lib/brand'
import { LogoLofia } from '@/components/lofia/LogoLofia'

export default function Footer() {
  return (
    <footer style={{ background: '#4D0A15' }}>
      {/* Ligne dorée haut */}
      <div className="h-1 w-full" style={{ background: '#D4A832' }} />

      <div className="wrap py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Marque */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <LogoLofia variant="light" className="text-2xl" />
            </div>
            <p className="text-sm leading-relaxed mb-5 text-white/55">
              {BRAND.tagline}
            </p>
            <div className="flex gap-3">
              <a href="#" aria-label="LOFIA. sur Facebook" className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-white/10 hover:bg-accent transition-colors">
                <Facebook size={16} aria-hidden="true" />
              </a>
              <a href="#" aria-label="LOFIA. sur Instagram" className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-white/10 hover:bg-accent transition-colors">
                <Instagram size={16} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Explorer */}
          <div>
            <p className="font-bold text-xs uppercase tracking-widest mb-4 text-accent">
              Explorer
            </p>
            <div className="space-y-2.5">
              {[
                { href: '/vente',       label: 'Acheter un bien' },
                { href: '/location',    label: 'Louer un bien' },
                { href: '/inscription', label: 'Publier une annonce' },
                { href: '/connexion',   label: 'Se connecter' },
              ].map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block text-sm text-white/55 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Informations */}
          <div>
            <p className="font-bold text-xs uppercase tracking-widest mb-4 text-accent">
              Informations
            </p>
            <div className="space-y-2.5">
              {[
                { href: '/faq',        label: 'FAQ' },
                { href: '/conditions', label: "Conditions d'utilisation" },
              ].map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block text-sm text-white/55 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="font-bold text-xs uppercase tracking-widest mb-4 text-accent">
              Contact
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-sm text-white/55">
                <MapPin size={14} className="shrink-0 text-accent" />
                {BRAND.adresse}
              </div>
              <a
                href={`mailto:${BRAND.email}`}
                className="flex items-center gap-2.5 text-sm text-white/55 hover:text-accent transition-colors"
              >
                <Mail size={14} className="shrink-0 text-accent" />
                {BRAND.email}
              </a>
              <a
                href={`https://wa.me/${BRAND.whatsapp.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-white/55 hover:text-accent transition-colors"
              >
                <Phone size={14} className="shrink-0 text-accent" />
                WhatsApp Support
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/35 border-t border-white/10">
          <p>© {new Date().getFullYear()} {BRAND.name} — Tous droits réservés</p>
          <p>Plateforme immobilière agréée • Togo • {BRAND.domaine}</p>
        </div>
      </div>
    </footer>
  )
}
