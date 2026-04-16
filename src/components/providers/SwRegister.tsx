'use client'

import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {
          // SW non critique — silencieux en dev
        })
    }
  }, [])

  return null
}
