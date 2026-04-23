import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url      = searchParams.get('url')
  const filename = searchParams.get('filename') ?? 'contrat.pdf'

  if (!url) return NextResponse.json({ error: 'url manquant' }, { status: 400 })

  // Vérifier que l'URL pointe vers Supabase (sécurité)
  if (!url.includes('.supabase.co/storage/')) {
    return NextResponse.json({ error: 'URL non autorisée' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const res = await fetch(url)
  if (!res.ok) return NextResponse.json({ error: 'PDF introuvable' }, { status: 404 })

  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buffer.byteLength.toString(),
    },
  })
}
