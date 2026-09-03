import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sabiflix.vercel.app'),
  title: 'SabiFlix — Curated African Cinema',
  description:
    'A distraction-free streaming platform for Nollywood, African films, short films, and documentaries. Curated by humans, for lovers of African stories.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0A0B0F',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <PwaRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
