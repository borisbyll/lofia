'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Plus, User, LogOut, LayoutDashboard, ChevronDown, Tag, Menu, X,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import NotifBell from './NotifBell'
import { LogoLofia } from '@/components/lofia/LogoLofia'

const navLinks = [
  { href: '/',         label: 'Accueil' },
  { href: '/vente',    label: 'Vente' },
  { href: '/location', label: 'Location' },
  { href: '/autour',   label: 'Autour de moi' },
]

export default function Navbar() {
  const [open,     setOpen]     = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router   = useRouter()
  const { user, profile, role, logout } = useAuthStore()

  useEffect(() => { setOpen(false); setDropOpen(false) }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const initiales = profile?.nom
    ? profile.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white shadow-[0_2px_24px_rgba(139,26,46,.10)] border-b border-primary-50'
          : 'bg-white/95 backdrop-blur-md border-b border-primary-50/60'
      )}
    >
      {/* Ligne dorée haut */}
      <div className="h-0.5 w-full" style={{ background: '#D4A832' }} />

      <div className="wrap h-15 flex items-center justify-between gap-4" style={{ height: 60 }}>

        {/* Logo */}
        <Link href="/" className="shrink-0">
          <LogoLofia variant="dark" className="text-xl" />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map(({ href, label }) => {
            const active = href === '/' ? pathname === '/' : pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                  active
                    ? 'bg-primary-50 text-primary-500'
                    : 'hover:bg-primary-50/60 hover:text-primary-500'
                )}
                style={{ color: active ? '#8B1A2E' : '#7a5c3a' }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Actions desktop */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/mon-espace/publier"
                className="btn btn-primary text-sm px-4 py-2 gap-1.5"
              >
                <Plus size={15} /> Publier un bien
              </Link>
              <NotifBell />
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setDropOpen(v => !v)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all',
                    dropOpen ? 'bg-primary-50' : 'hover:bg-primary-50/50'
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #8B1A2E 0%, #6B0F1E 100%)' }}
                  >
                    {initiales}
                  </div>
                  <span className="text-sm font-semibold max-w-[90px] truncate" style={{ color: '#1a0a00' }}>
                    {profile?.nom}
                  </span>
                  <ChevronDown size={13} className={cn('transition-transform', dropOpen && 'rotate-180')} style={{ color: '#7a5c3a' }} />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-[0_8px_40px_rgba(139,26,46,.14)] py-2 z-50 border border-primary-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-primary-50 mb-1">
                      <p className="text-sm font-black truncate" style={{ color: '#1a0a00' }}>{profile?.nom}</p>
                      <p className="text-xs mt-0.5 capitalize" style={{ color: '#7a5c3a' }}>{role || 'utilisateur'}</p>
                    </div>
                    <NavDropItem href="/mon-espace"        icon={LayoutDashboard} label="Mon espace" />
                    <NavDropItem href="/mon-espace/profil" icon={User}            label="Mon profil" />
                    {(role === 'moderateur' || role === 'admin') && (
                      <NavDropItem href="/moderateur" icon={Tag} label="Modération" />
                    )}
                    {role === 'admin' && (
                      <NavDropItem href="/admin" icon={LayoutDashboard} label="Administration" />
                    )}
                    <div className="h-px my-1.5 mx-3" style={{ background: '#FAE8EC' }} />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/connexion" className="btn btn-ghost text-sm" style={{ color: '#7a5c3a' }}>
                Connexion
              </Link>
              <Link href="/inscription" className="btn btn-primary text-sm gap-1.5">
                <Plus size={14} /> Publier un bien
              </Link>
            </>
          )}
        </div>

        {/* Burger mobile */}
        <button
          onClick={() => setOpen(v => !v)}
          className="md:hidden p-2 rounded-xl hover:bg-primary-50 transition-colors"
          aria-label="Menu"
        >
          {open
            ? <X size={22} style={{ color: '#8B1A2E' }} />
            : <Menu size={22} style={{ color: '#1a0a00' }} />
          }
        </button>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="md:hidden border-t border-primary-50 bg-white px-3 py-3 space-y-0.5 shadow-lg animate-fade-in">
          {navLinks.map(({ href, label }) => {
            const active = href === '/' ? pathname === '/' : pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors hover:bg-primary-50 min-h-[48px]"
                style={{ color: active ? '#8B1A2E' : '#1a0a00' }}
              >
                {label}
              </Link>
            )
          })}
          <div className="h-px my-2 mx-2" style={{ background: '#FAE8EC' }} />
          {user ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 bg-primary-50 rounded-xl mb-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0"
                  style={{ background: 'linear-gradient(135deg, #8B1A2E 0%, #6B0F1E 100%)' }}
                >
                  {initiales}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#1a0a00' }}>{profile?.nom}</p>
                  <p className="text-xs capitalize" style={{ color: '#7a5c3a' }}>{role || 'utilisateur'}</p>
                </div>
              </div>
              <Link
                href="/mon-espace/publier"
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold text-white transition-colors min-h-[48px]"
                style={{ background: '#8B1A2E' }}
              >
                <Plus size={16} /> Publier un bien
              </Link>
              <Link
                href="/mon-espace"
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-colors min-h-[48px]"
                style={{ color: '#1a0a00' }}
              >
                <LayoutDashboard size={16} style={{ color: '#7a5c3a' }} /> Mon espace
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors min-h-[48px]"
              >
                <LogOut size={16} /> Déconnexion
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2.5 px-1 pt-1 pb-2">
              <Link
                href="/connexion"
                className="flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-bold border-2 transition-colors hover:bg-primary-50 min-h-[48px]"
                style={{ borderColor: '#8B1A2E', color: '#8B1A2E' }}
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-bold text-white transition-colors min-h-[48px]"
                style={{ background: '#8B1A2E' }}
              >
                Créer un compte
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

function NavDropItem({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors"
      style={{ color: '#1a0a00' }}
    >
      <Icon size={14} style={{ color: '#7a5c3a' }} /> {label}
    </Link>
  )
}
