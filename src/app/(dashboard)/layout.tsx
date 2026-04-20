'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Home, Heart, MessageCircle,
  CalendarCheck, User, Plus, LogOut, ChevronRight,
  Shield, Settings, Building2, Bell, ArrowLeft,
} from 'lucide-react'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { useDashboardMode, type DashboardMode } from '@/store/dashboardModeStore'
import { supabase } from '@/lib/supabase/client'
import NotifBell from '@/components/layout/NotifBell'
import { cn } from '@/lib/utils'
import { LogoLofia } from '@/components/lofia/LogoLofia'

/* ── Toggle Propriétaire / Locataire ─────────────────────────── */
function ModeToggle({ mode, setMode }: { mode: DashboardMode; setMode: (m: DashboardMode) => void }) {
  return (
    <div className="flex rounded-xl border border-primary-100 overflow-hidden bg-primary-50/50 p-0.5 gap-0.5">
      <button
        onClick={() => setMode('proprietaire')}
        className={cn(
          'flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
          mode === 'proprietaire'
            ? 'bg-primary-500 text-white shadow-sm'
            : 'text-brun-doux hover:text-primary-600'
        )}>
        Propriétaire
      </button>
      <button
        onClick={() => setMode('locataire')}
        className={cn(
          'flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
          mode === 'locataire'
            ? 'bg-primary-500 text-white shadow-sm'
            : 'text-brun-doux hover:text-primary-600'
        )}>
        Locataire
      </button>
    </div>
  )
}

/* ── Nav items par mode ──────────────────────────────────────── */
const navProprietaire = [
  { href: '/mon-espace',                  label: 'Vue d\'ensemble',  icon: LayoutDashboard },
  { href: '/mon-espace/mes-biens',        label: 'Mes annonces',     icon: Home },
  { href: '/mon-espace/reservations',     label: 'Réservations',     icon: CalendarCheck },
  { href: '/mon-espace/messagerie',       label: 'Conversations',    icon: MessageCircle },
  { href: '/mon-espace/notifications',    label: 'Notifications',    icon: Bell },
  { href: '/mon-espace/profil',           label: 'Mon profil',       icon: User },
]

const navLocataire = [
  { href: '/mon-espace',                  label: 'Vue d\'ensemble',  icon: LayoutDashboard },
  { href: '/mon-espace/reservations',     label: 'Réservations',     icon: CalendarCheck },
  { href: '/mon-espace/favoris',          label: 'Favoris',          icon: Heart },
  { href: '/mon-espace/messagerie',       label: 'Conversations',    icon: MessageCircle },
  { href: '/mon-espace/notifications',    label: 'Notifications',    icon: Bell },
  { href: '/mon-espace/profil',           label: 'Mon profil',       icon: User },
]

const modItems = [
  { href: '/moderateur',               label: 'Dashboard modérateur', icon: Shield },
  { href: '/moderateur/signalements',  label: 'Signalements',         icon: Settings },
]

const adminItems = [
  { href: '/admin',               label: 'Dashboard admin',  icon: Shield },
  { href: '/admin/utilisateurs',  label: 'Utilisateurs',     icon: User },
  { href: '/admin/biens',         label: 'Tous les biens',   icon: Home },
  { href: '/admin/signalements',  label: 'Signalements',     icon: Settings },
]

/* ── Bottom nav mobile par mode ──────────────────────────────── */
// Profil accessible via avatar dans le header mobile → libère 1 slot
const bottomProprietaire = [
  { href: '/mon-espace',               label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/mon-espace/mes-biens',     label: 'Annonces',        icon: Building2 },
  { href: '/mon-espace/publier',       label: 'Publier',         icon: Plus, accent: true },
  { href: '/mon-espace/messagerie',    label: 'Messages',        icon: MessageCircle },
  { href: '/mon-espace/notifications', label: 'Alertes',         icon: Bell },
]

const bottomLocataire = [
  { href: '/mon-espace',               label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/mon-espace/reservations',  label: 'Réservations',   icon: CalendarCheck },
  { href: '/mon-espace/publier',       label: 'Publier',        icon: Plus, accent: true },
  { href: '/mon-espace/messagerie',    label: 'Messages',       icon: MessageCircle },
  { href: '/mon-espace/notifications', label: 'Alertes',        icon: Bell },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, profile, role, loading, logout } = useAuthStore()
  const { mode, setMode } = useDashboardMode()
  const [userMenuOpen,  setUserMenuOpen]  = useState(false)
  const [unreadNotifs,  setUnreadNotifs]  = useState(0)

  useEffect(() => {
    if (!loading && !user) router.replace('/connexion?next=' + pathname)
  }, [loading, user, pathname, router])

  // Compteur notifications non lues (pour badge bottom nav)
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { count } = await supabase
        .from('notifications').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('lu', false)
      setUnreadNotifs(count ?? 0)
    }
    load()
  }, [user, pathname]) // rafraîchit à chaque nav (ex. après avoir lu les notifs)

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const navItems   = mode === 'proprietaire' ? navProprietaire : navLocataire
  const bottomItems = mode === 'proprietaire' ? bottomProprietaire : bottomLocataire
  const extraItems = role === 'admin' ? adminItems : role === 'moderateur' ? modItems : []

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const initiales = profile?.nom
    ? profile.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="min-h-screen flex w-full overflow-x-hidden" style={{ background: '#FFFDF5' }}>

      {/* ═══ SIDEBAR DESKTOP ═══════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-primary-50 sticky top-0 h-screen shadow-[2px_0_12px_rgba(139,26,46,.04)]">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-primary-50">
          <Link href="/"><LogoLofia variant="dark" className="text-xl" /></Link>
        </div>

        {/* Avatar + infos utilisateur */}
        <div className="px-4 py-4 border-b border-primary-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm overflow-hidden">
              {profile?.avatar_url
                ? <Image src={profile.avatar_url} alt={profile.nom ?? ''} fill className="object-cover" sizes="40px" />
                : initiales
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-brun-nuit truncate">{profile?.nom ?? 'Utilisateur'}</p>
              <p className="text-[11px] font-semibold capitalize"
                style={{ color: mode === 'proprietaire' ? '#8B1A2E' : '#2D6A4F' }}>
                {mode === 'proprietaire' ? 'Propriétaire' : 'Locataire'}
              </p>
            </div>
            <NotifBell />
          </div>

          {/* Toggle */}
          <ModeToggle mode={mode} setMode={setMode} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {navItems.map(item => {
              const Icon = item.icon
              const active = pathname === item.href || (item.href !== '/mon-espace' && pathname.startsWith(item.href))
              return (
                <li key={item.href}>
                  <Link href={item.href} className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-brun-doux hover:bg-primary-50/60 hover:text-primary-600'
                  )}>
                    <Icon size={16} className={active ? 'text-primary-500' : 'text-gray-400'} />
                    {item.label}
                    {active && <ChevronRight size={13} className="ml-auto text-primary-400" />}
                  </Link>
                </li>
              )
            })}

            {extraItems.length > 0 && (
              <>
                <li className="pt-3 pb-1">
                  <p className="text-[10px] font-bold text-brun-doux uppercase tracking-wider px-3">
                    {role === 'admin' ? 'Administration' : 'Modération'}
                  </p>
                </li>
                {extraItems.map(item => {
                  const Icon = item.icon
                  const active = pathname.startsWith(item.href)
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-brun-doux hover:bg-primary-50/60 hover:text-primary-600'
                      )}>
                        <Icon size={16} className={active ? 'text-primary-500' : 'text-gray-400'} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </>
            )}
          </ul>
        </nav>

        {/* Actions bas de sidebar */}
        <div className="p-3 border-t border-primary-50 space-y-1">
          <Link href="/mon-espace/publier"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition-colors shadow-sm">
            <Plus size={15} />
            Publier une annonce
          </Link>
          <Link href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brun-doux hover:bg-primary-50 hover:text-primary-600 transition-colors">
            <ArrowLeft size={15} />
            Retour à l&apos;accueil
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brun-doux hover:bg-red-50 hover:text-red-500 transition-colors">
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ══════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:min-h-0">

        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-primary-50 px-4 py-3 flex items-center justify-between shadow-sm">
          <Link href="/"><LogoLofia variant="dark" className="text-xl" /></Link>
          <div className="flex items-center gap-2">
            <NotifBell />
            {/* Avatar utilisateur → profil + déconnexion */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-black text-xs shadow-sm overflow-hidden">
                {profile?.avatar_url
                  ? <Image src={profile.avatar_url} alt={profile?.nom ?? ''} fill className="object-cover" sizes="32px" />
                  : initiales
                }
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 z-50 w-52 overflow-hidden">
                    {/* Nom utilisateur */}
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-xs font-black text-gray-900 truncate">{profile?.nom}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{role || 'utilisateur'}</p>
                    </div>
                    <Link href="/mon-espace/profil"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                      <User size={14} className="text-gray-400" /> Mon profil
                    </Link>
                    <Link href="/mon-espace/reservations"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                      <CalendarCheck size={14} className="text-gray-400" /> Réservations
                    </Link>
                    <Link href="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                      <ArrowLeft size={14} className="text-gray-400" /> Retour à l&apos;accueil
                    </Link>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout() }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                      <LogOut size={14} /> Se déconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Toggle mobile — barre sous le header */}
        <div className="lg:hidden px-4 pt-3 pb-0">
          <div className="flex rounded-xl border border-primary-100 overflow-hidden bg-white p-0.5 gap-0.5 shadow-sm">
            <button
              onClick={() => setMode('proprietaire')}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-bold transition-all',
                mode === 'proprietaire'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-brun-doux'
              )}>
              Propriétaire
            </button>
            <button
              onClick={() => setMode('locataire')}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-bold transition-all',
                mode === 'locataire'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-brun-doux'
              )}>
              Locataire
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {children}
        </main>

        {/* Bottom nav mobile */}
        <nav className="lg:hidden sticky bottom-0 z-30 bg-white border-t border-primary-50 safe-area-pb shadow-[0_-4px_12px_rgba(139,26,46,.06)]">
          <div className="grid grid-cols-5 h-16">
            {bottomItems.map(item => {
              const Icon = item.icon
              const active = pathname === item.href || (item.href !== '/mon-espace' && pathname.startsWith(item.href))
              if ('accent' in item && item.accent) return (
                <Link key={item.href} href={item.href}
                  className="flex flex-col items-center justify-center gap-0.5 -mt-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center shadow-md border-2 border-white">
                    <Icon size={20} className="text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-primary-500">{item.label}</span>
                </Link>
              )
              const isNotif = item.href === '/mon-espace/notifications'
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 transition-colors px-0.5',
                    active ? 'text-primary-500' : 'text-brun-doux'
                  )}>
                  <div className={cn(
                    'relative w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                    active ? 'bg-primary-50' : ''
                  )}>
                    <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                    {isNotif && unreadNotifs > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                        {unreadNotifs > 9 ? '9+' : unreadNotifs}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold text-center leading-tight w-full truncate">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
