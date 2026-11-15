import { AnimatePresence, LayoutGroup, motion, useScroll, useTransform } from 'framer-motion'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { ReactNode } from 'react'
import { Art, CheckDraw, CountUp, Eq, Icon, Logo, Magnetic, SWATCHES, SplitText, Tag, ease, fmtAgo, fmtDur, fmtTotal, spring, swatchOf, useColor } from './components'
import { parseFolders, previewImport, toCollections } from './importer'
import { getLyrics } from './lyrics'
import type { Lyrics } from './lyrics'
import { CLIENT_ID, REDIRECT_URI, login } from './spotify'
import { LIKED, useLibrary } from './useLibrary'
import type { Library } from './useLibrary'
import type { Activity, Playlist, Track } from './types'

type View = 'library' | 'songs' | 'activity'
type Sort = 'recent' | 'name' | 'artist' | 'popular'
type PlSort = 'bill' | 'az' | 'recent'
type TSort = 'order' | 'added' | 'title' | 'artist' | 'length'
const TSORTS: [TSort, string, 1 | -1][] = [['order', 'Playlist order', 1], ['added', 'Date added', -1], ['title', 'Title', 1], ['artist', 'Artist', 1], ['length', 'Length', -1]]
interface SongEntry { track: Track; lists: Playlist[]; latest: number }

type Theme = 'dark' | 'light'
function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || 'dark')
  const toggle = (e?: React.MouseEvent) => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    const apply = () => {
      document.documentElement.dataset.theme = next
      try { localStorage.setItem('st.theme', next) } catch { /* private mode: theme still applies for this visit */ }
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', next === 'dark' ? '#0a0d0b' : '#f2f6f2')
      setTheme(next)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vt = (document as any).startViewTransition?.bind(document)
    if (!vt || matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return }
    const x = e?.clientX ?? innerWidth - 40, y = e?.clientY ?? 40
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    vt(() => flushSync(apply)).ready.then(() => document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' }))
  }
  return { theme, toggle }
}

function ThemeToggle({ theme, onToggle, className = '' }: { theme: Theme; onToggle: (e: React.MouseEvent) => void; className?: string }) {
  const to = theme === 'dark' ? 'light' : 'dark'
  return (
    <button className={`themebtn ${className}`} onClick={onToggle} aria-label={`Switch to ${to} theme`} title={`Switch to ${to} theme`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, scale: 0.2, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.2, opacity: 0 }} transition={{ duration: 0.28, ease }} style={{ display: 'flex' }}>
          {theme === 'dark' ? <Icon.Moon /> : <Icon.Sun />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

function ArtField({ list }: { list: Track[] }) {
  const rows = useMemo(() => {
    const withArt = [...new Map(list.filter((t) => t.image).map((t) => [t.image, t])).values()]
    const base = withArt.length ? withArt : list.slice(0, 14)
    if (!base.length) return []
    return [0, 1, 2].map((r) => Array.from({ length: 14 }, (_, i) => base[(i * 3 + r * 5) % base.length]))
  }, [list])
  return (
    <div className="artfield" aria-hidden>
      <div className="rows">
        {rows.map((row, r) => (
          <div key={r} className="artrow">
            {[...row, ...row].map((t, i) => <div className="tile" key={i}><Art src={t.image} seed={t.album || t.name} label={t.name} radius={0} /></div>)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const lib = useLibrary()
  const { theme, toggle: toggleTheme } = useTheme()
  const [view, setView] = useState<View>('library')
  const [query, setQuery] = useState('')
  const [openPl, setOpenPl] = useState<string | null>(null)
  const [openTrack, setOpenTrack] = useState<Track | null>(null)
  const [picker, setPicker] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const songs = useMemo(() => {
    const m = new Map<string, SongEntry>()
    const byId = new Map(lib.playlists.map((p) => [p.id, p]))
    for (const [pid, list] of Object.entries(lib.tracks)) {
      const p = byId.get(pid)
      if (!p) continue
      for (const t of list) {
        const e = m.get(t.id)
        const at = Date.parse(t.addedAt) || 0
        if (e) { e.lists.push(p); e.latest = Math.max(e.latest, at) } else m.set(t.id, { track: t, lists: [p], latest: at })
      }
    }
    return [...m.values()]
  }, [lib.tracks, lib.playlists])

  if (!lib.ready) return <div className="boot"><Eq /></div>
  if (!lib.isAuthed) return <><Backdrop /><Welcome onDemo={lib.startDemo} error={lib.sync.error} theme={theme} onTheme={toggleTheme} /></>

  const go = (v: View) => { setView(v); setOpenPl(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const jumpToPlaylist = (id: string) => { setOpenTrack(null); setOpenPl(id) }

  return (
    <div className="shell">
      <Backdrop />
      <Nav view={view} go={go} lib={lib} />
      <main className="main">
        <TopBar lib={lib} query={query} setQuery={setQuery} onSearch={() => view === 'activity' && setView('songs')} theme={theme} onTheme={toggleTheme} />
        <Ticker lib={lib} songs={songs.length} />
        {lib.sync.error && <div className="banner err">{lib.sync.error}</div>}
        <AnimatePresence mode="wait">
          <motion.div key={view} className="view"
            initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease }}>
            <motion.i className="viewline" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, ease, delay: 0.1 }} />
            {view === 'library' && <LibraryView lib={lib} songs={songs} query={query} onOpen={setOpenPl} onPick={setPicker} onImport={() => setImporting(true)} />}
            {view === 'songs' && <SongsView songs={songs} query={query} onTrack={setOpenTrack} />}
            {view === 'activity' && <ActivityView items={lib.activity} onOpen={setOpenPl} lastSync={lib.lastSync} demo={lib.demo} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {openPl && <PlaylistPanel key="panel" lib={lib} id={openPl} onClose={() => setOpenPl(null)} onTrack={setOpenTrack} onPick={setPicker} />}
      </AnimatePresence>
      <AnimatePresence>
        {openTrack && <TrackSheet key="sheet" track={openTrack} songs={songs} onClose={() => setOpenTrack(null)} onPlaylist={jumpToPlaylist} />}
      </AnimatePresence>
      <AnimatePresence>
        {importing && <ImportModal key="import" lib={lib} onClose={() => setImporting(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {picker !== null && <CollectionPicker key="picker" lib={lib} playlistId={picker} onClose={() => setPicker(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ---------- chrome ---------- */

function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <span className="dots" /><span className="ring r1" /><span className="ring r2" /><span className="grain" />
    </div>
  )
}

function Nav({ view, go, lib }: { view: View; go: (v: View) => void; lib: Library }) {
  const recent = lib.activity.filter((a) => Date.now() - a.ts < 864e5 * 2).length
  const items: { id: View; label: string; icon: ReactNode; badge?: number }[] = [
    { id: 'library', label: 'Library', icon: <Icon.Library /> },
    { id: 'songs', label: 'Songs', icon: <Icon.Songs /> },
    { id: 'activity', label: 'Activity', icon: <Icon.Activity />, badge: recent },
  ]
  return (
    <motion.nav className="nav" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.7, ease }}>
      <div className="brand"><Logo on={lib.sync.running} size={32} /><b>Spot<span>Tracker</span></b></div>
      <LayoutGroup id="nav">
        <ul>
          {items.map((it, i) => (
            <motion.li key={it.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease }}>
              <button className={view === it.id ? 'on' : ''} onClick={() => go(it.id)}>
                {view === it.id && <motion.span layoutId="nav-ind" className="ind" transition={spring} />}
                <span className="ico">{it.icon}</span><span className="lbl">{it.label}</span>
                {!!it.badge && <em>{it.badge}</em>}
              </button>
            </motion.li>
          ))}
        </ul>
      </LayoutGroup>
      <div className="navfoot">
        <div className="me">
          <Art src={lib.me?.image ?? ''} seed={lib.me?.name ?? 'me'} label={lib.me?.name} radius={0} />
          <div><b>{lib.me?.name}</b><small>{lib.demo ? 'Demo data' : 'Connected'}</small></div>
        </div>
        <button className="ghost" onClick={() => void lib.signOut()} title="Sign out" aria-label="Sign out"><Icon.Out size={18} /></button>
      </div>
    </motion.nav>
  )
}

const HINTS = ['Find a song', 'Search an artist', 'Which playlist has it?', 'Look up an album']
function TopBar({ lib, query, setQuery, onSearch, theme, onTheme }: { lib: Library; query: string; setQuery: (s: string) => void; onSearch: () => void; theme: Theme; onTheme: (e: React.MouseEvent) => void }) {
  const { sync } = lib
  const pct = sync.total ? Math.min(100, (sync.done / sync.total) * 100) : 0
  const [hint, setHint] = useState(0)
  const [justDone, setJustDone] = useState(false)
  const wasRunning = useRef(false)
  useEffect(() => { const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2800); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (wasRunning.current && !sync.running && !sync.error) { setJustDone(true); const t = setTimeout(() => setJustDone(false), 2200); return () => clearTimeout(t) }
    wasRunning.current = sync.running
  }, [sync.running, sync.error])
  return (
    <motion.header className="top" initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease, delay: 0.1 }}>
      <label className="search">
        <Icon.Search size={18} />
        <span className="field">
          <input value={query} onChange={(e) => { setQuery(e.target.value); onSearch() }} aria-label="Search your library" />
          <AnimatePresence mode="wait">
            {!query && <motion.span key={hint} className="hint" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.35, ease }}>{HINTS[hint]}</motion.span>}
          </AnimatePresence>
        </span>
        <AnimatePresence>{query && (
          <motion.button initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} className="clear" onClick={() => setQuery('')} aria-label="Clear search"><Icon.Close size={14} /></motion.button>
        )}</AnimatePresence>
      </label>
      <ThemeToggle theme={theme} onToggle={onTheme} />
      <motion.button className={`sync ${sync.running ? 'busy' : ''}`} disabled={sync.running || lib.demo} onClick={() => void lib.runSync()} whileTap={{ scale: 0.96 }}>
        <span className="syncIco">
          <AnimatePresence mode="wait" initial={false}>
            {justDone ? <motion.span key="ok" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} className="okIco"><CheckDraw /></motion.span>
              : <motion.span key="rf" animate={sync.running ? { rotate: 360 } : { rotate: 0 }} transition={sync.running ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0.5, ease }} style={{ display: 'flex' }}><Icon.Refresh size={18} /></motion.span>}
          </AnimatePresence>
        </span>
        <span className="syncText">
          {sync.running ? <>{sync.label}<small>{sync.done} of {sync.total}</small></> : justDone ? <>Up to date<small>just now</small></> : <>{lib.demo ? 'Demo data' : 'Sync now'}<small>{lib.lastSync ? fmtAgo(lib.lastSync) : 'never synced'}</small></>}
        </span>
        <AnimatePresence>{sync.running && <motion.i className="bar" initial={{ opacity: 0 }} animate={{ opacity: 1, width: `${pct}%` }} exit={{ opacity: 0 }} />}</AnimatePresence>
      </motion.button>
    </motion.header>
  )
}

function Ticker({ lib, songs }: { lib: Library; songs: number }) {
  const lists = lib.playlists.filter((p) => p.id !== LIKED).length
  const hours = Math.round(Object.values(lib.tracks).flat().reduce((a, t) => a + t.durationMs, 0) / 36e5)
  const ev = lib.activity.slice(0, 6).map((a) => (a.trackName ? `${a.type === 'added' ? 'Added' : 'Removed'} ${a.trackName} · ${a.playlistName}` : `${a.type === 'new-playlist' ? 'New playlist' : 'Playlist removed'} ${a.playlistName}`))
  const items = [`${lists} playlists`, `${songs.toLocaleString()} unique songs`, `${hours} hours of music`, ...ev]
  return (
    <div className="ticker" aria-hidden>
      <div className="track" style={{ animationDuration: `${Math.max(36, items.join('').length * 0.34)}s` }}>
        {[...items, ...items].map((t, i) => <span key={i} className={i >= items.length ? 'dup' : ''}>{t}</span>)}
      </div>
    </div>
  )
}

/* ---------- welcome ---------- */

function Welcome({ onDemo, error, theme, onTheme }: { onDemo: () => void; error?: string; theme: Theme; onTheme: (e: React.MouseEvent) => void }) {
  const noId = !CLIENT_ID
  return (
    <div className="welcome">
      <ThemeToggle theme={theme} onToggle={onTheme} className="floating" />
      <div className="floaties" aria-hidden>
        {SWATCHES.map((c, i) => <i key={c} style={{ ['--c' as string]: c, ['--i' as string]: i }} />)}
      </div>
      <div className="wcontent">
        <div className="brand big"><Logo size={44} /><b>Spot<span>Tracker</span></b></div>
        <SplitText as="h1" text="Every playlist." className="wh" delay={0.1} />
        <SplitText as="h1" text="One bill." className="wh hot" delay={0.5} />
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8, ease }}>
          Log in with Spotify. Your playlists, liked songs and every track sync here, so you can find any song, see what each playlist holds, and spot what changed.
        </motion.p>
        {noId && <div className="banner warn"><b>Spotify Client ID missing.</b> Add <code>VITE_SPOTIFY_CLIENT_ID</code> to <code>.env</code> with redirect URI <code>{REDIRECT_URI}</code>, then restart.</div>}
        {error && <div className="banner err">{error}</div>}
        <motion.div className="row" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.8, ease }}>
          <Magnetic><button className="cta" disabled={noId} onClick={() => void login()}>Continue with Spotify <Icon.Arrow size={18} /></button></Magnetic>
          <button className="ghostBtn" onClick={onDemo}>Try demo data</button>
        </motion.div>
        <small className="fine"><Icon.Lock size={13} /> Read-only access. Your data stays in this browser.</small>
      </div>
    </div>
  )
}

/* ---------- library ---------- */

function ViewHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="vhead">
      <SplitText as="h1" text={title} className="vtitle" />
      <motion.div className="vsub" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6, ease }}>{children}</motion.div>
    </div>
  )
}

function LibraryView({ lib, songs, query, onOpen, onPick, onImport }: { lib: Library; songs: SongEntry[]; query: string; onOpen: (id: string) => void; onPick: (id: string) => void; onImport: () => void }) {
  const [col, setCol] = useState<string>('all')
  const [sort, setSort] = useState<PlSort>('bill')
  const q = useDeferredValue(query.trim().toLowerCase())
  const filed = new Set(lib.collections.flatMap((c) => c.playlistIds))

  const hits = useMemo(() => {
    const m = new Map<string, number>()
    if (!q) return m
    for (const p of lib.playlists) m.set(p.id, (lib.tracks[p.id] ?? []).filter((t) => `${t.name} ${t.artists.join(' ')} ${t.album}`.toLowerCase().includes(q)).length)
    return m
  }, [q, lib.playlists, lib.tracks])

  const list = useMemo(() => {
    let r = lib.playlists.filter((p) => {
      if (col === 'unfiled' && filed.has(p.id)) return false
      if (col !== 'all' && col !== 'unfiled' && !lib.collections.find((c) => c.id === col)?.playlistIds.includes(p.id)) return false
      if (!q) return true
      return (hits.get(p.id) ?? 0) > 0 || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    })
    if (q) r = [...r].sort((a, b) => (hits.get(b.id) ?? 0) - (hits.get(a.id) ?? 0))
    else if (sort === 'bill') r = [...r].sort((a, b) => b.total - a.total)
    else if (sort === 'az') r = [...r].sort((a, b) => a.name.localeCompare(b.name))
    else r = [...r].sort((a, b) => (b.syncedAt ?? 0) - (a.syncedAt ?? 0))
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib.playlists, lib.collections, col, q, sort, hits])

  const tiers: { key: 'head' | 'stage' | 'support' | 'all'; title: string; items: Playlist[] }[] = sort === 'bill' || q
    ? [{ key: 'head', title: q ? 'Best matches' : 'Headliners', items: list.slice(0, 3) }, { key: 'stage', title: 'Main stage', items: list.slice(3, 12) }, { key: 'support', title: 'Support', items: list.slice(12) }].filter((t) => t.items.length) as never
    : [{ key: 'all', title: 'All playlists', items: list }]
  const colName = lib.collections.find((c) => c.id === col)
  const nLists = lib.playlists.filter((p) => p.id !== LIKED).length

  return (
    <>
      <ViewHead title="Library"><CountUp value={nLists} /> playlists plus Liked Songs · <CountUp value={songs.length} /> unique songs · <CountUp value={songs.filter((s) => s.lists.length > 1).length} /> on more than one</ViewHead>

      <div className="controls">
        {lib.collections.length > 0 ? <LayoutGroup id="chips">
          <div className="chips">
            {[{ id: 'all', name: 'All', emoji: 'c0' }, ...lib.collections, { id: 'unfiled', name: 'Unfiled', emoji: 'c4' }].map((c) => (
              <motion.button key={c.id} className={col === c.id ? 'on' : ''} onClick={() => setCol(c.id)} whileTap={{ scale: 0.95 }}>
                {col === c.id && <motion.span layoutId="chip-ind" className="ind" transition={spring} />}
                <span className="clbl"><i className="dot" style={{ background: swatchOf(c.emoji) }} />{c.name}</span>
              </motion.button>
            ))}
            <button className="addchip" onClick={() => onPick('')} aria-label="New collection"><Icon.Plus size={16} /></button>
          </div>
        </LayoutGroup> : <span />}
        <div className="rightctl">
          <button className="importchip" onClick={onImport}><Icon.Folder size={15} /> Import folders</button>
          <div className="seg">
            {([['bill', 'Billing'], ['az', 'A to Z'], ['recent', 'Recent']] as [PlSort, string][]).map(([k, l]) => (
              <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{sort === k && <motion.span layoutId="plsort-ind" className="ind" transition={spring} />}<span>{l}</span></button>
            ))}
          </div>
        </div>
      </div>
      {colName && <div className="colbar"><small>{colName.playlistIds.length} playlists in {colName.name}</small><button className="link" onClick={() => { lib.deleteCollection(colName.id); setCol('all') }}>Delete collection</button></div>}

      {list.length === 0 ? <Empty text={q ? `Nothing on the bill matches “${query}”.` : 'No playlists here yet.'} /> : (
        <LayoutGroup id="bill">
          {tiers.map((t) => (
            <section key={t.key} className="tier">
              <div className="tierhead"><h2>{t.title}</h2><i /><span>{t.items.length}</span></div>
              <div className={`grid ${t.key}`}>
                {t.items.map((p, i) => <PlaylistCard key={p.id} p={p} i={i} rank={list.indexOf(p) + 1} tier={t.key} lib={lib} hits={q ? hits.get(p.id) : undefined} onOpen={onOpen} onPick={onPick} />)}
              </div>
            </section>
          ))}
        </LayoutGroup>
      )}
    </>
  )
}

function PlaylistCard({ p, i, rank, tier, lib, hits, onOpen, onPick }: { p: Playlist; i: number; rank: number; tier: string; lib: Library; hits?: number; onOpen: (id: string) => void; onPick: (id: string) => void }) {
  const inCols = lib.collections.filter((c) => c.playlistIds.includes(p.id))
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${(py - 0.5) * -7}deg`); el.style.setProperty('--ry', `${(px - 0.5) * 7}deg`)
    el.style.setProperty('--mx', `${px * 100}%`); el.style.setProperty('--my', `${py * 100}%`)
  }
  const reset = () => { ref.current?.style.setProperty('--rx', '0deg'); ref.current?.style.setProperty('--ry', '0deg') }
  const big = tier === 'head'
  return (
    <motion.div ref={ref} className={`pcard ${tier}`} style={{ ['--tint' as string]: swatchOf(p.id) }}
      initial={i < 12 ? { opacity: 0, y: 30 } : false} animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: Math.min(i, 12) * 0.05 }}
      whileTap={{ scale: 0.98 }} onPointerMove={move} onPointerLeave={reset}
      onClick={() => onOpen(p.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(p.id)} aria-label={`${p.name}, ${p.total} songs`}>
      <div className="artwrap">
        <motion.div layoutId={`art-${p.id}`} className="artbox"><Art src={p.image} seed={p.id + p.name} label={p.name} radius={0} /></motion.div>
        {big && <span className="rank">{rank}</span>}
        <Eq on={false} className="cardEq" />
      </div>
      <div className="pbody">
        <h3>{p.name}</h3>
        <p><b>{big ? <CountUp value={p.total} /> : p.total}</b> songs{p.id === LIKED ? '' : p.mine ? '' : ` · ${p.owner}`}</p>
        <div className="tags">
          {hits !== undefined && <Tag tone="lime">{hits} {hits === 1 ? 'hit' : 'hits'}</Tag>}
          {p.collaborative && <Tag tone="violet">Collab</Tag>}
          {p.note && <Tag tone="pink">Limited</Tag>}
          {inCols.map((c) => <Tag key={c.id}><i className="dot" style={{ background: swatchOf(c.emoji) }} />{c.name}</Tag>)}
        </div>
      </div>
      <button className="fold" onClick={(e) => { e.stopPropagation(); onPick(p.id) }} title="Add to collection" aria-label={`Add ${p.name} to a collection`}><Icon.Folder size={16} /></button>
    </motion.div>
  )
}

/* ---------- songs ---------- */

function SongsView({ songs, query, onTrack }: { songs: SongEntry[]; query: string; onTrack: (t: Track) => void }) {
  const [sort, setSort] = useState<Sort>('recent')
  const [multi, setMulti] = useState(false)
  const [limit, setLimit] = useState(80)
  const q = useDeferredValue(query.trim().toLowerCase())
  const rows = useMemo(() => {
    const r = songs.filter((s) => (!multi || s.lists.length > 1) &&
      (!q || `${s.track.name} ${s.track.artists.join(' ')} ${s.track.album} ${s.lists.map((l) => l.name).join(' ')}`.toLowerCase().includes(q)))
    const cmp: Record<Sort, (a: SongEntry, b: SongEntry) => number> = {
      recent: (a, b) => b.latest - a.latest,
      name: (a, b) => a.track.name.localeCompare(b.track.name),
      artist: (a, b) => a.track.artists[0]?.localeCompare(b.track.artists[0] ?? '') ?? 0,
      popular: (a, b) => b.lists.length - a.lists.length || b.latest - a.latest,
    }
    return [...r].sort(cmp[sort])
  }, [songs, q, sort, multi])
  useEffect(() => setLimit(80), [q, sort, multi])
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current; if (!el) return
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setLimit((l) => l + 80), { rootMargin: '600px' })
    io.observe(el); return () => io.disconnect()
  }, [rows.length])

  return (
    <>
      <ViewHead title="Songs"><CountUp value={rows.length} /> {q ? 'matches' : 'songs across every playlist'}</ViewHead>
      <div className="controls">
        <div className="seg">
          {(['recent', 'name', 'artist', 'popular'] as Sort[]).map((s) => (
            <button key={s} className={sort === s ? 'on' : ''} onClick={() => setSort(s)}>
              {sort === s && <motion.span layoutId="seg-ind" className="ind" transition={spring} />}<span>{s === 'popular' ? 'Most playlists' : s === 'name' ? 'Title' : s[0].toUpperCase() + s.slice(1)}</span>
            </button>
          ))}
        </div>
        <button className={`toggle ${multi ? 'on' : ''}`} onClick={() => setMulti(!multi)} aria-pressed={multi}><i /> On 2+ playlists</button>
      </div>
      {rows.length === 0 ? <Empty text="No songs found." /> : (
        <div className="tracklist">
          {rows.slice(0, limit).map((s, i) => <TrackRow key={s.track.id} t={s.track} i={i} right={<ListChips lists={s.lists} />} onClick={() => onTrack(s.track)} />)}
          <div ref={sentinel} style={{ height: 1 }} />
        </div>
      )}
    </>
  )
}

function ListChips({ lists }: { lists: Playlist[] }) {
  return (
    <div className="listchips">
      {lists.slice(0, 2).map((l) => <span key={l.id}>{l.name}</span>)}
      {lists.length > 2 && <span className="more">+{lists.length - 2}</span>}
    </div>
  )
}

function TrackRow({ t, i, right, onClick }: { t: Track; i: number; right?: ReactNode; onClick: () => void }) {
  return (
    <motion.div className="trow" role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}
      initial={i < 14 ? { opacity: 0, x: -24 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease, delay: i * 0.03 }} whileTap={{ scale: 0.992 }}>
      <i className="rowbar" />
      <div className="rowart"><Art src={t.image} seed={t.album || t.name} label={t.name} radius={0} /><Eq on={false} className="rowEq" /></div>
      <div className="ttext"><b>{t.name}{t.explicit && <em className="exp">E</em>}</b><span>{t.artists.join(', ')}</span></div>
      <div className="talbum">{t.album}</div>
      {right}
      <div className="tdur">{fmtDur(t.durationMs)}</div>
      <a className="rowopen" href={t.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`Open ${t.name} in Spotify`}><Icon.External size={16} /></a>
    </motion.div>
  )
}

/* ---------- activity ---------- */

function ActivityView({ items, onOpen, lastSync, demo }: { items: Activity[]; onOpen: (id: string) => void; lastSync: number; demo: boolean }) {
  const label: Record<Activity['type'], string> = { added: 'Added to', removed: 'Removed from', 'new-playlist': 'New playlist', 'removed-playlist': 'Playlist removed' }
  return (
    <>
      <ViewHead title="Activity">{demo ? 'Sample events' : lastSync ? `Last checked ${fmtAgo(lastSync)}` : 'Waiting for your first sync'}</ViewHead>
      {items.length === 0 ? <Empty text="No changes yet. Each sync compares your playlists with the last one and lists what was added or removed." /> : (
        <div className="timeline">
          <motion.i className="spine" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1.4, ease }} />
          {items.map((a, i) => (
            <motion.div key={a.id} className={`ev ${a.type}`} initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + Math.min(i, 14) * 0.05, duration: 0.6, ease }}>
              <motion.i className="pin" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.3 + Math.min(i, 14) * 0.05 }} />
              {a.image && <Art src={a.image} seed={a.trackName ?? 'x'} radius={0} />}
              <div className="evbody">
                <small>{label[a.type]} <button className="link" onClick={() => onOpen(a.playlistId)}>{a.playlistName}</button> · {fmtAgo(a.ts)}</small>
                {a.trackName && (a.url ? <a href={a.url} target="_blank" rel="noreferrer"><b>{a.trackName}</b> <span>{a.artists}</span></a> : <p><b>{a.trackName}</b> <span>{a.artists}</span></p>)}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  )
}

/* ---------- playlist panel ---------- */

function PlaylistPanel({ lib, id, onClose, onTrack, onPick }: { lib: Library; id: string; onClose: () => void; onTrack: (t: Track) => void; onPick: (id: string) => void }) {
  const p = lib.playlists.find((x) => x.id === id)
  const list = lib.tracks[id] ?? []
  const [q, setQ] = useState('')
  const [ts, setTs] = useState<{ k: TSort; dir: 1 | -1 }>({ k: 'order', dir: 1 })
  const dq = useDeferredValue(q.trim().toLowerCase())
  const ref = useRef<HTMLElement>(null)
  const { scrollY } = useScroll({ container: ref })
  const artScale = useTransform(scrollY, [0, 220], [1, 0.55])
  const heroY = useTransform(scrollY, [0, 220], [0, -30])
  const titleSize = useTransform(scrollY, [0, 220], [1, 0.72])
  const tint = useColor(p?.image || list[0]?.image || '', id)
  useEscape(onClose)
  useLock()
  if (!p) return null
  const filtered = dq ? list.filter((t) => `${t.name} ${t.artists.join(' ')} ${t.album}`.toLowerCase().includes(dq)) : list
  const tcmp: Record<TSort, (a: Track, b: Track) => number> = {
    order: () => 0,
    added: (a, b) => (Date.parse(a.addedAt) || 0) - (Date.parse(b.addedAt) || 0),
    title: (a, b) => a.name.localeCompare(b.name),
    artist: (a, b) => (a.artists[0] ?? '').localeCompare(b.artists[0] ?? ''),
    length: (a, b) => a.durationMs - b.durationMs,
  }
  const shown = ts.k === 'order' ? filtered : [...filtered].sort((a, b) => tcmp[ts.k](a, b) * ts.dir)
  const pickSort = (k: TSort, first: 1 | -1) => setTs((cur) => (k === 'order' ? { k, dir: 1 } : cur.k === k ? { k, dir: (cur.dir * -1) as 1 | -1 } : { k, dir: first }))
  const ms = list.reduce((a, t) => a + t.durationMs, 0)
  return (
    <>
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside ref={ref} className="panel" style={{ ['--tint' as string]: tint }} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 230, damping: 32 }}>
        <ArtField list={list} />
        <div className="panelhead">
          <button className="ghost" onClick={onClose} aria-label="Back"><Icon.Back /></button>
          <div className="panelactions">
            <button className="ghostBtn small" onClick={() => onPick(p.id)}><Icon.Folder size={16} /> Collections</button>
            <a className="cta small" href={p.url} target="_blank" rel="noreferrer">Open in Spotify <Icon.External size={15} /></a>
          </div>
        </div>
        <motion.div className="hero" style={{ y: heroY }}>
          <motion.div layoutId={`art-${p.id}`} className="herart" style={{ scale: artScale, transformOrigin: 'left top' }}><Art src={p.image || list[0]?.image || ''} seed={p.id + p.name} label={p.name} radius={0} /></motion.div>
          <motion.div className="herotext" style={{ scale: titleSize, transformOrigin: 'left bottom' }}>
            <SplitText as="h2" text={p.name} delay={0.2} />
            {p.description && <p className="desc">{p.description}</p>}
            <p className="meta"><b><CountUp value={list.length} /></b> songs · {fmtTotal(ms)} · {p.id === LIKED ? 'Your library' : `${p.mine ? 'Created by you' : `By ${p.owner}`} · ${p.isPublic ? 'Public' : 'Private'}`}</p>
          </motion.div>
        </motion.div>
        {p.note && <div className="banner warn">{p.note}</div>}
        <label className="search inpanel"><Icon.Search size={16} /><span className="field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search in ${p.name}`} aria-label={`Search in ${p.name}`} /></span></label>
        <div className="seg sortseg" role="group" aria-label="Sort songs">
          {TSORTS.map(([k, label, first]) => (
            <button key={k} className={ts.k === k ? 'on' : ''} onClick={() => pickSort(k, first)} aria-pressed={ts.k === k} aria-label={ts.k === k && k !== 'order' ? `${label}, ${ts.dir === 1 ? 'ascending' : 'descending'}. Click to reverse` : label}>
              {ts.k === k && <motion.span layoutId="tsort-ind" className="ind" transition={spring} />}
              <span>{label}{ts.k === k && k !== 'order' && <i className="dir" style={{ transform: `rotate(${ts.dir === 1 ? -90 : 90}deg)` }}><Icon.Arrow size={12} /></i>}</span>
            </button>
          ))}
        </div>
        <div className="tracklist" key={`${ts.k}${ts.dir}`}>
          {shown.map((t, i) => <TrackRow key={t.id + i} t={t} i={i} onClick={() => onTrack(t)} right={<div className="added">{t.addedAt ? new Date(t.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : ''}</div>} />)}
          {shown.length === 0 && !p.note && <Empty text="No songs." />}
        </div>
      </motion.aside>
    </>
  )
}

/* ---------- track sheet ---------- */

function TrackSheet({ track: t, songs, onClose, onPlaylist }: { track: Track; songs: SongEntry[]; onClose: () => void; onPlaylist: (id: string) => void }) {
  const [tab, setTab] = useState<'details' | 'lyrics'>('details')
  const [lyr, setLyr] = useState<Lyrics | null | 'loading'>('loading')
  const tint = useColor(t.image, t.id)
  const lists = songs.find((s) => s.track.id === t.id)?.lists ?? []
  useEscape(onClose)
  useLock()
  useEffect(() => {
    setLyr('loading')
    let dead = false
    getLyrics(t).then((l) => !dead && setLyr(l))
    return () => { dead = true }
  }, [t])
  const plain = lyr && lyr !== 'loading' ? lyr.plain : ''
  return (
    <>
      <motion.div className="scrim top" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet" style={{ ['--tint' as string]: tint }} initial={{ opacity: 0, y: 90, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 60, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}>
        <div className="grab" />
        <button className="ghost closeBtn" onClick={onClose} aria-label="Close"><Icon.Close /></button>
        <div className="sheethero">
          <div className="sleeveWrap">
            <motion.div className="disc" initial={{ x: 0 }} animate={{ x: '52%' }} transition={{ delay: 0.35, duration: 0.9, ease }}><span /></motion.div>
            <motion.div className="sleeve" initial={{ rotate: -8, scale: 0.8, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 190, damping: 17, delay: 0.1 }}>
              <Art src={t.image} seed={t.album || t.name} label={t.name} radius={0} />
            </motion.div>
          </div>
          <div className="sheettitle">
            <SplitText as="h2" text={t.name} delay={0.2} />
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5, ease }}>{t.artists.join(', ')}{t.explicit && <em className="exp">E</em>}</motion.p>
            <div className="open">
              <a className="cta" href={t.url} target="_blank" rel="noreferrer">Open in Spotify <Icon.External size={16} /></a>
              <a className="ghostBtn" href={t.uri}>Play in app</a>
            </div>
          </div>
        </div>
        <LayoutGroup id="tabs">
          <div className="seg full">
            {(['details', 'lyrics'] as const).map((k) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {tab === k && <motion.span layoutId="tab-ind" className="ind" transition={spring} />}<span>{k === 'details' ? 'Details' : 'Lyrics'}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <div className="sheetbody">
          <AnimatePresence mode="wait">
            {tab === 'details' ? (
              <motion.div key="d" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <dl className="facts">
                  {[['Album', t.album || '-'], ['Released', t.releaseDate || '-'], ['Length', fmtDur(t.durationMs)], ['Added', t.addedAt ? new Date(t.addedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '-']].map(([k, v], i) => (
                    <motion.div key={k} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.45, ease }}><dt>{k}</dt><dd>{v}</dd></motion.div>
                  ))}
                </dl>
                <h4>On {lists.length} playlist{lists.length === 1 ? '' : 's'}</h4>
                <div className="pls">
                  {lists.map((l, i) => (
                    <motion.button key={l.id} onClick={() => onPlaylist(l.id)} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.05, ...spring }} whileHover={{ y: -3 }}>
                      <Art src={l.image} seed={l.id + l.name} label={l.name} radius={0} />{l.name}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="l" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                {lyr === 'loading' ? <div className="skeleton">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ width: `${55 + ((i * 37) % 40)}%` }} />)}</div>
                  : !lyr ? <Empty text="No lyrics found for this song." />
                  : lyr.instrumental ? <Empty text="This track is instrumental." />
                  : <div className="lyrics">{plain.split('\n').map((ln, i) => <motion.p key={i} initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: Math.min(i, 28) * 0.03, duration: 0.5, ease }}>{ln || ' '}</motion.p>)}<small>Lyrics via {lyr.source}</small></div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}

/* ---------- collection picker + importer ---------- */

function Swatches({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Collection colour">
      {SWATCHES.map((c, i) => (
        <motion.button key={c} role="radio" aria-checked={value === `c${i}`} className={value === `c${i}` ? 'on' : ''} style={{ background: c }} onClick={() => onChange(`c${i}`)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} aria-label={`Colour ${i + 1}`} />
      ))}
    </div>
  )
}

function CollectionPicker({ lib, playlistId, onClose }: { lib: Library; playlistId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(`c${lib.collections.length % SWATCHES.length}`)
  const p = lib.playlists.find((x) => x.id === playlistId)
  useEscape(onClose)
  const create = () => { if (!name.trim()) return; lib.newCollection(name.trim(), color, p?.id); setName('') }
  return (
    <>
      <motion.div className="scrim top" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="modal" initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
        <h3>{p ? `Collections for ${p.name}` : 'New collection'}</h3>
        <p className="muted">Collections are your own folders. Spotify does not share its folders with apps, so they live in this browser.</p>
        {p && (
          <div className="pickl">
            {lib.collections.length === 0 && <small className="muted">No collections yet. Create one below.</small>}
            {lib.collections.map((c, i) => {
              const on = c.playlistIds.includes(p.id)
              return (
                <motion.button key={c.id} className={on ? 'on' : ''} onClick={() => lib.togglePlaylistIn(c.id, p.id)} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <span className="clbl"><i className="dot" style={{ background: swatchOf(c.emoji) }} />{c.name}</span>
                  <motion.i animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}><CheckDraw size={16} /></motion.i>
                </motion.button>
              )
            })}
          </div>
        )}
        <Swatches value={color} onChange={setColor} />
        <div className="newrow">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="New collection name" aria-label="New collection name" />
          <button className="cta small" onClick={create} disabled={!name.trim()}>Create</button>
        </div>
        <button className="ghostBtn full" onClick={onClose}>Done</button>
      </motion.div>
    </>
  )
}

const SAMPLE = `Chill:
  Low Tide
  Rainy Days
Workout:
  Gym Fuel
  Run It Back`

function ImportModal({ lib, onClose }: { lib: Library; onClose: () => void }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [done, setDone] = useState<number | null>(null)
  useEscape(onClose)
  const preview = useMemo(() => (text.trim() ? previewImport(parseFolders(text), lib.playlists) : null), [text, lib.playlists])
  const apply = () => {
    if (!preview) return
    lib.setAllCollections(toCollections(preview, lib.collections, mode))
    setDone(preview.folders.filter((f) => f.matched.length).length)
  }
  return (
    <>
      <motion.div className="scrim top" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="modal wide" initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
        <h3>Import your Spotify folders</h3>
        {done !== null ? (
          <>
            <div className="empty" style={{ padding: '24px 0' }}><Eq /><p>Created {done} collection{done === 1 ? '' : 's'}. Find them as chips in your Library.</p></div>
            <button className="cta full" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <p className="muted">Spotify does not share folders with apps, so paste them here. Write each folder name followed by <code>:</code>, then its playlists underneath (names or Spotify playlist links).</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={SAMPLE} spellCheck={false} aria-label="Folders to import" />
            <button className="link" onClick={() => setText(SAMPLE)}>Use example</button>
            {preview && (
              <div className="preview">
                <small className="muted">{preview.folders.length} folder{preview.folders.length === 1 ? '' : 's'} · {preview.matchedCount} matched · {preview.unmatchedCount} not found</small>
                {preview.folders.map((f, i) => (
                  <motion.div key={f.name + i} className="pf" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <b>{f.name}</b>
                    <div className="pls">
                      {f.matched.map((p) => <Tag key={p.id} tone="lime">{p.name}</Tag>)}
                      {f.unmatched.map((u, j) => <Tag key={j} tone="pink">{u.length > 40 ? u.slice(0, 40) + '…' : u}</Tag>)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            <div className="seg full">
              {(['merge', 'replace'] as const).map((m) => (
                <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{mode === m && <motion.span layoutId="imp-ind" className="ind" transition={spring} />}<span>{m === 'merge' ? 'Add to existing' : 'Replace existing'}</span></button>
              ))}
            </div>
            <div className="newrow">
              <button className="ghostBtn" onClick={onClose}>Cancel</button>
              <button className="cta" style={{ flex: 1 }} disabled={!preview || preview.matchedCount === 0} onClick={apply}>Create collections</button>
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}

/* ---------- misc ---------- */

function Empty({ text }: { text: string }) {
  return <motion.div className="empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}><Eq /><p>{text}</p></motion.div>
}
const escStack: (() => void)[] = []
function useEscape(fn: () => void) {
  useEffect(() => {
    escStack.push(fn)
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && escStack[escStack.length - 1] === fn) fn() }
    window.addEventListener('keydown', h)
    return () => { window.removeEventListener('keydown', h); escStack.splice(escStack.indexOf(fn), 1) }
  }, [fn])
}
let locks = 0
function useLock() {
  useEffect(() => {
    locks++; document.body.classList.add('lock')
    return () => { if (--locks === 0) document.body.classList.remove('lock') }
  }, [])
}
