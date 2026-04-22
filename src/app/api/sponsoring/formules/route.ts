import { NextResponse } from 'next/server'
import { FORMULES } from '@/lib/sponsoring/formules'

export async function GET() {
  return NextResponse.json({ formules: FORMULES })
}
