/**
 * UTC time helpers — all timestamps are stored as unix-epoch SECONDS (INTEGER) in D1
 * and as ISO-8601 strings at API boundaries.
 */

export const nowEpoch = (): number => Math.floor(Date.now() / 1000)
export const epochToIso = (e: number): string => new Date(e * 1000).toISOString()
export const isoToEpoch = (s: string): number => Math.floor(new Date(s).getTime() / 1000)

export const DAY = 86400
export const HOUR = 3600
