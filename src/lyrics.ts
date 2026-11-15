import { kvGet, kvSet } from './db'
import type { Track } from './types'

export interface Lyrics { plain: string; synced: string; instrumental: boolean; source: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getLyrics(t: Track): Promise<Lyrics | null> {
  const key = `lyrics:${t.id}`
  const cached = await kvGet<Lyrics | null>(key)
  if (cached) return cached
  const artist = t.artists[0] ?? ''
  const params = new URLSearchParams({
    track_name: t.name, artist_name: artist, album_name: t.album, duration: String(Math.round(t.durationMs / 1000)),
  })
  try {
    let r = await fetch(`https://lrclib.net/api/get?${params}`)
    let j: any = r.ok ? await r.json() : null
    if (!j) {
      r = await fetch(`https://lrclib.net/api/search?${new URLSearchParams({ track_name: t.name, artist_name: artist })}`)
      const list: any[] = r.ok ? await r.json() : []
      j = list.find((x) => x.plainLyrics || x.instrumental) ?? null
    }
    if (!j) return null
    const out: Lyrics = {
      plain: j.plainLyrics ?? '', synced: j.syncedLyrics ?? '', instrumental: !!j.instrumental, source: 'LRCLIB',
    }
    await kvSet(key, out)
    return out
  } catch { return null }
}
