import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SITE_URL } from './site-config'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

// ══════════════════════════════════════════════════════════════════════════
//  WHAT GOOGLE AND WHATSAPP SHOW
//
//  These lines are the first thing anyone reads about Dawnova — in search
//  results, and in the link preview when someone shares the site in a chat.
//
//  They deliberately describe ONE product, because that is what exists.
//  The page itself says "one real product today"; if this described a
//  nine-arm ecosystem, every visitor would arrive already misled.
//  Keep these two things saying the same thing.
// ══════════════════════════════════════════════════════════════════════════
export const metadata: Metadata = {
  title: 'Dawnova Technologies — WhatsApp-First Commerce for Nigerian Businesses',
  description: 'Dawnova Commerce is a WhatsApp-first commerce platform for Nigerian small and medium businesses — storefront, orders, inventory and payments in one dashboard. The first product from Dawnova Technologies. Join the waitlist for the Q4 2026 beta.',
  keywords: ['Dawnova', 'Dawnova Commerce', 'WhatsApp commerce', 'Nigerian SME', 'Nigeria tech', 'commerce platform', 'WhatsApp business Nigeria', 'African technology'],
  authors: [{ name: 'Dawnova Technologies' }],
  creator: 'Dawnova Technologies',
  publisher: 'Dawnova Technologies',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: SITE_URL,
    siteName: 'Dawnova Technologies',
    title: 'Dawnova Technologies — WhatsApp-First Commerce for Nigerian Businesses',
    description: 'Dawnova Commerce: storefront, orders, inventory and payments in one WhatsApp-first dashboard, built for Nigerian entrepreneurs. Beta opens Q4 2026 to the first 500 merchants.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Dawnova Technologies — WhatsApp-first commerce, built for Nigerian businesses.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dawnova Technologies — WhatsApp-First Commerce for Nigerian Businesses',
    description: 'Storefront, orders and payments in one WhatsApp-first dashboard, built for Nigerian entrepreneurs. Rising from dawn. Reaching for nova.',
    images: ['/og-image.png'],
    creator: '@dawnovatech',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // lang="en-NG" matches the openGraph locale above, and tells search engines
  // and screen readers this is Nigerian English.
  return (
    <html lang="en-NG" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        <meta name="theme-color" content="#0A0E1F" />
      </head>
      <body>
        {/* ══════════════════════════════════════════════════════════════════
            STRUCTURED DATA — how Google reads Dawnova as a company

            Search engines can read the words on the page, but this tells them
            the facts directly: the legal name, the former name, who founded it,
            what country it is in, and where to find it on social media. It is
            what feeds the company panel that can appear beside search results.
            It is invisible to visitors.

            KEEP THIS TRUE. If the company name, founder or social links change,
            change them here too — publishing structured data that contradicts
            the page is worse than publishing none.
            ══════════════════════════════════════════════════════════════════ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Dawnova Technologies',
            alternateName: 'Swiftex Technologies',
            url: SITE_URL,
            logo: `${SITE_URL}/logo.png`,
            image: `${SITE_URL}/og-image.png`,
            slogan: 'Rising from dawn. Reaching for nova.',
            description: 'Nigerian technology company building Dawnova Commerce, a WhatsApp-first commerce platform for small and medium businesses.',
            foundingDate: '2026',
            founder: {
              '@type': 'Person',
              name: 'Habeeb Ayodeji Sina-Omigbule',
              jobTitle: 'Founder & Chief Executive Officer',
            },
            address: { '@type': 'PostalAddress', addressCountry: 'NG' },
            areaServed: { '@type': 'Country', name: 'Nigeria' },
            sameAs: [
              'https://x.com/dawnovatech',
              'https://instagram.com/dawnovatech',
            ],
          }) }}
        />
        {children}

        {/* ══════════════════════════════════════════════════════════════════
            VISITOR ANALYTICS

            Tells you how many people visit, which countries they come from,
            and how many actually join the waitlist.

            Chosen deliberately over Google Analytics because it uses NO
            COOKIES and does not track people across other websites. That
            means you do not need a cookie consent banner, and it keeps the
            promise your Privacy Policy makes about not tracking visitors.

            ⚠️ ONE STEP LEFT, and it must be done by you:
               Vercel dashboard → your project → Analytics → Enable.
               Until you click that, this collects nothing at all.

            Figures appear in that same Analytics tab. It is free up to a
            generous monthly limit.
            ══════════════════════════════════════════════════════════════════ */}
        
        <Analytics />
      </body>
    </html>
  )
}