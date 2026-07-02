import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
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

export const metadata: Metadata = {
  title: 'Dawnova Technologies — Africa\'s Digital Ecosystem',
  description: 'Dawnova Technologies is building Africa\'s most comprehensive digital ecosystem — spanning commerce, investment, AI, mobility, media and beyond. Born in Nigeria. Built for the world.',
  keywords: ['Dawnova', 'Nigeria tech', 'African technology', 'commerce platform', 'WhatsApp commerce', 'Nigerian SME', 'digital ecosystem', 'Dawnova Commerce'],
  authors: [{ name: 'Dawnova Technologies' }],
  creator: 'Dawnova Technologies',
  publisher: 'Dawnova Technologies',
  metadataBase: new URL('https://dawnova.tech'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://dawnova.tech',
    siteName: 'Dawnova Technologies',
    title: 'Dawnova Technologies — Africa\'s Digital Ecosystem',
    description: 'Rising from dawn. Reaching for nova. Africa\'s most comprehensive digital ecosystem — commerce, AI, investment, mobility and beyond.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Dawnova Technologies — Rising from dawn. Reaching for nova.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dawnova Technologies — Africa\'s Digital Ecosystem',
    description: 'Rising from dawn. Reaching for nova. Built in Nigeria. Built for the world.',
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
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        <meta name="theme-color" content="#0A0E1F" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}