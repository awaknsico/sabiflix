/**
 * SabiFlix brand icon generator — rasterizes the "woven motion" symbol to PNG
 * with zero dependencies (pure Node: zlib + hand-rolled PNG encoder).
 *
 * Outputs:
 *   public/apple-icon.png       180×180 — charcoal rounded tile + symbol
 *   public/icon-dark-32x32.png  32×32   — symbol on transparent
 *   public/icon-light-32x32.png 32×32   — symbol on transparent
 *
 * Run: node scripts/generate-icons.mjs
 *
 * The geometry mirrors components/brand/sabiflix-logo.tsx and public/icon.svg:
 * two organic petals (cubic béziers) + a film ribbon rotated -33° with cream
 * underlay and sprocket dashes. Colors: orange #F2921D, charcoal #2B2A27,
 * cream #F5F1EA.
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/* ---------------- PNG encoder ---------------- */

const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------- Brand geometry (100×100 symbol space) ---------------- */

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]
const ORANGE = hex('#F2921D')
const DARK = hex('#2B2A27')
const CREAM = hex('#F5F1EA')
const DASH = hex('#FAF7F1')

// Flatten the petal's four cubic béziers into a polygon.
const petal = []
function pushCubic(p0, c1, c2, p1, steps = 24) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    petal.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
    ])
  }
}
const SEGS = [
  [[16, 50], [15, 66], [26, 82], [44, 85.5]],
  [[44, 85.5], [61, 89], [76, 81], [79, 68]],
  [[79, 68], [81, 58], [72, 52], [60, 50.5]],
  [[60, 50.5], [46, 49], [18, 36], [16, 50]],
]
for (const [p0, c1, c2, p1] of SEGS) pushCubic(p0, c1, c2, p1)

function inPetal(x, y) {
  let inside = false
  for (let i = 0, j = petal.length - 1; i < petal.length; j = i++) {
    const [xi, yi] = petal[i]
    const [xj, yj] = petal[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
/** Top petal = the same shape rotated 180° about (50,50). */
function inTopPetal(x, y) {
  return inPetal(100 - x, 100 - y)
}

/* ---------------- Renderers ---------------- */

const RIBBON_C = Math.cos((33 * Math.PI) / 180) // 0.8387
const RIBBON_S = Math.sin((33 * Math.PI) / 180) // 0.5446
/**
 * Map a final point into the ribbon group's unrotated frame.
 * The group is rotated by -33°, so the inverse is a +33° rotation:
 * [cos -sin; sin +cos] with θ=+33°.
 */
function toRibbonFrame(x, y) {
  const dx = x - 50
  const dy = y - 50
  return [RIBBON_C * dx - RIBBON_S * dy, RIBBON_S * dx + RIBBON_C * dy]
}
/** Rounded rect centered (cx,cy), half sizes (hw,hh), corner radius r. */
function inRoundRect(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r)
  const qy = Math.abs(y - cy) - (hh - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r <= 0
}
function inRotRoundRect(x, y, cx, cy, hw, hh, r) {
  const [gx, gy] = toRibbonFrame(x, y)
  return inRoundRect(gx, gy, cx, cy, hw, hh, r)
}

const DASH_XS = [24, 33.4, 42.8, 52.2, 61.6, 71]

/** Symbol color at a point in 100-space (paint order matches the SVG). */
function symbolColorAt(x, y) {
  for (const dx of DASH_XS) {
    if (inRotRoundRect(x, y, dx + 2, 47.6, 2, 1.3, 0.8)) return DASH
  }
  if (inRotRoundRect(x, y, 50, 50, 32, 5.9, 4.2)) return DARK
  if (inRotRoundRect(x, y, 50, 50, 33.5, 7.4, 5.4)) return CREAM
  if (inPetal(x, y) || inTopPetal(x, y)) return ORANGE
  return null
}

const SS = 3 // supersampling factor for anti-aliasing

function render(size, compose) {
  const px = size * SS
  const acc = new Float64Array(size * size * 4)
  for (let Y = 0; Y < px; Y++) {
    for (let X = 0; X < px; X++) {
      const fx = Math.floor((X + 0.5) / SS)
      const fy = Math.floor((Y + 0.5) / SS)
      const sx = (X + 0.5) / SS - 0.5
      const sy = (Y + 0.5) / SS - 0.5
      const c = compose(sx, sy)
      const oi = (fy * size + fx) * 4
      if (c) {
        acc[oi] += c[0]
        acc[oi + 1] += c[1]
        acc[oi + 2] += c[2]
        acc[oi + 3] += c[3] ?? 255
      }
    }
  }
  const n = SS * SS
  const out = Buffer.alloc(size * size * 4)
  for (let i = 0; i < acc.length; i += 4) {
    out[i] = Math.round(acc[i] / n)
    out[i + 1] = Math.round(acc[i + 1] / n)
    out[i + 2] = Math.round(acc[i + 2] / n)
    out[i + 3] = Math.round(acc[i + 3] / n)
  }
  return out
}

/**
 * Render a symbol sized as `spanFraction` of the canvas.
 * The symbol occupies the full 100×100 box, so scale k = span/100.
 */
function symbolTransform(size, spanFraction) {
  const span = size * spanFraction
  const k = span / 100
  const off = (size - span) / 2
  return (x, y) => [(x - off) / k, (y - off) / k]
}

/** Apple-touch tile: charcoal rounded square + symbol at 60%. */
function renderAppleIcon(size = 180) {
  const radius = size * (40 / 180)
  const toSymbol = symbolTransform(size, 0.6)
  return render(size, (x, y) => {
    const [sx, sy] = toSymbol(x, y)
    const symbol = symbolColorAt(sx, sy)
    if (symbol) return symbol
    if (inRoundRect(x, y, size / 2, size / 2, size / 2, size / 2, radius)) return DARK
    return null
  })
}

/** Bare symbol on transparent (favicon variants). */
function renderSymbolIcon(size = 32) {
  const toSymbol = symbolTransform(size, 0.8)
  return render(size, (x, y) => {
    const [sx, sy] = toSymbol(x, y)
    return symbolColorAt(sx, sy)
  })
}

/* ---------------- Emit ---------------- */

const files = [
  ['public/apple-icon.png', encodePNG(180, 180, renderAppleIcon(180))],
  ['public/icon-dark-32x32.png', encodePNG(32, 32, renderSymbolIcon(32))],
  ['public/icon-light-32x32.png', encodePNG(32, 32, renderSymbolIcon(32))],
]
for (const [rel, buf] of files) {
  writeFileSync(join(root, rel), buf)
  console.log(`wrote ${rel} (${buf.length} bytes)`)
}

