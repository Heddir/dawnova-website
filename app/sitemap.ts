import type { MetadataRoute } from 'next'
import { SITE_URL } from './site-config'

// Tells Google which pages exist. Right now there is only the one page.
// The address comes from site-config.ts so you only ever change it in one place.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
