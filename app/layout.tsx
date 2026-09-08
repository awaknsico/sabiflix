import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from 'next'
import { Inter, Bricolage_Grotesque, Poppins } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { LocalStorageCleanup } from '@/components/local-storage-cleanup'
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

/** Brand wordmark face — rounded geometric extra-bold ("sabiflix"). */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sabiflix.vercel.app'),
  title: 'SabiFlix — Curated African Cinema',
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
        className={`${inter.variable} ${bricolage.variable} ${poppins.variable} bg-background`}
      >
        <body className="font-sans antialiased">
          {children}
          <Toaster />
          <LocalStorageCleanup />
          <PwaRegister />
        </body>
      </html>
    </ClerkProvider>
  )
}
