import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/brand'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/mon-espace/', '/moderateur/', '/admin/', '/connexion', '/inscription'],
    },
    sitemap: `https://${BRAND.domaine}/sitemap.xml`,
  }
}
