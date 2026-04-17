'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Search, Navigation, Plus, User, LogOut, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  /* ── Items gauche (2) + droite (2) selon état connexion ── */
  const leftItems = [
    { href: '/',      label: 'Accueil',   icon: Home },
    { href: '/vente', label: 'Recherche', icon: Search },
  ]

  const rightItems = user
    ? [
        { href: '/mon-espace', label: 'Mon espace', icon: LayoutDashboard, logout: false },
        { href: '#',           label: 'Déco.',      icon: LogOut,           logout: true  },
      ]
    : [
        { href: '/autour',    label: 'Autour',    icon: Navigation, logout: false },
        { href: '/connexion', label: 'Connexion', icon: User,       logout: false },
      ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Ligne dorée */}
      <div className="h-px w-full" style={{ background: '#D4A832' }} />

      {/* Barre blanche */}
      <div
        className="bg-white flex items-center h-16 relative shadow-[0_-4px_24px_rgba(139,26,46,.10)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Gauche : 2 items */}
        {leftItems.map(({ href, label, icon: Icon }) => {
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

        {/* Droite : 2 items (Mon espace + Déco. si connecté, sinon Autour + Connexion) */}
        {rightItems.map(({ href, label, icon: Icon, logout: isLogout }) => {
          if (isLogout) return (
            <button
              key="logout"
              onClick={handleLogout}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all">
                <Icon size={20} strokeWidth={2} style={{ color: '#ef4444' }} />
              </div>
              <span className="text-[10px] font-semibold leading-none" style={{ color: '#ef4444' }}>
                {label}
              </span>
            </button>
          )
          const active = pathname?.startsWith(href)
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
      </div>
    </nav>
  )
}
