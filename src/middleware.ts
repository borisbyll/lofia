import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() lit le JWT depuis le cookie sans appel réseau → navigation instantanée
  // getUser() ferait un aller-retour Supabase à chaque navigation (latence élevée)
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const pathname = request.nextUrl.pathname

  // Routes nécessitant uniquement l'authentification
  const authRequired = ['/mon-espace']
  // Routes nécessitant les rôles modérateur ou admin
  const modRoutes = ['/moderateur']
  // Routes nécessitant le rôle admin uniquement
  const adminRoutes = ['/admin']
  // Routes réservées aux agents terrain (role = agent | moderateur | admin)
  const agentRoutes = ['/agent']

  const isAuthRequired  = authRequired.some(p => pathname.startsWith(p))
  const isModRoute      = modRoutes.some(p => pathname.startsWith(p))
  const isAdminRoute    = adminRoutes.some(p => pathname.startsWith(p))
  const isAgentRoute    = agentRoutes.some(p => pathname.startsWith(p))

  // Non authentifié → redirect connexion
  if ((isAuthRequired || isModRoute || isAdminRoute || isAgentRoute) && !user) {
    const loginUrl = new URL('/connexion', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Vérification des rôles pour les routes protégées
  if (user && (isModRoute || isAdminRoute || isAgentRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/mon-espace', request.url))
    }

    if (isModRoute && role !== 'moderateur' && role !== 'admin') {
      return NextResponse.redirect(new URL('/mon-espace', request.url))
    }

    if (isAgentRoute && !['agent', 'moderateur', 'admin'].includes(role ?? '')) {
      return NextResponse.redirect(new URL('/mon-espace', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
