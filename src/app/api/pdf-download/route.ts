import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Extrait le chemin du fichier depuis une URL Supabase Storage
// ex: https://xxx.supabase.co/storage/v1/object/public/contrats/a/b/file.pdf → a/b/file.pdf
function extractPath(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`
  const signedMarker = `/object/sign/${bucket}/`
  let idx = url.indexOf(marker)
  if (idx !== -1) return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
  idx = url.indexOf(signedMarker)
  if (idx !== -1) return decodeURIComponent(url.slice(idx + signedMarker.length).split('?')[0])
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url      = searchParams.get('url')
  const filename = searchParams.get('filename') ?? 'document.pdf'

  if (!url) return NextResponse.json({ error: 'url manquant' }, { status: 400 })
  if (!url.includes('.supabase.co/storage/')) {
    return NextResponse.json({ error: 'URL non autorisée' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Détecter le bucket depuis l'URL
  const bucketMatch = url.match(/\/object\/(?:public|sign)\/([^/]+)\//)
  const bucket = bucketMatch?.[1] ?? 'contrats'
  const filePath = extractPath(url, bucket)

  let buffer: ArrayBuffer

  if (filePath) {
    // Utiliser supabaseAdmin pour contourner les restrictions RLS/private bucket
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(filePath)
    if (error || !data) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
    buffer = await data.arrayBuffer()
  } else {
    // Fallback : fetch direct (bucket public)
    const res = await fetch(url)
    if (!res.ok) return NextResponse.json({ error: 'PDF introuvable' }, { status: 404 })
    buffer = await res.arrayBuffer()
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buffer.byteLength.toString(),
    },
  })
}
