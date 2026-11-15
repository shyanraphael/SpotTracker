import type { Activity, Collection, Me, Playlist, Track } from './types'

const NAMES: [string, string, string][] = [
  ['Midnight Drive', 'Neon Harbor', 'synth'], ['Golden Hour', 'Sol Ray', 'indie'], ['Static Bloom', 'Paper Satellites', 'dream'],
  ['Low Tide', 'The Quiet Coast', 'chill'], ['Run It Back', 'Kilo Kane', 'hip hop'], ['Velvet Rooms', 'Mira Voss', 'rnb'],
  ['Slow Burn', 'Ember & Oak', 'folk'], ['After Hours', 'Neon Harbor', 'synth'], ['Paper Planes', 'Juno Park', 'pop'],
  ['Heavy Water', 'Basalt', 'rock'], ['Echo Garden', 'Paper Satellites', 'dream'], ['Sunday Roast', 'Ember & Oak', 'folk'],
  ['Glass Houses', 'Mira Voss', 'rnb'], ['Turbo', 'Kilo Kane', 'hip hop'], ['Cold Open', 'Basalt', 'rock'], ['Daybreak', 'Sol Ray', 'indie'],
]
const PL = ['Late Night Drives', 'Gym Fuel', 'Focus Deep Work', 'Sunday Mornings', 'Road Trip 2024', 'Throwbacks', 'Rainy Days', 'Cooking Vibes']

export function makeDemo() {
  const trackFor = (i: number, daysAgo: number): Track => {
    const [name, artist, genre] = NAMES[i % NAMES.length]
    return {
      id: `d${i}`, uri: `spotify:track:demo${i}`, url: 'https://open.spotify.com', name, artists: [artist],
      album: `${genre[0].toUpperCase()}${genre.slice(1)} Sessions`, image: '', durationMs: 170000 + (i * 7919) % 90000,
      addedAt: new Date(Date.now() - daysAgo * 864e5).toISOString(), explicit: i % 5 === 0, releaseDate: `${2015 + (i % 10)}-05-01`,
    }
  }
  const tracks: Record<string, Track[]> = {}
  const playlists: Playlist[] = [{
    id: 'liked', name: 'Liked Songs', description: 'Everything you have hearted', image: '', owner: 'You', url: 'https://open.spotify.com',
    uri: '', snapshotId: '', total: 0, isPublic: false, collaborative: false, mine: true,
  }]
  tracks.liked = Array.from({ length: 40 }, (_, i) => trackFor(i * 3, i * 2 + 1))
  PL.forEach((name, k) => {
    const id = `p${k}`
    tracks[id] = Array.from({ length: 12 + ((k * 7) % 25) }, (_, i) => trackFor(k * 2 + i, i * 3 + k))
    playlists.push({
      id, name, description: ['Windows down.', 'Beast mode.', 'No lyrics, no distractions.', 'Slow starts.', '', 'Nostalgia hits.', 'Cozy.', 'Stir and sip.'][k],
      image: '', owner: k === 5 ? 'Alex' : 'You', url: 'https://open.spotify.com', uri: '', snapshotId: String(k), total: tracks[id].length,
      isPublic: k % 2 === 0, collaborative: k === 4, mine: k !== 5,
    })
  })
  playlists[0].total = tracks.liked.length
  const me: Me = { id: 'demo', name: 'Demo Listener', image: '', url: '' }
  const collections: Collection[] = [
    { id: 'c1', name: 'Work & Focus', emoji: 'c1', playlistIds: ['p2', 'p1'] },
    { id: 'c2', name: 'Weekend', emoji: 'c0', playlistIds: ['p3', 'p4', 'p7'] },
  ]
  const t = Date.now()
  const activity: Activity[] = [
    { id: 'a1', ts: t - 36e5, type: 'added', playlistId: 'p0', playlistName: 'Late Night Drives', trackName: 'Midnight Drive', artists: 'Neon Harbor' },
    { id: 'a2', ts: t - 36e5 * 5, type: 'added', playlistId: 'p1', playlistName: 'Gym Fuel', trackName: 'Run It Back', artists: 'Kilo Kane' },
    { id: 'a3', ts: t - 864e5, type: 'removed', playlistId: 'p6', playlistName: 'Rainy Days', trackName: 'Static Bloom', artists: 'Paper Satellites' },
    { id: 'a4', ts: t - 864e5 * 3, type: 'new-playlist', playlistId: 'p7', playlistName: 'Cooking Vibes' },
  ]
  return { me, playlists, tracks, activity, collections }
}
