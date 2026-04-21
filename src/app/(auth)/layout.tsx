import Link from 'next/link'
import { BRAND } from '@/lib/brand'
import { LogoLofia } from '@/components/lofia/LogoLofia'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(150deg, #FAE8EC 0%, #FFFDF5 50%, #FDF8E8 100%)' }}
    >
      {/* Ligne dorée haut */}
      <div className="h-1 w-full" style={{ background: '#D4A832' }} />

      <header className="px-4 py-4 sm:p-5">
        <Link href="/" className="inline-flex items-center" aria-label="LOFIA. — Accueil">
          <LogoLofia variant="dark" className="text-xl" />
        </Link>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-6 sm:p-4">
        {children}
      </main>

      <footer className="px-4 py-4 sm:p-5 text-center text-xs" style={{ color: '#7a5c3a' }}>
        © {new Date().getFullYear()} {BRAND.name} · {BRAND.domaine}
      </footer>
    </div>
  )
}
