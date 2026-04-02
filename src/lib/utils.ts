import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(prix: number, prix_type: 'total' | 'par_mois' | 'par_nuit'): string {
  const formatted = new Intl.NumberFormat('fr-FR').format(prix) + ' FCFA'
  if (prix_type === 'par_mois')  return formatted + '/mois'
  if (prix_type === 'par_nuit')  return formatted + '/nuit'
  return formatted
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}
