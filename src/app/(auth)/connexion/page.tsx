import { Suspense } from 'react'
import ConnexionClient from './ConnexionClient'

export const metadata = { title: 'Connexion' }

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm h-80 skeleton rounded-3xl mx-auto" />}>
      <ConnexionClient />
    </Suspense>
  )
}
