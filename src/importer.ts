import type { Collection, Playlist } from './types'

export interface ParsedFolder { name: string; entries: string[] }
export interface ImportPreview {
  folders: { name: string; matched: Playlist[]; unmatched: string[] }[]
  matchedCount: number
  unmatchedCount: number
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const ID_RE = /playlist[/:]([A-Za-z0-9]{22})/
const FOLDER_RE = /^(?:#+\s*(.+?)|\[(.+)\]|(.+?):)$/

/**
 * Accepted shapes (mix freely):
 *   Folder name:            # Folder name           [Folder name]
 *     Playlist name           Playlist name           https://open.spotify.com/playlist/...
 * Without any folder markers, blank-line separated blocks are used (first line = folder name).
 */
export function parseFolders(text: string): ParsedFolder[] {
  const lines = text.replace(/\r/g, '').split('\n')
  const hasMarkers = lines.some((l) => !ID_RE.test(l) && FOLDER_RE.test(l.trim()) && l.trim().length > 1)
  const out: ParsedFolder[] = []
  let cur: ParsedFolder | null = null
  let blockStart = true
  for (const raw of lines) {
    const line = raw.trim().replace(/^[-*•]\s+/, '')
    if (!line) { blockStart = true; continue }
    if (hasMarkers) {
      const m = !ID_RE.test(line) ? line.match(FOLDER_RE) : null
      if (m && (!/^\s/.test(raw) || line.startsWith('#'))) {
        cur = { name: (m![1] ?? m![2] ?? m![3]).trim(), entries: [] }
        out.push(cur)
        continue
      }
    } else if (blockStart) {
      cur = { name: line, entries: [] }
      out.push(cur)
      blockStart = false
      continue
    }
    if (!cur) { cur = { name: 'Imported', entries: [] }; out.push(cur) }
    cur.entries.push(line)
  }
  return out.filter((f) => f.entries.length > 0)
}

export function previewImport(parsed: ParsedFolder[], playlists: Playlist[]): ImportPreview {
  const real = playlists.filter((p) => p.id !== 'liked')
  const byId = new Map(real.map((p) => [p.id, p]))
  const byName = new Map<string, Playlist[]>()
  for (const p of real) { const k = norm(p.name); byName.set(k, [...(byName.get(k) ?? []), p]) }
  const used = new Set<string>()
  let matchedCount = 0, unmatchedCount = 0
  const folders = parsed.map((f) => {
    const matched: Playlist[] = []
    const unmatched: string[] = []
    for (const e of f.entries) {
      const id = e.match(ID_RE)?.[1]
      let hit = id ? byId.get(id) : undefined
      if (!hit) {
        const cands = byName.get(norm(e)) ?? []
        hit = cands.find((c) => !used.has(c.id)) ?? cands[0] // duplicate names: take them in order
      }
      if (hit && !matched.includes(hit)) { matched.push(hit); used.add(hit.id); matchedCount++ }
      else if (!hit) { unmatched.push(e); unmatchedCount++ }
    }
    return { name: f.name, matched, unmatched }
  })
  return { folders, matchedCount, unmatchedCount }
}

export function toCollections(preview: ImportPreview, existing: Collection[], mode: 'merge' | 'replace'): Collection[] {
  const base = mode === 'replace' ? [] : existing.map((c) => ({ ...c, playlistIds: [...c.playlistIds] }))
  for (const f of preview.folders) {
    if (f.matched.length === 0) continue
    const ids = f.matched.map((p) => p.id)
    const hit = base.find((c) => norm(c.name) === norm(f.name))
    if (hit) hit.playlistIds = [...new Set([...hit.playlistIds, ...ids])]
    else base.push({ id: Math.random().toString(36).slice(2, 10), name: f.name, emoji: 'c' + (base.length % 6), playlistIds: ids })
  }
  return base
}
