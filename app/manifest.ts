import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SabiFlix — Curated African Cinema',
    short_name: 'SabiFlix',
    description:
      'A distraction-free streaming platform for Nollywood, African films, short films, and documentaries. Curated by humans.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0B0F',
    theme_color: '#0A0B0F',
    icons: [
      { src: '/brand/source/app-icon.png', sizes: '230x230', type: 'image/png', purpose: 'any' },
      { src: '/brand/source/app-icon.png', sizes: '230x230', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
