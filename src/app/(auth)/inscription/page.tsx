import { Suspense } from 'react'
import InscriptionClient from './InscriptionClient'

export const metadata = { title: 'Créer un compte' }

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm h-96 skeleton rounded-3xl mx-auto" />}>
      <InscriptionClient />
    </Suspense>
  )
}
