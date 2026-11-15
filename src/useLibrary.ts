import { useCallback, useEffect, useRef, useState } from 'react'
import { kvClear, kvGet, kvSet } from './db'
import * as sp from './spotify'
import { makeDemo } from './demo'
import type { Activity, Collection, Me, Playlist, SyncState, Track } from './types'

type TrackMap = Record<string, Track[]>
interface Cache { me: Me | null; playlists: Playlist[]; tracks: TrackMap; activity: Activity[]; lastSync: number }

const LIKED = 'liked'
const uid = () => Math.random().toString(36).slice(2, 10)

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++])
  }))
}

export function useLibrary() {
  const [ready, setReady] = useState(false)
  const [demo, setDemo] = useState(false)
  const [authed, setAuthed] = useState(sp.isLoggedIn())
  const [me, setMe] = useState<Me | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [tracks, setTracks] = useState<TrackMap>({})
  const [activity, setActivity] = useState<Activity[]>([])
  const [lastSync, setLastSync] = useState(0)
  const [collections, setCollections] = useState<Collection[]>([])
  const [sync, setSync] = useState<SyncState>({ running: false, done: 0, total: 0, label: '' })
  const busy = useRef(false)

  // initial load: cache + collections, then finish a pending OAuth redirect
  useEffect(() => {
    (async () => {
      const cols = await kvGet<Collection[]>('collections')
      if (cols) {
        // one-time cleanup: demo-mode collections (ids like p0..p7 / liked) must never survive into a real library
        const demoOnly = (c: Collection) => c.playlistIds.length > 0 && c.playlistIds.every((id) => /^p\d+$/.test(id) || id === 'liked')
        const clean = cols.filter((c) => !demoOnly(c) && c.id !== 'c1' && c.id !== 'c2')
        if (clean.length !== cols.length) void kvSet('collections', clean)
        setCollections(clean)
      }
      const c = await kvGet<Cache>('cache')
      if (c) { setMe(c.me); setPlaylists(c.playlists); setTracks(c.tracks); setActivity(c.activity); setLastSync(c.lastSync) }
      try { if (await sp.handleRedirect()) setAuthed(true) }
      catch (e) { setSync((s) => ({ ...s, error: (e as Error).message })) }
      setReady(true)
    })()
  }, [])

  const persistCollections = (next: Collection[]) => { setCollections(next); if (!demo) void kvSet('collections', next) }

  const runSync = useCallback(async () => {
    if (busy.current || !sp.isLoggedIn()) return
    busy.current = true
    setSync({ running: true, done: 0, total: 1, label: 'Connecting to Spotify' })
    try {
      const prev = (await kvGet<Cache>('cache')) ?? { me: null, playlists: [], tracks: {}, activity: [], lastSync: 0 }
      const first = prev.lastSync === 0
      const meNow = await sp.fetchMe()
      const remote = await sp.fetchPlaylists(meNow.id)
      const nextTracks: TrackMap = { ...prev.tracks }
      const events: Activity[] = []
      const now = Date.now()
      const log = (e: Omit<Activity, 'id' | 'ts'>) => events.push({ ...e, id: uid(), ts: now })

      const prevById = new Map(prev.playlists.map((p) => [p.id, p]))
      const nextPlaylists: Playlist[] = remote.map((p) => ({ ...p, syncedAt: prevById.get(p.id)?.syncedAt }))
      const likedMeta: Playlist = {
        id: LIKED, name: 'Liked Songs', description: 'Everything you have hearted', image: '',
        owner: meNow.name, url: 'https://open.spotify.com/collection/tracks', uri: 'spotify:collection:tracks',
        snapshotId: '', total: 0, isPublic: false, collaborative: false, mine: true,
      }
      nextPlaylists.unshift(likedMeta)

      if (!first) {
        for (const p of remote) if (!prevById.has(p.id)) log({ type: 'new-playlist', playlistId: p.id, playlistName: p.name })
        for (const p of prev.playlists) if (p.id !== LIKED && !remote.some((r) => r.id === p.id)) {
          log({ type: 'removed-playlist', playlistId: p.id, playlistName: p.name })
          delete nextTracks[p.id]
        }
      }

      const diff = (p: Playlist, before: Track[] | undefined, after: Track[]) => {
        if (first || !before) return
        const b = new Set(before.map((t) => t.id)), a = new Set(after.map((t) => t.id))
        for (const t of after) if (!b.has(t.id)) log({ type: 'added', playlistId: p.id, playlistName: p.name, trackName: t.name, artists: t.artists.join(', '), image: t.image, url: t.url })
        for (const t of before) if (!a.has(t.id)) log({ type: 'removed', playlistId: p.id, playlistName: p.name, trackName: t.name, artists: t.artists.join(', '), image: t.image, url: t.url } as Activity)
      }

      const todo = nextPlaylists.filter((p) => {
        if (p.id === LIKED) return true
        const old = prevById.get(p.id)
        return !nextTracks[p.id] || !old || old.snapshotId !== p.snapshotId
      })
      let done = 0
      const total = todo.length
      setSync({ running: true, done, total, label: `Reading ${total} playlist${total === 1 ? '' : 's'}` })

      await pool(todo, 3, async (p) => {
        try {
          const list = p.id === LIKED ? await sp.fetchLiked() : await sp.fetchPlaylistTracks(p.id)
          diff(p, nextTracks[p.id], list)
          nextTracks[p.id] = list
          p.total = list.length
          p.syncedAt = Date.now()
        } catch (e) {
          const status = e instanceof sp.ApiError ? e.status : 0
          p.note = status === 403
            ? 'Spotify only lets this app read tracks from playlists you own or collaborate on.'
            : `Could not read tracks (${(e as Error).message}).`
          nextTracks[p.id] ??= []
        }
        done++
        setSync({ running: true, done, total, label: p.name })
      })

      const liked = nextTracks[LIKED] ?? []
      likedMeta.image = liked[0]?.image ?? ''
      likedMeta.total = liked.length

      const nextActivity = [...events.reverse(), ...prev.activity].slice(0, 300)
      const cache: Cache = { me: meNow, playlists: nextPlaylists, tracks: nextTracks, activity: nextActivity, lastSync: now }
      await kvSet('cache', cache)
      setMe(meNow); setPlaylists(nextPlaylists); setTracks(nextTracks); setActivity(nextActivity); setLastSync(now)
      setSync({ running: false, done: total, total, label: 'Up to date' })
    } catch (e) {
      setSync({ running: false, done: 0, total: 0, label: '', error: (e as Error).message })
      if (!sp.isLoggedIn()) setAuthed(false)
    } finally { busy.current = false }
  }, [])

  // auto-sync after login, and when the tab regains focus (if it has been a while)
  useEffect(() => { if (ready && authed && !demo) void runSync() }, [ready, authed, demo, runSync])
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible' && authed && !demo && Date.now() - lastSync > 5 * 60_000) void runSync() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [authed, demo, lastSync, runSync])

  const startDemo = () => {
    const d = makeDemo()
    setDemo(true); setMe(d.me); setPlaylists(d.playlists); setTracks(d.tracks); setActivity(d.activity); setLastSync(Date.now())
    setCollections(d.collections)
  }
  const signOut = async () => {
    sp.logout(); setAuthed(false); setDemo(false); setMe(null); setPlaylists([]); setTracks({}); setActivity([]); setLastSync(0)
    await kvClear(); setCollections([])
  }

  const saveCollection = (c: Collection) =>
    persistCollections(collections.some((x) => x.id === c.id) ? collections.map((x) => (x.id === c.id ? c : x)) : [...collections, c])
  const deleteCollection = (id: string) => persistCollections(collections.filter((c) => c.id !== id))
  const togglePlaylistIn = (collectionId: string, playlistId: string) =>
    persistCollections(collections.map((c) => c.id !== collectionId ? c : {
      ...c, playlistIds: c.playlistIds.includes(playlistId) ? c.playlistIds.filter((x) => x !== playlistId) : [...c.playlistIds, playlistId],
    }))
  const setAllCollections = (next: Collection[]) => persistCollections(next)
  const newCollection = (name: string, emoji: string, playlistId?: string) => {
    const c: Collection = { id: uid(), name, emoji, playlistIds: playlistId ? [playlistId] : [] }
    persistCollections([...collections, c])
  }

  const isAuthed = demo || authed
  return {
    ready, isAuthed, demo, me, playlists, tracks, activity, lastSync, collections, sync,
    runSync, startDemo, signOut, saveCollection, deleteCollection, togglePlaylistIn, newCollection, setAllCollections,
  }
}
export type Library = ReturnType<typeof useLibrary>
export { LIKED }
