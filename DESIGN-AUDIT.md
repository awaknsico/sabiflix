# SabiFlix × MovieBoxHD
## Design Audit & Design-Language Transfer Report

> **Prepared for:** SabiFlix (production app → `https://sabiflix.vercel.app/`)
> **Source app audited:** MovieBoxHD (→ `https://movieboxhd.net/`)
> **Framework context:** Next.js 16 · Tailwind CSS v4 · shadcn/ui + Base UI · lucide-react · OKLCH design tokens · fonts: Inter + Bricolage Grotesque
> **Method:** Live DOM/CSS inspection of MovieBoxHD's compiled stylesheets (all chunked CSS under `h5-static.aoneroom.com/ssrStatic/mbOfficial/public/_nuxt/*.css`) plus review of SabiFlix's source (`app/globals.css`, `app/page.tsx`, `components/movie-card.tsx`, `components/site-header.tsx`, `components/movie-carousel.tsx`). All values quoted below are taken from that compiled CSS, not guesses.

---

# Phase 1 — Deep Design Audit of MovieBoxHD

## 1. Overall Visual Aesthetic & Tone

**Mood.** Energetic, utilitarian, content-first. This is a "warehouse of content" theme: high density, near-zero decorative fluff, maximum signal. The energy comes from **two sources only** — the saturated cyan→mint gradient (brand) and the sheer volume of posters. Everything else stays quiet so the thumbnails do the talking.

**Dominant theme.** Pure **dark mode + strong color-grading**. No glassmorphism-as-style, no decorative shapes. Instead:
- A **cinematic near-black canvas** (`#101114`, a warm charcoal — not pure `#000`), sectioned by **blue-black vertical gradients** like film negative.
- High-contrast **white-at-varying-opacity text** (`#fff` / `#fffc` / `#fff9`).
- **One energetic gradient family** used with surgical restraint: `linear-gradient(135deg,#1cb7ff,#2ff58b)` (cyan → mint) for CTAs, the floating action button, and the *active* nav item (rendered as gradient text through `background-clip:text`).
- A separate **"premium" register**: champagne gold (`#faedc8 → #f7df97`) with deep espresso-browns (`#603a21 → #3e2012`) for the VIP/member tier. Functionally: **gold = premium, cyan/green = action, grey = everything else.**

**Spacing, density & priority.** Dense but disciplined. Horizontal rows of portrait posters with ~1rem gaps, sections stacked with generous vertical rhythm, every row fronted by a bold header. Priorities are aggressive: **poster > title > metadata**. Genre/year compress into tiny muted text (`#fff9`) so a glance can scan hundreds of films. The aesthetic is *controlled density for scanning* — not minimalism.

## 2. Color Palette

Design tokens observed directly in the compiled CSS (sorted roughly by frequency):

| Token (HEX) | Role in the system |
|---|---|
| `#101114` | **Page background** — warm near-black charcoal; `#101114cc` on the floating search panel |
| `#050c1d → #030711` | Section background gradient — deep **blue-black** (`linear-gradient(180deg,#050c1d,#030711)`) |
| `#fff` / `#fffc` / `#fff9` | **Foreground text at 100% / 80% / 60% white opacity** |
| `#fff3` | Translucent **white ≈20%** — search-box fill, chip backgrounds, ghost fills |
| `#ffffff1a` / `#ffffff0f` / `#ffffff14` | **Active/hover state** surfaces (white 10–12%) |
| `#1cb7ff` / `#2166e5` | **Brand cyan** (+ darker blue) |
| `#2ff58b` | **Brand mint green** — forms the famous cyan→mint gradient |
| `#1dd171` / `#10a84d` | Confirmation green / **matched search-keyword** highlight |
| `#faedc8` / `#f7df97` / `#fbeabb` | **Premium champagne-gold** (VIP), `linear-gradient(157deg,#faedc8,#f7df97)` |
| `#603a21` / `#703f23` / `#3e2012` / `#895732` | Premium **espresso-brown** backgrounds beneath gold |
| `#2e3157` → `#212249` | Member-card **indigo-plum** gradient |
| `#2b2e39` (rgb 43 46 57) | Image placeholder / lazy-load canvas behind posters |
| `#f53ab9` / `#07b84e` | Transient scan-line accents (QR/member perks) |
| `#d6ae7a4d` | 30–40% gold wash for premium overlays |

**How color builds hierarchy & CTA:**
- **Backgrounds:** matte near-black with blue-black sectional tinting — never pure `#000`, so posters don't float.
- **Text:** white-opacity steps replace "grey #777": `#fff` headlines, `#fffc` body/nav, `#fff9` metadata. Hierarchy by **luminosity**, not hue.
- **Action:** the cyan→mint gradient is effectively the *only* loud action color → it reads instantly as "click me".
- **Premium:** champagne gold is reserved for the member story — every appearance of gold signals elevation.

## 3. Typography

**Families** (from CSS `font-family` declarations): **Roboto** (primary UI), **Roboto Condensed** (compressed display), **Mulish** (secondary/alt panels), **TransSans** (legacy custom brand face). The system is **utilitarian sans with a compressed "Condensed" register** for display — tall, tight, cinematic "poster billing", not editorial serif.

**Hierarchy as observed:**
- **Nav / section leaders:** Roboto, 1rem titles, `font-weight:700` active — the active item renders as **gradient text** (`linear-gradient(91deg,#1cb7ff 1.22%,#2ff58b 50.24%)` + `background-clip:text; color:transparent`). Emphasis by weight + gradient, not size.
- **Search / body:** 0.875rem Roboto @ 400 — small, calm, scannable.
- **Metadata (year · genre · rating):** tiny muted `#fff9` "caption" text under titles.
- **Case logic:** uppercase for compact category pills; weight is the emphasis switch; gradients mark the *active/primary* state only.

**Takeaway for the transfer:** MovieBoxHD's typography is *systemic* — few sizes, weight-driven emphasis, one gradient trick reserved for the active/CTA state, and metadata handled via white-opacity instead of grey.

## 4. Layout & Grid System

- **Container model:** full-width / fluid. Content rows span the viewport; there is no visible max-width gutter around rows (unlike SabiFlix's `max-w-7xl`). Immersion is the point.
- **Primary content structure:** **horizontal scrollable rows** of portrait cards with arrow controls, plus responsive multi-column promo grids. Grid columns are computed by viewport width in CSS — observed media queries: `≥1101px → width:calc(50% - 1rem)` (2-up), `≥1301px → width:calc(33.33% - 1rem)` (3-up).
- **Gap discipline:** ~1rem (16px) horizontal gap between cards in all rows (`margin-inline-end` / gap of 1rem) — enough separation for at-a-glance scanning without visual noise.
- **Vertical rhythm:** sections stack with large vertical padding; each section header sits outside the scroll row (title + "More" affordance + scroll arrows on the header line).
- **Density:** high. Cards carry only poster + 1–2 line title + single metadata line; the header carries search; the footer is a compressed legal strip. **Mobile:** same rows, `w-[42vw]`-style snap scrolling.

## 5. UI Components & Patterns

**Hero / banner.**
- Full-bleed, edge-to-edge imagery with **layered gradient scrims** — e.g. `linear-gradient(180deg,transparent,#101114 97.76%)` (bottom fade into page) and `linear-gradient(270deg,#10111433,#10111400 25%,#10111400 50%,#10111466 75%,#101114)` (sides) — plus a blurred, scaled background layer (`filter:blur(1.25rem); transform:scale(1.1)`) behind the object. This is the classic "video-player backdrop" pattern: **blurred backdrop + sharp foreground + graded scrims**.
- Info overlay sits bottom-left, in the dark zone of the scrim: title, meta line, then a row of action buttons (play / download-style pills).

**Content cards.**
- Portrait 2:3 posters, `object-fit:cover`, lazy-load canvas `#2b2e39`, small radii (`.25rem` for thumbs, up to `.5rem–1rem` on tiles).
- Title (1–2 lines) + tiny metadata (`year · genre`) below the poster in muted white.
- **Hover behavior is restrained:** image scale-inside-container, an elevated tile (active background `#ffffff1a`, radius `.5rem`), and the CTA reveal pattern — overlay action appears (play/watch pill) rather than the entire card morphing. No gratuitous zoom *of the card*, only the media.

**Buttons & CTAs.**
- **Primary:** pill-shaped (radii up to `62rem`), gradient-filled (`#1cb7ff → #2ff58b`), white/dark text depending on legibility — high-consistency "one big energy gradient".
- **Secondary/ghost:** translucent white fills — `#fff3` (≈20% white) with `.5rem–1rem` radius; hover raises fill opacity (`#ffffff14→26`-family).
- **Icon-only controls:** circular translucent rings for carousel arrows / back buttons, echoing `.chat-float-btn` (`border-radius:624.9375rem`).
- Hover semantic: **brightness/opacity lift + slight scale on the active control** (`:active{transform:scale(.9)}` on the FAB).

**Header / navigation.**
- **Sticky translucent dark bar** — the floating search panel is `background-color:rgb(16 17 20/…)` with `backdrop-filter:blur(.375rem–.75rem)` and white-20 `#fff3` search inputs (radius `.5rem`).
- Logo = compact brand mark + wordmark; genre/category nav as **list items** (`width:12.5rem`, radius `.5rem`, hover/active fill `#ffffff1a`, active title `font-weight:700` + gradient text).
- **Search is central:** right-aligned collapsible/search panel, results in an absolute dropdown (`radius:.5rem`, live keyword matching tinted `#10a84d` green).
- Language selector + auth entry on the right (translucent chips).

## 6. Imagery & Iconography

- **Imagery:** edge-to-edge, `object-fit:cover`, rounded corners kept small (`.25rem–.5rem` thumbnails, `.5rem–1rem` tiles). Heavy reliance on **gradient scrims** over imagery rather than shadows; where shadows exist they are diffuse (`0 .625rem .9375rem -.1875rem rgba(0,0,0,.1)`). Poster integrity always preserved — the UI grades *around* the art.
- **Iconography:** compact solid/line icon glyphs (widths ~1rem–1.25rem) rendered as inline images/SVGs inside translucent chips — functional, never decorative. Icons always accompany labels in nav (icon + text), and standalone icon buttons are offered in both filled (gradient) and ghost (white/10 ring) forms.

---

# Phase 2 — Applying the Design Language to SabiFlix

## 1. Strategy: Preserve · Adapt · Enhance

**Preserve (SabiFlix's non-negotiables).**
1. **The identity line** — "African stories, worth your full attention. Curated by humans, not algorithms." It must stay text-led, first-priority, and readable in seconds.
2. **Calm & trust** — generous spacing, muted gold, no autoplay traps, no "one more thing". SabiFlix's *vibe* is a quiet cinema, not a warehouse.
3. **Editorial typography** — the Bricolage Grotesque display + Inter UI pairing is the brand voice. It stays.
4. **Warm gold accent** — the existing gold (`#D4A857`-family) is the identity color for "premium / curated". It stays as the *semantic anchor*.
5. **Text-led sections** — "Curator's Picks", "Nollywood Essentials", "True Stories", "Latest Additions" are editorial collections, each with a human description. Keep the descriptions.

**Adapt (what we take from MovieBoxHD).**
- **The cinematic canvas** — swap the indigo-tinted background for a *warm obsidian* near-black (`#101114`-class) with subtle blue-black sectional grading. MovieBoxHD's single biggest mood-shifter, fully transferable.
- **White-opacity luminosity hierarchy for text** (`#fff / #fffc / #fff9`) instead of flat greys — punchier contrast on dark.
- **One disciplined energetic gradient for ALL primary actions** — MovieBoxHD uses cyan→mint; SabiFlix uses its own **gold → amber → bronze "Savanna Ember"** (same psychology: *the only loud color is the "do this" color*).
- **Backdrop-plus-scrim hero treatment** — blurred poster field + sharp key art + graded scrims (MovieBoxHD's player backdrop), softened in opacity for calm.
- **Restrained card hover** — media scales *inside* the poster frame, the tile lifts slightly, a Watch pill reveals. No card morphing.
- **Glass chrome** — `backdrop-blur` header / search / nav surfaces with translucent white fills (`#fff3`-family) instead of solid panels.
- **Gradient-text active nav item** — MovieBoxHD's active-nav treatment, re-tinted into "Savanna Ember".

**Enhance (new premium moves, SabiFlix-specific).**
1. **"Ember" primary CTA** — `gold → amber → bronze` gradient pill with a soft glow ring; the literal translation of MovieBoxHD's cyan→mint energy button, re-colored for the African cinema story (golden hour, savanna, sunset).
2. **Curator grade-line on every card** — tiny uppercase metadata (`FEATURE · 2023 · NIGERIA`) in white/60 plus a **gold "Curator's Mark"** for personally-screened films and a **teal "Reviewed"** dot for verified quality. The *curated-by-humans* signal made visual.
3. **Hero as a film poster** — MovieBoxHD's backdrop stack (blur field + key art + `linear-gradient(270deg…)` edge scrims + bottom fade) but with the **left-aligned, headline-first** editorial arrangement intact.
4. **Section leaders** — every row header gets a small gold index number (`No. 01 …`) + uppercase kicker: MovieBoxHD row-velocity with SabiFlix editorial pacing.
5. **Glass trust-chips** — "Every film reviewed by a moderator" becomes a translucent glass chip with a teal check, echoing MovieBoxHD's `#fff3` chips.

## 2. Proposed Color Palette for SabiFlix

Replaces the current `oklch(0.19 0.035 285)`-family in `app/globals.css`. OKLCH values computed from the target sRGB hex values.

### Neutral base — "Obsidian Cinema"
| Token | HEX | OKLCH | Replaces |
|---|---|---|---|
| `--background` | `#0A0B0F` | `oklch(0.150 0.009 274)` | current `#1A1A2E` indigo |
| `--card` | `#12141C` | `oklch(0.193 0.017 274)` | current card tint |
| `--secondary` / `--muted` | `#1B1E28` | `oklch(0.237 0.020 272)` | hover / lift surfaces |
| `--border` | `#262A36` | `oklch(0.286 0.023 271)` | current indigo border |
| `--popover` | `#101218` | `oklch(0.16 0.011 274)` | dropdowns / sheets |

Why: MovieBoxHD proves a near-black canvas (`#101114`) outperforms tinted purple-black for cinematic mood — posters glow and text gains contrast. We keep a fractional blue cast so it reads "curated", not "hollow".

### Text — the luminance ladder (MovieBoxHD's `#fff / #fffc / #fff9` trick)
| Token | HEX | OKLCH | Use |
|---|---|---|---|
| `--foreground` | `#F4F0E6` | `oklch(0.955 0.014 89)` | headlines, active elements |
| `--muted-foreground` | `#A29B8E` | `oklch(0.692 0.020 83)` | descriptions, metadata base |
| *(transparent tiers)* | `#F4F0E680` / `#F4F0E64D` | — | access as `text-foreground/60`, `text-foreground/30` |

### Accent — "Savanna Ember" gradient (the product envelope)
| Token | HEX | OKLCH | Role |
|---|---|---|---|
| `--primary` | `#E2AF4C` | `oklch(0.783 0.129 81)` | buttons & active states — one step brighter than today's `#D4A857` for contrast on near-black |
| `--primary-foreground` | `#14150E` | `oklch(0.19 0.01 90)` | text *on* gold — near-black, MovieBoxHD-style |
| ember-1 | `#F0C987` | `oklch(0.855 0.095 80)` | champagne (gradient light stop) |
| ember-2 | `#D99232` | `oklch(0.715 0.137 70)` | amber (mid) |
| ember-3 | `#B0661D` | `oklch(0.582 0.125 59)` | bronze (deep stop) |

**Signature CTA gradient:** `linear-gradient(100deg, #F0C987 0%, #D99232 55%, #B0661D 100%)` — the SabiFlix translation of MovieBoxHD's `linear-gradient(135deg, #1cb7ff, #2ff58b)`.

### Functional accents (roles borrowed from MovieBoxHD, re-colored)
| Token | HEX | OKLCH | MovieBoxHD analog |
|---|---|---|---|
| `--ring` | `#E2AF4C` | `oklch(0.783 0.129 81)` | gold focus rings ↔ brand-cyan role |
| Verified teal | `#1F8A70` | `oklch(0.568 0.102 172)` | ↔ `#10a84d` "matched / positive" green |
| Destructive | keep | `oklch(0.6 0.22 25)` | unchanged |
| Scrim layers | `#0A0B0F` @ 33 / 66 / 90% | — | ↔ `#10111433 / 66 / cc` |
| Poster placeholder | `#1C1E24` | `oklch(0.22 0.012 271)` | ↔ `#2b2e39` |

**Hierarchy rule of thumb (identical to MovieBoxHD):** backgrounds = obsidian only; text = white-luminance ladder; **the only saturated elements on the page are Ember (actions / premium) and teal (verification)** — reserved, so they always mean something.

## 3. Typography System

**Keep the pairing; re-grade the roles.**

| Register | Family / weight / size | Behavior |
|---|---|---|
| Display / Hero | **Bricolage Grotesque** 600–700, `clamp(2.75rem, 6vw, 5.5rem)` | tight `tracking-[-0.02em]`, `leading-[1.02]`, `text-balance`. MovieBoxHD's compressed-velocity energy, editorial voice. |
| Section headers | Bricolage 600, `1.25–1.5rem` | lead with a gold index number (`No. 01`) in `tabular-nums`, tinted `text-primary`. |
| Kicker / eyebrow | Inter 600, `0.75rem`, **uppercase**, `tracking-[0.18em]` | the "CURATED BY HUMANS, NOT ALGORITHMS" treatment — MovieBoxHD uppercase-pill logic. |
| Body / descriptions | Inter 400, `0.9375–1.125rem` | `leading-relaxed`, `text-pretty`, `text-muted-foreground`. |
| Card titles | Bricolage 500–600, `0.9375rem` | `truncate` (or 2-line clamp for large posters). |
| **Metadata** | Inter 400, `0.6875rem` (11px), **uppercase**, `tracking-[0.14em]`, `tabular-nums` | `FEATURE · 2023 · NIGERIA` — MovieBoxHD's tiny `#fff9` caption re-imagined; uppercase keeps 11px legible on dark. |
| Buttons / nav | Inter 500–600, `0.875rem` | weight carries emphasis; the Ember gradient marks the active/primary state only. |

**Why this is a faithful transfer:** MovieBoxHD's typography is systemic (few sizes, weight-driven emphasis, one gradient moment). SabiFlix already owns the right two foundries; the upgrade is discipline — uppercase micro-metadata, a loud kicker register, tighter display leading, and reserving the gradient for the single active/primary state.

## 4. Layout & Component Redesign Recommendations

### Hero section ("African stories, worth your full attention")
Rebuild the hero as MovieBoxHD-style cinematic backdrop, kept calm:
1. **Layers (bottom → top):** blurred `hero-cinema` field (`blur-2xl scale-110`) → sharp key art at `opacity-30–45` → MovieBoxHD edge scrims (`bg-gradient-to-r from-background via-background/35 to-transparent`) → vertical grade (`bg-gradient-to-t from-background`) → **left-aligned** content block.
2. **Eyebrow kicker** — uppercase glass pill (`bg-white/5 backdrop-blur border border-white/10`) with a gold spark icon: "CURATED BY HUMANS, NOT ALGORITHMS".
3. **Display headline** — Bricolage 600, `clamp(2.75rem…5.5rem)`, ivory `--foreground`.
4. **Trust line** — the moderator note as a glass chip with **teal check** (`Verified teal #1F8A70`) instead of current gold shield.
5. **CTAs** — one Ember gradient pill ("Browse the catalog", `Play` icon) + one translucent glass outline ("Create free account"). MovieBoxHD energy, SabiFlix pacing: `py-20 sm:py-28`, `max-w-7xl` container retained.

The tagline stays the hero's single loudest element — contrast comes from the obsidian canvas, not from animation.

### Content showcase (Curator's Picks / Nollywood Essentials / True Stories / Latest Additions)
- **Rows:** keep the horizontal snap-scroll `MovieCarousel` (MovieBoxHD row model) with `snap-x snap-mandatory scroll-smooth` + glass arrow buttons (`bg-white/5 border-white/10 rounded-full backdrop-blur`).
- **Section leaders:** gold index number + title + human description; right-edge "View all" as muted ghost link (no loud secondary CTA — hierarchy stays on cards).
- **Cards:** MovieBoxHD hover physics — media scales inside its frame (`group-hover:scale-110 duration-500`), tile lifts (`-translate-y-1.5`), border warms to `primary/40`, a soft ember glow shadow appears, and a **Watch pill** (MovieBoxHD overlay-action pattern) fades in over the poster's bottom scrim. The card itself never reflows.
- **Metadata:** lowercase → uppercase micro-labels (`FEATURE · 2023 · NIGERIA`), white/60, `tabular-nums`, keeping rows scannable at a glance.

### Curatorial identity (the "curated by humans" signal)
- **Curator's Mark:** small gold `BadgeCheck` on cards whose films passed moderator screening (add a `curated: true` flag to the `Movie` model). Tooltip: "Screened & graded by a SabiFlix moderator."
- **Reviewed dot:** 6px teal dot next to metadata for verified prints ("audio & image quality checked").
- **Trust strip:** under the hero or above Latest Additions — a hairline-separated strip of three glass chips: *Every film reviewed by a moderator · No autoplay traps · Changed by humans, not algorithms*.
- **"No. 0X" indexes** on section headers echo an editorial catalog/magazine feel — the *human catalogue* made visible.

## 5. Actionable Implementation Snippets

All classes assume Tailwind v4 (arbitrary values OK). Tailwind v4's canonical gradient utility is `bg-linear-to-*`; `bg-gradient-to-*` still works as a deprecated alias — I use `bg-gradient-to-r` below to match the existing codebase and the prompt's convention.

### 5.1 Design tokens — replace the `:root` block in `app/globals.css`

```css
@theme inline {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-bricolage), Georgia, serif;
  /* radii, sidebar, charts unchanged */
}

:root {
  color-scheme: dark;
  /* ——— Obsidian Cinema base ——— */
  --background: oklch(0.15 0.009 274);   /* #0A0B0F */
  --foreground: oklch(0.955 0.014 89);   /* #F4F0E6 warm ivory */
  --card: oklch(0.193 0.017 274);        /* #12141C */
  --card-foreground: oklch(0.955 0.014 89);
  --popover: oklch(0.16 0.011 274);
  --popover-foreground: oklch(0.955 0.014 89);
  /* ——— Savanna Ember accent ——— */
  --primary: oklch(0.783 0.129 81);      /* #E2AF4C */
  --primary-foreground: oklch(0.19 0.01 90);
  --secondary: oklch(0.237 0.02 272);    /* #1B1E28 */
  --secondary-foreground: oklch(0.955 0.014 89);
  --muted: oklch(0.237 0.02 272);
  --muted-foreground: oklch(0.692 0.02 83); /* #A29B8E */
  --accent: oklch(0.237 0.02 272);
  --accent-foreground: oklch(0.955 0.014 89);
  --destructive: oklch(0.6 0.22 25);
  --border: oklch(0.286 0.023 271);      /* #262A36 */
  --input: oklch(0.286 0.023 271);
  --ring: oklch(0.783 0.129 81);
  /* ——— ember gradient stops (used via a utility below) ——— */
  --ember-1: oklch(0.855 0.095 80);      /* #F0C987 */
  --ember-2: oklch(0.715 0.137 70);      /* #D99232 */
  --ember-3: oklch(0.582 0.125 59);      /* #B0661D */
  --verified: oklch(0.568 0.102 172);    /* #1F8A70 */
  --radius: 0.75rem;
}

@layer utilities {
  .text-ember-gradient {
    background: linear-gradient(100deg, var(--ember-1), var(--ember-2) 55%, var(--ember-3));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .bg-ember {
    background: linear-gradient(100deg, var(--ember-1), var(--ember-2) 55%, var(--ember-3));
  }
}
```

Also update `app/layout.tsx` `themeColor` to `#0A0B0F`.

### 5.2 Primary content card — restyle `components/movie-card.tsx`

The "restrained MovieBoxHD hover" pattern: media zooms inside its frame, the tile lifts, the border warms, and a **Watch pill** reveals over an always-on bottom scrim.

```tsx
// Key class strings for the redesigned MovieCard
<Link
  href={`/movie/${movie.id}`}
  className={cn(
    'group relative flex flex-col overflow-hidden rounded-xl',
    'border border-white/[0.06] bg-gradient-to-b from-card to-background',
    'outline-none transition-all duration-300',
    'hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_20px_50px_-16px_rgba(0,0,0,0.85),0_0_0_1px_rgba(240,201,135,0.12)]',
    'focus-visible:ring-3 focus-visible:ring-ring/50',
    className,
  )}
>
  {/* Poster frame — media scales INSIDE, card never reflows */}
  <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#1C1E24]">
    <Image
      src={movie.posterUrl || '/placeholder.svg'}
      alt={`Poster for ${movie.title}`}
      fill
      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
      priority={priority}
      className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
    />
    {/* always-on bottom scrim (MovieBoxHD fade: transparent → #101114 at 97%) */}
    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0F]/95 via-[#0A0B0F]/10 to-transparent" />
    {/* glass category badge (MovieBoxHD #fff3 chip) */}
    <Badge
      variant="secondary"
      className="absolute left-2 top-2 border border-white/10 bg-white/5 text-[0.625rem] uppercase tracking-[0.14em] text-foreground/90 backdrop-blur-md"
    >
      {categoryLabel[movie.category]}
    </Badge>
    {/* MovieBoxHD watch-pill overlay, revealed on hover */}
    <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-center pb-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ember px-3.5 py-1.5 text-xs font-semibold text-[#14150E] shadow-[0_0_20px_rgba(240,201,135,0.35)]">
        <Play className="size-3.5 fill-current" />
        Watch
      </span>
    </div>
  </div>
  {/* Curator grade-line: uppercase micro metadata (MovieBoxHD white/60 caption) */}
  <div className="flex flex-1 flex-col gap-1 p-3">
    <h3 className="truncate font-serif font-semibold leading-tight" title={movie.title}>
      {movie.title}
    </h3>
    <p className="inline-flex items-center gap-1 pt-[2px] text-[0.6875rem] uppercase tracking-[0.14em] tabular-nums text-foreground/50">
      <BadgeCheck className="size-3 text-primary/90" aria-label="Screened by a moderator" />
      {categoryLabel[movie.category]} · {movie.year} · {movie.country}
    </p>
  </div>
</Link>
```

Import `BadgeCheck` from `lucide-react`. The `bg-ember` utility comes from 5.1 (`@layer utilities`), and `text-foreground/50` is the luminance ladder's third tier.

### 5.3 Primary call-to-action button — Ember variant in `components/ui/button.tsx`

Add a `premium` variant to the existing `buttonVariants` (keeps all sizes/animations intact):

```tsx
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 …[&_svg]:size-4",
  {
    variants: {
      variant: {
        // … existing variants (default, outline, secondary, ghost, destructive, link) …
        premium: [
          // MovieBoxHD "one loud energy gradient", re-colored as Savanna Ember:
          "bg-ember text-[#14150E]",
          "border border-white/15",
          "shadow-[0_0_0_1px_rgba(240,201,135,0.15),0_8px_28px_-8px_rgba(217,146,50,0.55)]",
          "hover:brightness-110 hover:shadow-[0_0_0_1px_rgba(240,201,135,0.35),0_10px_34px_-6px_rgba(217,146,50,0.7)]",
          "focus-visible:ring-ember-1/60",
        ].join(" "),
      },
      // … sizes unchanged …
    },
  }
)
```

Or, the plain Tailwind recipe for inline use (the exact class string requested):

```
"bg-gradient-to-r from-[#F0C987] via-[#D99232] to-[#B0661D] text-[#14150E] font-semibold rounded-full px-6 py-2.5 border border-white/15 shadow-[0_8px_28px_-8px_rgba(217,146,50,0.55)] transition-all duration-300 hover:brightness-110"
```

**Hero usage in `app/page.tsx`:**

```tsx
<Button size="lg" variant="premium" render={<Link href="/catalog" />}>
  <Play className="fill-current" data-icon="inline-start" />
  Browse the catalog
</Button>
<Button
  size="lg"
  variant="outline"
  render={<Link href="/sign-up" />}
  className="rounded-full border-white/15 bg-white/[0.04] backdrop-blur-md hover:border-white/30 hover:bg-white/10"
>
  Create free account
  <ArrowRight data-icon="inline-end" />
</Button>
```

### 5.4 Main navigation header — restyle `components/site-header.tsx`

MovieBoxHD's glass chrome (translucent dark + `backdrop-blur`, white-20 search, gradient-text active item) adapted to SabiFlix:

```tsx
<header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A0B0F]/70 backdrop-blur-xl">
  <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
    {/* Logo — ember mark on obsidian */}
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <span className="flex size-9 items-center justify-center rounded-lg bg-ember text-[#14150E] shadow-[0_4px_16px_-4px_rgba(217,146,50,0.6)]">
        <Clapperboard className="size-5" />
      </span>
      <span className="font-serif text-xl font-bold tracking-tight">
        Sabi<span className="text-ember-gradient">Flix</span>
      </span>
    </Link>

    {/* Nav — glass chips; active item = ember gradient text (MovieBoxHD pattern) */}
    <nav className="hidden items-center gap-1 md:flex">
      <Button variant="ghost" size="sm" render={<Link href="/catalog" />}
        className="rounded-full text-sm text-foreground/70 hover:text-foreground hover:bg-white/5">
        Catalog
      </Button>
      {/* active state example */}
      <Button variant="ghost" size="sm" render={<Link href="/" />}
        className="rounded-full text-ember-gradient font-semibold hover:bg-white/5">
        Home
      </Button>
    </nav>

    {/* Search — MovieBoxHD white-20 field, now pill-shaped */}
    <form onSubmit={onSearch} className="ml-auto w-full max-w-xs sm:max-w-sm">
      <InputGroup>
        <InputGroupInput
          type="search"
          placeholder="Search films or actors..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search films or actors"
          className="rounded-full border-white/10 bg-white/[0.05] backdrop-blur-md placeholder:text-foreground/40 focus-visible:border-primary/50"
        />
        <InputGroupAddon className="text-foreground/60">
          <Search />
        </InputGroupAddon>
      </InputGroup>
    </form>

    {/* Auth — ghost + premium (see 5.3) */}
    {isSignedIn ? (/* unchanged account dropdown */) : (
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}
          className="hidden rounded-full hover:bg-white/5 sm:inline-flex">
          Log in
        </Button>
        <Button size="sm" variant="premium" render={<Link href="/sign-up" />}>
          Sign up
        </Button>
      </div>
    )}
  </div>
</header>
```

(The account dropdown, scroll behavior, and mobile handling stay as-is.)

### 5.5 Hero layer recipe (for `app/page.tsx` — full-width yet calm)

```tsx
<section className="relative overflow-hidden border-b border-white/[0.06]">
  {/* Layer 1 — blurred field (MovieBoxHD player-backdrop) */}
  <Image src="/hero-cinema.png" alt="" fill priority sizes="100vw"
    className="scale-110 object-cover opacity-60 blur-2xl"
  />
  {/* Layer 2 — key art */}
  <Image src="/hero-cinema.png" alt="" fill priority sizes="100vw"
    className="object-cover opacity-40"
  />
  {/* Layer 3 — MovieBoxHD edge + bottom scrims */}
  <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
  {/* Content — kicker pill → headline → trust chips → CTAs */}
  <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-foreground/90 backdrop-blur-md">
      <Sparkles className="size-3.5 text-primary" />
      Curated by humans, not algorithms
    </span>
    <h1 className="max-w-3xl font-serif text-4xl font-bold leading-[1.02] tracking-tight text-balance sm:text-5xl lg:text-6xl">
      African stories, worth your <span className="text-ember-gradient">full attention.</span>
    </h1>
    <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
      Stream the best of Nollywood, African cinema, short films, and documentaries
      in a calm, distraction-free player. No autoplay traps. No endless scroll.
    </p>
    {/* CTA row — premium + glass outline, see 5.3 */}
    {/* Trust chip */}
    <span className="inline-flex items-center gap-2 text-sm text-foreground/60">
      <BadgeCheck className="size-4 text-[#1F8A70]" />
      Every film reviewed by a moderator for quality.
    </span>
  </div>
</section>
```

## 6. Implementation Checklist & Success Criteria

**Ordered implementation plan (each step is independently shippable):**
1. **Tokens** (5.1) — replace `:root` in `app/globals.css`, add `.bg-ember` / `.text-ember-gradient` utilities, update `themeColor` in `app/layout.tsx`. *Visual impact: immediate, zero layout risk.*
2. **Button** (5.3) — add the `premium` variant; swap hero CTAs and "Sign up" to `premium`.
3. **Card** (5.2) — restyle `components/movie-card.tsx` (hover physics + uppercase grade-line + Curator's Mark). Add `curated?: boolean` to the `Movie` type when ready.
4. **Header** (5.4) — glass chrome + active-nav ember text.
5. **Hero** (5.5) — layered backdrop + kicker pill + trust chip.
6. **Section leaders** — gold index numbers (`No. 01`) in `movie-carousel.tsx` + "Latest Additions".

**Acceptance criteria (the "bridge" is working when):**
- At `0.5s` glance the home page reads as a *premium dark streaming brand* (MovieBoxHD energy) — not a generic tailwind dashboard.
- Yet the H1 tagline remains the most prominent text and zero banners/autoplay/vibration-appeal appear (SabiFlix calm preserved).
- The only loud color on the page is the Ember gradient + teal verification marks (movavi rule: reserved accents = meaning).
- Cards scan instantly: poster → Bricolage title → uppercase `FEATURE · 2023 · NIGERIA` grade-line with Curator's Mark.
- Hover feels premium but restrained: image zooms inside the frame, Watch pill reveals, tile lifts — no reflow, no pop.

## 7. Why This Is a Faithful Bridge (summary)

| MovieBoxHD (source) | SabiFlix (production) |
|---|---|
| Canvas `#101114` + blue-black section grades | Canvas `#0A0B0F` + same scrim language |
| White-opacity text ladder `#fff/#fffc/#fff9` | Ladder `#F4F0E6` / `60%` / `30%` |
| Energy gradient `#1cb7ff→#2ff58b` | Energy gradient "Savanna Ember" `#F0C987→#D99232→#B0661D` |
| Glass search `#fff3` + `backdrop-blur` | Glass search `bg-white/[0.05]` + `backdrop-blur-md` |
| Gradient-text active nav | `text-ember-gradient` active nav |
| Watch-pill overlay on hover | Ember Watch-pill overlay on hover |
| Tiny muted metadata captions | Uppercase 11px `FEATURE · 2023 · NIGERIA` grade-lines |
| "Premium = champagne gold" register | Curator's Mark = gold, Verified = teal |
| Full-bleed backdrop + graded scrims | Hero backdrop stack, headline-led & calm |

The psychological model is identical — **one dark canvas, one reserved energy gradient, luminance-driven text hierarchy, restrained media-hover** — but every decision has been re-tinted through SabiFlix's *human-curated, calm, African cinema* identity. The result is a sabiflix that finally looks like the film you'd put on, not the app you'd scroll past.

---

*Sources: movieboxhd.net compiled CSS (head.C7jlKYIu.css, NavPannel.CjtPfox3.css, allImg.CIeYDof6.css, container.BAzdWymy.css, pcFooter.EnSeafJb.css, index.DDFW-9I5.css, entry.Bk2k1Zv0.css, etc.) · sabiflix.vercel.app HTML · local SabiFlix source (`app/globals.css`, `app/page.tsx`, `components/movie-card.tsx`, `components/site-header.tsx`, `components/movie-carousel.tsx`).*