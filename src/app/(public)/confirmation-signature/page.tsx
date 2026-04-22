import { Suspense } from 'react'
import ConfirmationSignatureClient from './ConfirmationSignatureClient'

export default function ConfirmationSignaturePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center"><div className="skeleton w-64 h-32 rounded-2xl" /></div>}>
      <ConfirmationSignatureClient />
    </Suspense>
  )
}
