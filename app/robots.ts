import type { MetadataRoute } from 'next'
import { SITE_URL } from './site-config'

// Tells search engines what they may look at.
// Everything is allowed except /api/, which is internal plumbing.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
