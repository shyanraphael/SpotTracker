export interface Track {
  id: string
  uri: string
  url: string
  name: string
  artists: string[]
  album: string
  image: string
  durationMs: number
  addedAt: string
  explicit: boolean
  releaseDate: string
}
export interface Playlist {
  id: string // 'liked' for Liked Songs
  name: string
  description: string
  image: string
  owner: string
  url: string
  uri: string
  snapshotId: string
  total: number
  isPublic: boolean
  collaborative: boolean
  mine: boolean
  syncedAt?: number
  note?: string // e.g. why tracks couldn't be read
}
export interface Collection { id: string; name: string; emoji: string; playlistIds: string[] }
export interface Activity {
  id: string
  ts: number
  type: 'added' | 'removed' | 'new-playlist' | 'removed-playlist'
  playlistId: string
  playlistName: string
  trackName?: string
  artists?: string
  image?: string
  url?: string
}
export interface Me { id: string; name: string; image: string; url: string }
export interface SyncState { running: boolean; done: number; total: number; label: string; error?: string }
