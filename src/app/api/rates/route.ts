import { NextResponse } from 'next/server'

// Taux de secours (BCE approximatifs) — utilisés si l'API est indisponible
const FALLBACK: Record<string, number> = {
  USD: 1.08,
  GBP: 0.85,
  CAD: 1.47,
  CHF: 0.97,
}

export async function GET() {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CAD,CHF',
      { next: { revalidate: 3600 } } // cache Next.js 1h côté serveur
    )
    if (!res.ok) throw new Error('Frankfurter unreachable')
    const data = await res.json()
    return NextResponse.json({ rates: data.rates, source: 'live' })
  } catch {
    return NextResponse.json({ rates: FALLBACK, source: 'fallback' })
  }
}
