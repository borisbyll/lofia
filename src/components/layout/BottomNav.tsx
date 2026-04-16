'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Navigation, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { href: '/',       label: 'Accueil',   icon: Home },
  { href: '/vente',  label: 'Recherche', icon: Search },
  { href: '/autour', label: 'Autour',    icon: Navigation },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Ligne dorée */}
      <div className="h-px w-full" style={{ background: '#D4A832' }} />

      {/* Barre blanche */}
      <div
        className="bg-white flex items-center h-16 relative shadow-[0_-4px_24px_rgba(139,26,46,.10)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Gauche : 3 items */}
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: active ? '#FAE8EC' : 'transparent' }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  style={{ color: active ? '#8B1A2E' : '#7a5c3a' }}
                />
              </div>
              <span
                className="text-[10px] font-semibold leading-none"
                style={{ color: active ? '#8B1A2E' : '#7a5c3a' }}
              >
                {label}
              </span>
            </Link>
          )
        })}

        {/* Centre : bouton Publier flottant */}
        <div className="flex-1 flex flex-col items-center justify-center h-full relative">
          {/* Bouton qui dépasse au-dessus de la barre */}
          <Link
            href={user ? '/mon-espace/publier' : '/inscription'}
            className="absolute -top-5 flex flex-col items-center gap-0.5"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white"
              style={{ background: '#8B1A2E' }}
            >
              <Plus size={22} className="text-white" />
            </div>
            <span
              className="text-[10px] font-semibold leading-none mt-0.5"
              style={{ color: '#7a5c3a' }}
            >
              Publier
            </span>
          </Link>
        </div>

        {/* Profil */}
        <Link
          href={user ? '/mon-espace' : '/connexion'}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
        >
          {(() => {
            const active = pathname?.startsWith('/mon-espace') || pathname?.startsWith('/connexion')
            return (
              <>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: active ? '#FAE8EC' : 'transparent' }}
                >
                  <User
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    style={{ color: active ? '#8B1A2E' : '#7a5c3a' }}
                  />
                </div>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ color: active ? '#8B1A2E' : '#7a5c3a' }}
                >
                  {user ? 'Profil' : 'Connexion'}
                </span>
              </>
            )
          })()}
        </Link>
      </div>
    </nav>
  )
}
