import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, Home, Tag, Key, User, LogOut, Plus, LayoutDashboard, ChevronDown } from 'lucide-react'
import { BRAND } from '@/lib/brand'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const [open,    setOpen]    = useState(false)
  const [dropOpen,setDropOpen]= useState(false)
  const { user, profile, role, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navLinks = [
    { to: '/vente',    label: 'Acheter',  icon: Home },
    { to: '/location', label: 'Louer',    icon: Key },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="wrap h-16 flex items-center justify-between gap-4">

        {/* ── Logo — modifier BRAND.logo / BRAND.name dans src/lib/brand.ts ── */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0" onClick={() => setOpen(false)}>
          {BRAND.logo && BRAND.logo !== '/logo.png' ? (
            <img src={BRAND.logo} alt={BRAND.name} className="h-9 w-auto"/>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1a3c5e] flex items-center justify-center">
                <Home size={16} className="text-white"/>
              </div>
              <span className="font-black text-lg text-[#1a3c5e] tracking-tight">{BRAND.logoText}</span>
            </div>
          )}
        </Link>

        {/* ── Nav desktop ── */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                isActive ? 'bg-[#e8f0f8] text-[#1a3c5e]' : 'text-gray-600 hover:text-[#1a3c5e] hover:bg-gray-50'
              )}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* ── Actions desktop ── */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/mon-espace/publier" className="btn-secondary text-sm">
                <Plus size={15}/> Publier un bien
              </Link>
              <div className="relative">
                <button onClick={() => setDropOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#1a3c5e] flex items-center justify-center text-white text-xs font-black">
                    {profile?.nom?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 max-w-[100px] truncate">{profile?.nom}</span>
                  <ChevronDown size={14} className={cn('text-gray-400 transition-transform', dropOpen && 'rotate-180')}/>
                </button>
                {dropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 card shadow-lg py-1 z-50">
                    <Link to="/mon-espace" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <LayoutDashboard size={15}/> Mon espace
                    </Link>
                    <Link to="/mon-espace/profil" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User size={15}/> Mon profil
                    </Link>
                    {(role === 'moderateur' || role === 'admin') && (
                      <Link to="/moderateur" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Tag size={15}/> Modération
                      </Link>
                    )}
                    {role === 'admin' && (
                      <Link to="/admin" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <LayoutDashboard size={15}/> Administration
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100"/>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut size={15}/> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/connexion"  className="btn-ghost text-sm">Connexion</Link>
              <Link to="/inscription" className="btn-primary text-sm">Publier un bien</Link>
            </>
          )}
        </div>

        {/* ── Burger mobile ── */}
        <button onClick={() => setOpen(v => !v)} className="md:hidden p-2 rounded-xl hover:bg-gray-100">
          {open ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </div>

      {/* ── Menu mobile ── */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Icon size={17}/> {label}
            </Link>
          ))}
          <hr className="my-2 border-gray-100"/>
          {user ? (
            <>
              <Link to="/mon-espace/publier" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-[#e8a020] bg-amber-50">
                <Plus size={17}/> Publier un bien
              </Link>
              <Link to="/mon-espace" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <LayoutDashboard size={17}/> Mon espace
              </Link>
              <button onClick={() => { handleLogout(); setOpen(false) }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50">
                <LogOut size={17}/> Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/connexion" onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold border-2 border-[#1a3c5e] text-[#1a3c5e]">
                Connexion
              </Link>
              <Link to="/inscription" onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold bg-[#1a3c5e] text-white">
                Créer un compte
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
