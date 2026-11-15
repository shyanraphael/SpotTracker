import { motion, useReducedMotion, useSpring } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { ElementType, ReactNode } from 'react'

export const ease = [0.16, 1, 0.3, 1] as const
export const spring = { type: 'spring', stiffness: 280, damping: 30 } as const

export const SWATCHES = ['#1ed760', '#8b6bff', '#d6ff5a', '#ff4d8d', '#3dd9ff', '#ffb23d']
export const hueOf = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}
/** Collections store a swatch key like "c2"; older data may hold an emoji, which falls back to a hashed swatch. */
export const swatchOf = (key: string) => SWATCHES[/^c\d$/.test(key) ? Number(key[1]) % SWATCHES.length : hueOf(key) % SWATCHES.length]

export const fmtDur = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`
export const fmtTotal = (ms: number) => {
  const m = Math.round(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}
export const fmtAgo = (ts: number) => {
  const s = (Date.now() - ts) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Album art. Without an image it prints a two-tone poster tile from the seed, so empty states still look billed. */
export function Art({ src, seed, label, className = '', radius }: { src: string; seed: string; label?: string; className?: string; radius?: number }) {
  const [bad, setBad] = useState(false)
  const k = hueOf(seed) % SWATCHES.length
  const style = { borderRadius: radius, background: SWATCHES[k], color: '#0a0d0b' }
  return (
    <div className={`art ${className}`} style={style}>
      {src && !bad ? <img src={src} alt="" loading="lazy" onError={() => setBad(true)} /> : <span>{(label ?? seed).trim().charAt(0).toUpperCase()}</span>}
    </div>
  )
}

/** Average saturated colour of an image, used to tint overlays. Falls back to a hue from the seed. */
export function useColor(src: string, seed: string) {
  const [c, setC] = useState(`hsl(${(hueOf(seed) + 250) % 360} 60% 40%)`)
  useEffect(() => {
    setC(`hsl(${(hueOf(seed) + 250) % 360} 60% 40%)`)
    if (!src) return
    let dead = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const cv = document.createElement('canvas'); cv.width = cv.height = 8
        const ctx = cv.getContext('2d')!
        ctx.drawImage(img, 0, 0, 8, 8)
        const d = ctx.getImageData(0, 0, 8, 8).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < d.length; i += 4) {
          const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2])
          const w = 1 + (mx - mn) / 48
          r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; n += w
        }
        if (!dead) setC(`rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`)
      } catch { /* canvas tainted: keep fallback */ }
    }
    img.src = src
    return () => { dead = true }
  }, [src, seed])
  return c
}

export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(value)
  useEffect(() => {
    if (reduce) { setN(value); return }
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 1300)
      setN(Math.round(value * (1 - Math.pow(1 - k, 4))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduce])
  return <span className={className}>{n.toLocaleString()}</span>
}

/** Poster-style headline: every letter rises out of a mask, one after another. */
export function SplitText({ text, className, delay = 0, as: Tag = 'h2' }: { text: string; className?: string; delay?: number; as?: ElementType }) {
  let i = 0
  return (
    <Tag className={`split ${className ?? ''}`} aria-label={text}>
      {text.split(' ').map((w, wi) => (
        <span key={wi} className="word" aria-hidden>
          {[...w].map((ch, ci) => (
            <motion.span key={ci} className="ch" initial={{ y: '112%', rotate: 7 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: 0.75, ease, delay: delay + i++ * 0.03 }}>{ch}</motion.span>
          ))}
        </span>
      ))}
    </Tag>
  )
}

/** Button wrapper that leans toward the pointer. */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const x = useSpring(0, { stiffness: 220, damping: 16 }), y = useSpring(0, { stiffness: 220, damping: 16 })
  return (
    <motion.span ref={ref} className="magnetic" style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return
        const r = ref.current!.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength); y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => { x.set(0); y.set(0) }}>{children}</motion.span>
  )
}

/** Four-bar equaliser used as the brand mark and as a "playing here" indicator. */
export function Eq({ on = true, className = '' }: { on?: boolean; className?: string }) {
  return <span className={`eqm ${on ? 'on' : ''} ${className}`} aria-hidden><i /><i /><i /><i /></span>
}

/** SpotTracker mark: a green spot with four level bars and a lime pin marking the tracked point. */
export function Logo({ on = false, size = 30 }: { on?: boolean; size?: number }) {
  const bars: [number, number][] = [[19, 14], [27, 26], [35, 18], [43, 22]]
  return (
    <svg className={`logo ${on ? 'on' : ''}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="28" fill="var(--accent)" />
      {bars.map(([x, h], i) => <rect key={x} className="lbar" style={{ animationDelay: `${-i * 0.23}s` }} x={x} y={44 - h} width="6" height={h} fill="#0a0d0b" />)}
      <rect x="46" y="6" width="11" height="11" transform="rotate(45 51.5 11.5)" fill="var(--lime)" stroke="var(--ink)" strokeWidth="3" />
    </svg>
  )
}

const P = (d: ReactNode) => (p: { size?: number }) => (
  <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="square" strokeLinejoin="miter" aria-hidden>{d}</svg>
)
export const Icon = {
  Library: P(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>),
  Songs: P(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>),
  Activity: P(<path d="M3 12h4l3-8 4 16 3-8h4" />),
  Search: P(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>),
  Refresh: P(<><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></>),
  Close: P(<path d="M18 6 6 18M6 6l12 12" />),
  External: P(<><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5H5V6h5" /></>),
  Arrow: P(<path d="M5 12h14M13 6l6 6-6 6" />),
  Folder: P(<path d="M3 6h7l2 2h9v11H3z" />),
  Plus: P(<path d="M12 5v14M5 12h14" />),
  Back: P(<path d="m15 18-6-6 6-6" />),
  Lock: P(<><rect x="4" y="11" width="16" height="10" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  Sun: P(<><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>),
  Moon: P(<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />),
  Out: P(<><path d="M9 21H5V3h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>),
}
export function CheckDraw({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" aria-hidden>
      <motion.path d="m4 12.5 5 5L20 6.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease }} />
    </svg>
  )
}

export function Tag({ children, tone }: { children: ReactNode; tone?: 'orange' | 'violet' | 'lime' | 'pink' }) {
  return <span className={`tag ${tone ?? ''}`}>{children}</span>
}
