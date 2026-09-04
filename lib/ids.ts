/**
 * UUID v7 generator — time-sortable, monotonic, collision-resistant.
 *
 * Format: unix_ts_ms (48 bits) | ver (4) | rand_a (12) | var (2) | rand_b (62)
 * Stored as a 36-char hyphenated string (e.g. "0190c0de-0000-7000-8000-000000000001").
 *
 * D1/SQLite stores these as TEXT primary keys, which gives us:
 *   1. time-ordered sorting via plain string comparison
 *   2. no DB-side sequence to coordinate
 *   3. safe to generate in the browser *and* the edge without collisions
 */

const HEX = '0123456789abcdef'

function hex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0xf]
  return out
}

/** Cryptographically strong random bytes (falls back to Math.random in non-secure contexts). */
function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf)
  } else {
    for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256)
  }
  return buf
}

// Monotonic counter so two IDs generated within the same millisecond still order correctly.
let lastTs = 0
let counter = 0

export function uuid_v7(): string {
  const now = Date.now()
  if (now === lastTs) {
    counter++
  } else {
    lastTs = now
    counter = 0
  }

  // 48-bit timestamp (ms) + 16 bits of counter = 64 bits
  const ts = now * 64 + (counter % 64) // keeps ms precision while folding counter in
  const rand = randomBytes(10) // 80 random bytes

  const buf = new Uint8Array(16)
  // bytes 0-5: big-endian timestamp
  buf[0] = (ts / 2 ** 40) & 0xff
  buf[1] = (ts / 2 ** 32) & 0xff
  buf[2] = (ts / 2 ** 24) & 0xff
  buf[3] = (ts / 2 ** 16) & 0xff
  buf[4] = (ts / 2 ** 8) & 0xff
  buf[5] = ts & 0xff
  // byte 6: version 7 (high nibble) | rand_a high
  buf[6] = 0x70 | (rand[0] & 0x0f)
  // byte 7: rand_a low
  buf[7] = rand[1]
  // byte 8: variant 10xx (high 2 bits) | rand_b
  buf[8] = 0x80 | (rand[2] & 0x3f)
  // bytes 9-15: remaining rand_b
  buf[9] = rand[3]
  buf[10] = rand[4]
  buf[11] = rand[5]
  buf[12] = rand[6]
  buf[13] = rand[7]
  buf[14] = rand[8]
  buf[15] = rand[9]

  const h = hex(buf)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Convenience: create a new ID with a given prefix (for log readability in dev). */
export function newId(_prefix?: string): string {
  return uuid_v7()
}
