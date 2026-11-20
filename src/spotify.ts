import type { Me, Playlist, Track } from './types'

export const CLIENT_ID = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? ''
export const REDIRECT_URI = `${window.location.origin}/`
const SCOPES = 'user-library-read playlist-read-private playlist-read-collaborative'
const TOKEN_KEY = 'st.token'
const VERIFIER_KEY = 'st.verifier'

interface Token { access: string; refresh: string; expiresAt: number }

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export async function login() {
  const bytes = crypto.getRandomValues(new Uint8Array(64))
  const verifier = b64url(bytes.buffer)
  localStorage.setItem(VERIFIER_KEY, verifier)
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const p = new URLSearchParams({
    client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI,
    scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge,
  })
  window.location.href = `https://accounts.spotify.com/authorize?${p}`
}

const loadToken = (): Token | null => {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') } catch { return null }
}

async function tokenRequest(body: Record<string, string>): Promise<Token> {
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
  })
  if (!r.ok) throw new Error(`Spotify token error (${r.status})`)
  const j = await r.json()
  const prev = loadToken()
  const t: Token = {
    access: j.access_token,
    refresh: j.refresh_token ?? prev?.refresh ?? '',
    expiresAt: Date.now() + (j.expires_in - 60) * 1000,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
  return t
}
export const isLoggedIn = () => !!loadToken()
export function logout() { localStorage.removeItem(TOKEN_KEY) }

/** Finish the redirect from Spotify (?code=...). Returns true if a login was completed. */
export async function handleRedirect(): Promise<boolean> {
  const q = new URLSearchParams(window.location.search)
  const code = q.get('code')
  if (q.get('error')) { history.replaceState({}, '', '/'); throw new Error(`Spotify login: ${q.get('error')}`) }
  if (!code) return false
  const verifier = localStorage.getItem(VERIFIER_KEY) ?? ''
  history.replaceState({}, '', '/')
  await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier })
  localStorage.removeItem(VERIFIER_KEY)
  return true
}

export async function getAccessToken(): Promise<string> {
  let t = loadToken()
  if (!t) throw new Error('Not logged in')
  if (Date.now() >= t.expiresAt) t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh })
  return t.access
}

export class ApiError extends Error {
  status: number
  constructor(status: number, msg: string) { super(msg); this.status = status }
}

async function api<T>(pathOrUrl: string, attempt = 0): Promise<T> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `https://api.spotify.com/v1${pathOrUrl}`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${await getAccessToken()}` } })
  if (r.status === 429 && attempt < 5) {
    const wait = (Number(r.headers.get('Retry-After')) || 2) * 1000
    await new Promise((s) => setTimeout(s, wait))
    return api<T>(pathOrUrl, attempt + 1)
  }
  if (r.status === 401) { logout(); throw new ApiError(401, 'Session expired, please log in again') }
  if (!r.ok) throw new ApiError(r.status, `Spotify API ${r.status}`)
  return r.json()
}

async function pageAll<T>(first: string, onPage?: (n: number) => void): Promise<T[]> {
  const out: T[] = []
  let next: string | null = first
  while (next) {
    const j: { items: T[]; next: string | null } = await api(next)
    out.push(...j.items)
    onPage?.(out.length)
    next = j.next
  }
  return out
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const bestImage = (imgs?: any[]) =>
  imgs?.length ? (imgs.find((i) => i.width && i.width <= 320 && i.width >= 200) ?? imgs[0]).url : ''

export const mapTrack = (item: any, addedAt: string): Track | null => {
  const t = item?.item ?? item?.track ?? item
  if (!t || !t.id || t.type === 'episode') return null
  return {
    id: t.id, uri: t.uri, url: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
    name: t.name, artists: (t.artists ?? []).map((a: any) => a.name),
    album: t.album?.name ?? '', image: bestImage(t.album?.images),
    durationMs: t.duration_ms ?? 0, addedAt, explicit: !!t.explicit,
    releaseDate: t.album?.release_date ?? '',
  }
}

export async function fetchMe(): Promise<Me> {
  const m: any = await api('/me')
  return { id: m.id, name: m.display_name ?? m.id, image: bestImage(m.images), url: m.external_urls?.spotify ?? '' }
}

export async function fetchPlaylists(meId: string): Promise<Playlist[]> {
  const raw = await pageAll<any>('/me/playlists?limit=50')
  return raw.filter(Boolean).map((p) => ({
    id: p.id, name: p.name, description: (p.description ?? '').replace(/<[^>]+>/g, ''),
    image: bestImage(p.images), owner: p.owner?.display_name ?? p.owner?.id ?? '',
    url: p.external_urls?.spotify ?? `https://open.spotify.com/playlist/${p.id}`, uri: p.uri,
    snapshotId: p.snapshot_id ?? '', total: p.items?.total ?? p.tracks?.total ?? 0,
    isPublic: !!p.public, collaborative: !!p.collaborative, mine: p.owner?.id === meId,
  }))
}

export async function fetchLiked(onPage?: (n: number) => void): Promise<Track[]> {
  const raw = await pageAll<any>('/me/tracks?limit=50', onPage)
  return raw.map((i) => mapTrack(i.track, i.added_at)).filter((t): t is Track => !!t)
}

export async function fetchPlaylistTracks(id: string): Promise<Track[]> {
  const q = 'limit=100&additional_types=track'
  let raw: any[]
  try { raw = await pageAll<any>(`/playlists/${id}/items?${q}`) }
  catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) raw = await pageAll<any>(`/playlists/${id}/tracks?${q}`)
    else throw e
  }
  return raw.map((i) => mapTrack(i, i.added_at)).filter((t): t is Track => !!t)
}
