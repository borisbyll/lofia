import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BRAND } from '@/lib/brand'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = `https://${BRAND.domaine}`
  const supabase = await createClient()

  const { data: biens } = await supabase
    .from('biens')
    .select('slug, updated_at')
    .eq('statut', 'publie')
    .order('updated_at', { ascending: false })

  const bienUrls: MetadataRoute.Sitemap = (biens || []).map((bien) => ({
    url: `${baseUrl}/biens/${bien.slug}`,
    lastModified: new Date(bien.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/vente`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/location`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...bienUrls,
  ]
}
