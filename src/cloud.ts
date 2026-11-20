import { getAccessToken } from './spotify'
import type { Collection } from './types'

export interface CloudDoc { collections: Collection[]; updatedAt: number }
export type CloudResult =
  | { ok: true; doc: CloudDoc }
  | { ok: false; reason: 'off' | 'error' }
  | { ok: false; reason: 'conflict'; doc: CloudDoc }

async function call(method: 'GET' | 'PUT', body?: unknown): Promise<CloudResult> {
  try {
    const r = await fetch('/api/sync', {
      method,
      headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    // No server function here (local dev answers with the app's HTML) or no storage connected yet: run in local-only mode.
    if (r.status === 404 || r.status === 503 || !(r.headers.get('content-type') ?? '').includes('json')) return { ok: false, reason: 'off' }
    const j = await r.json()
    if (r.status === 409) return { ok: false, reason: 'conflict', doc: j as CloudDoc }
    if (!r.ok) return { ok: false, reason: 'error' }
    return { ok: true, doc: j as CloudDoc }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export const cloudGet = () => call('GET')
export const cloudPut = (collections: Collection[], baseUpdatedAt: number) => call('PUT', { collections, baseUpdatedAt })

const norm = (s: string) => s.trim().toLowerCase()

/** Union of two folder lists, matching folders by name so two devices that each made "Artists" end up with one. */
export function mergeCollections(a: Collection[], b: Collection[]): Collection[] {
  const out = a.map((c) => ({ ...c, playlistIds: [...c.playlistIds] }))
  for (const c of b) {
    const hit = out.find((x) => norm(x.name) === norm(c.name))
    if (hit) hit.playlistIds = [...new Set([...hit.playlistIds, ...c.playlistIds])]
    else out.push({ ...c, playlistIds: [...c.playlistIds] })
  }
  return out
}
