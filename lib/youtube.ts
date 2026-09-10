/**
 * YouTube helpers for the "paste a URL, we handle the rest" flow.
 *
 * Everything here is dependency-free: thumbnails come from YouTube's public
 * `i.ytimg.com` image CDN (no API key) and metadata/embeddability comes from
 * the oEmbed endpoint (no quota). The oEmbed request is done server-side via
 * the `/api/youtube/meta` route because oEmbed does not allow browser CORS.
 */

export type ThumbnailQuality =
  | 'maxresdefault'
  | 'sddefault'
  | 'hqdefault'
  | 'mqdefault'
  | 'default'

export interface YouTubeMeta {
  videoId: string
  title: string
  authorName: string
  thumbnailUrl: string
  /** False when YouTube refuses to embed the video (oEmbed returns 401). */
  embeddable: boolean
  /**
   * Full video description (best-effort, server-side).
   * oEmbed does not expose descriptions, so this is scraped from the watch
   * page's `shortDescription` JSON - it may be undefined when the scrape fails.
   */
  description?: string
}

const VIDEO_ID_RE =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{11})/

/** Extract the 11-char video ID from any common YouTube URL form. */
export function parseYouTubeId(input: string): string | null {
  const match = String(input ?? '').trim().match(VIDEO_ID_RE)
  return match ? match[1] : null
}

/** Build a thumbnail URL for a given video + quality tier. */
export function buildThumbnailUrl(videoId: string, quality: ThumbnailQuality): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`
}

/**
 * High-res first, degrading gracefully. maxresdefault only exists for HD
 * uploads; sd/hq/mq always exist, so this chain is the "best available"
 * poster unless a specific one is chosen via the thumbnail picker.
 */
export const THUMBNAIL_QUALITIES: ThumbnailQuality[] = [
  'maxresdefault',
  'sddefault',
  'hqdefault',
  'mqdefault',
  'default',
]

/** The four storyboard frames YouTube auto-generates (25/50/75/100% marks). */
export function buildFrameCandidates(videoId: string): string[] {
  return [0, 1, 2, 3].map((n) => `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${n}.jpg`)
}

async function headExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(4000),
      // i.ytimg.com ignores a browser-style referrer from an unknown origin
      // and serves thumbnails to anyone - no special headers required.
    })
    return res.ok
  } catch {
    return false
  }
}

/** Probe the quality ladder and return the largest thumbnail that exists. */
export async function pickBestThumbnail(videoId: string): Promise<string> {
  for (const quality of THUMBNAIL_QUALITIES) {
    const url = buildThumbnailUrl(videoId, quality)
    if (await headExists(url)) return url
  }
  return buildThumbnailUrl(videoId, 'hqdefault')
}

const HTML_ENTITY_RE = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
  nbsp: ' ', ndash: '-', mdash: '-', hellip: '...',
}

/**
 * The watch-page scrape is a plain HTTP GET, so present a normal browser -
 * some egress networks (datacenter IPs, CDNs) get refused otherwise.
 */
const YT_WATCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

/** Minimal HTML-entity decoder for the `<meta name="description">` fallback. */
function decodeHtmlEntities(input: string): string {
  return input.replace(HTML_ENTITY_RE, (full, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1]?.toLowerCase() === 'x'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : full
    }
    return NAMED_HTML_ENTITIES[entity] ?? full
  })
}

/**
 * Pull the full video description from the watch page. Best-effort.
 *
 * Primary source: the InnerTube `/player` endpoint (the JSON API behind
 * YouTube's web client - no API key needed). It returns
 * `videoDetails.shortDescription`, the untruncated description.
 *
 * Fallback: the watch-page SSR HTML, whose `shortDescription` lives inside the
 * `ytInitialPlayerResponse` JSON; that page is refused (429 -> google `/sorry`)
 * from datacenter egress like Cloudflare Workers, so it only helps when the
 * egress allows it. The `<meta name="description">`/`og:description` tags are
 * the last-resort snippet.
 *
 * Any failure returns undefined so callers can skip it gracefully.
 */
export async function fetchYouTubeDescription(videoId: string): Promise<string | undefined> {
  // 1) InnerTube /player - modern, structured, usually allowed.
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': YT_WATCH_HEADERS['User-Agent'],
        'Accept-Language': YT_WATCH_HEADERS['Accept-Language'],
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: { clientName: 'WEB', clientVersion: '2.20251207.01.00' },
        },
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as {
        videoDetails?: { shortDescription?: string }
      } | null
      const desc = data?.videoDetails?.shortDescription
      if (typeof desc === 'string' && desc.trim()) return desc
    }
  } catch {
    // InnerTube refused - fall through to the watch page.
  }

  // 2) Watch-page SSR HTML scrape (works on egress that YouTube doesn't block).
  try {
    const res = await fetch(
      `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      { signal: AbortSignal.timeout(10000), headers: YT_WATCH_HEADERS },
    )
    if (!res.ok) return undefined
    const html = await res.text()

    const short = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)
    if (short) {
      try {
        const decoded = JSON.parse(`"${short[1]}"`) as unknown
        if (typeof decoded === 'string' && decoded.trim()) return decoded
      } catch {
        // Malformed player JSON - fall through to the meta tags.
      }
    }

    const meta = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
    const og = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
    const fallback = meta?.[1] ?? og?.[1]
    if (fallback) {
      const decodedMeta = decodeHtmlEntities(fallback.trim())
      // Unavailable/unlisted videos fall back to YouTube's generic site blurb -
      // skip that junk so we never surface it as a synopsis.
      if (decodedMeta && !decodedMeta.startsWith('Enjoy the videos and music')) {
        return decodedMeta
      }
    }

    return undefined
  } catch {
    return undefined
  }
}

/**
 * Resolve a YouTube URL to full metadata.
 *
 * Throws with a human-readable message when the URL is not a YouTube video.
 * When oEmbed refuses (401/403) the video is not embeddable - we still return
 * metadata with `embeddable: false` so the UI can explain instead of guessing.
 */
export async function resolveYouTubeMeta(rawUrl: string): Promise<YouTubeMeta> {
  const videoId = parseYouTubeId(rawUrl)
  if (!videoId) {
    throw new Error('We could not find a YouTube video in that URL.')
  }

  let title = 'Untitled film'
  let authorName = 'Unknown channel'
  let embeddable = true

  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data = (await res.json()) as { title?: string; author_name?: string }
      if (data.title) title = data.title
      if (data.author_name) authorName = data.author_name
    } else if (res.status === 401 || res.status === 403) {
      embeddable = false
    }
  } catch {
    // Network blip - still return best-effort metadata with the ID thumbnail.
  }

  // Pull the best thumbnail and the full description in parallel - the watch
  // page and the thumbnail CDN are independent, so the extra request is free.
  const [thumbnailUrl, description] = await Promise.all([
    pickBestThumbnail(videoId),
    fetchYouTubeDescription(videoId),
  ])

  return { videoId, title, authorName, thumbnailUrl, embeddable, description }
}