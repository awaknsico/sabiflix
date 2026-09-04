import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { lookupMovieWithSource } from '@/lib/server-catalog'

export const alt = 'SabiFlix — Curated African Cinema'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const categoryLabel: Record<string, string> = {
  feature: 'Feature',
  short: 'Short',
  documentary: 'Documentary',
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const movie = (await lookupMovieWithSource(id))?.movie

  let posterSrc: string | undefined
  if (movie) {
    try {
      if (/^https?:\/\//.test(movie.posterUrl)) {
        // Auto-fetched YouTube thumbnails live on i.ytimg.com — pull them
        // through so the OG card still shows the film's poster art.
        const res = await fetch(movie.posterUrl, { signal: AbortSignal.timeout(8000) })
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer())
          posterSrc = `data:image/jpeg;base64,${buffer.toString('base64')}`
        }
      } else {
        const buffer = await readFile(join(process.cwd(), 'public', movie.posterUrl))
        posterSrc = `data:image/png;base64,${buffer.toString('base64')}`
      }
    } catch {
      posterSrc = undefined
    }
  }

  const meta = movie
    ? `${categoryLabel[movie.category] ?? movie.category} · ${movie.year} · ${movie.country}`.toUpperCase()
    : 'CURATED BY HUMANS, NOT ALGORITHMS'.toUpperCase()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 56,
          padding: 64,
          backgroundColor: '#0A0B0F',
          backgroundImage:
            'radial-gradient(circle at 15% 15%, rgba(240,201,135,0.10), transparent 45%)',
        }}
      >
        {posterSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc}
            alt=""
            width={400}
            height={400}
            style={{
              borderRadius: 24,
              objectFit: 'cover',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
        ) : (
          <div
            style={{
              width: 400,
              height: 400,
              borderRadius: 24,
              backgroundColor: '#1C1E24',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              letterSpacing: 6,
              color: '#F0C987',
              fontWeight: 700,
            }}
          >
            SABIFLIX · CURATED BY HUMANS
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: (movie?.title.length ?? 12) > 24 ? 54 : 68,
              fontWeight: 700,
              color: '#F4F0E6',
              lineHeight: 1.05,
            }}
          >
            {movie?.title ?? 'African stories, worth your full attention.'}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              letterSpacing: 3,
              color: 'rgba(244,240,230,0.6)',
            }}
          >
            {meta}
          </div>
          {movie?.curationType ? (
            <div style={{ display: 'flex', marginTop: 10 }}>
              <div
                style={{
                  display: 'flex',
                  padding: '10px 22px',
                  borderRadius: 999,
                  border:
                    movie.curationType === 'admin'
                      ? '1px solid rgba(240,201,135,0.4)'
                      : movie.curationType === 'requested'
                        ? '1px solid rgba(28,183,255,0.4)'
                        : '1px solid rgba(47,245,139,0.4)',
                  color:
                    movie.curationType === 'admin'
                      ? '#F0C987'
                      : movie.curationType === 'requested'
                        ? '#1cb7ff'
                        : '#2ff58b',
                  fontSize: 22,
                }}
              >
                {movie.curationType === 'admin'
                  ? 'Curated by a SabiFlix moderator'
                  : movie.curationType === 'requested'
                    ? 'Requested by the community'
                    : 'Submitted by the filmmaker'}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    ),
    size,
  )
}
