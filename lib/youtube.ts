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
      // and serves thumbnails to anyone — no special headers required.
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

/**
 * Resolve a YouTube URL to full metadata.
 *
 * Throws with a human-readable message when the URL is not a YouTube video.
 * When oEmbed refuses (401/403) the video is not embeddable — we still return
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
    // Network blip — still return best-effort metadata with the ID thumbnail.
  }

  const thumbnailUrl = await pickBestThumbnail(videoId)

  return { videoId, title, authorName, thumbnailUrl, embeddable }
}