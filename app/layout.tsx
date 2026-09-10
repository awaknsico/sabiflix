import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { LocalStorageCleanup } from '@/components/local-storage-cleanup'
import { PwaRegister } from '@/components/pwa-register'
import { ProgressiveEnhancement } from '@/components/progressive-enhancement'
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
  title: 'SabiFlix - Curated African Cinema',
  description:
    'A distraction-free streaming platform for Nollywood, African films, short films, and documentaries. Curated by humans, for lovers of African stories.',
  icons: {
    icon: '/brand/source/app-icon.png',
    apple: '/brand/source/app-icon.png',
  },
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
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${bricolage.variable} bg-background`}
      >
        <body className="font-sans antialiased">
          {children}
          <Toaster />
          <LocalStorageCleanup />
          <PwaRegister />
          <ProgressiveEnhancement />
        </body>
      </html>
    </ClerkProvider>
  )
}
