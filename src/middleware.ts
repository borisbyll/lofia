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

  // getUser() valide le token côté serveur (pas getSession() qui lit localStorage)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Routes nécessitant uniquement l'authentification
  const authRequired = ['/mon-espace']
  // Routes nécessitant les rôles modérateur ou admin
  const modRoutes = ['/moderateur']
  // Routes nécessitant le rôle admin uniquement
  const adminRoutes = ['/admin']

  const isAuthRequired  = authRequired.some(p => pathname.startsWith(p))
  const isModRoute      = modRoutes.some(p => pathname.startsWith(p))
  const isAdminRoute    = adminRoutes.some(p => pathname.startsWith(p))

  // Non authentifié → redirect connexion
  if ((isAuthRequired || isModRoute || isAdminRoute) && !user) {
    const loginUrl = new URL('/connexion', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Vérification des rôles pour les routes modérateur et admin
  if (user && (isModRoute || isAdminRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (isAdminRoute && role !== 'admin') {
      // Pas admin → redirect vers son espace
      return NextResponse.redirect(new URL('/mon-espace', request.url))
    }

    if (isModRoute && role !== 'moderateur' && role !== 'admin') {
      // Pas modérateur ni admin → redirect vers son espace
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
