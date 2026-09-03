import Link from 'next/link'
import { Clapperboard } from 'lucide-react'

const footerLinks: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Discover',
    links: [
      { label: 'Catalog', href: '/catalog' },
      { label: 'Features', href: '/catalog?category=feature' },
      { label: 'Documentaries', href: '/catalog?category=documentary' },
      { label: 'Short Films', href: '/catalog?category=short' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'Request a Film', href: '/dashboard' },
      { label: 'Submit Your Film', href: '/dashboard' },
      { label: 'My Dashboard', href: '/dashboard' },
    ],
  },
  {
    heading: 'About',
    links: [
      { label: 'Our Curation', href: '/' },
      { label: 'Filmmakers', href: '/' },
      { label: 'Contact', href: '/' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/[0.06] bg-sidebar">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-ember text-[#14150E] shadow-[0_4px_16px_-4px_rgba(217,146,50,0.6)]">
              <Clapperboard className="size-4" />
            </span>
            <span className="font-serif text-lg font-bold">
              Sabi<span className="text-ember-gradient">Flix</span>
            </span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            A curated, distraction-free home for Nollywood, African films, short films,
            and documentaries. Chosen by humans, for lovers of African stories.
          </p>
        </div>

        {footerLinks.map((group) => (
          <nav key={group.heading} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{group.heading}</h3>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} SabiFlix. Curated with care.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="transition-colors hover:text-primary">
              Privacy
            </Link>
            <Link href="/" className="transition-colors hover:text-primary">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
