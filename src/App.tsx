import { useState, useRef, useEffect } from 'react'
import { C, usePrefs, firstName, PrefsProvider } from './prefs'
import { SettingsPage, Avatar, GearButton } from './Settings'
import Cooldown from './Cooldown'
import Focus from './Focus'
import { RecordsProvider, useRecords, series, streakOf, fmtDur, dayKey, ago, type Day } from './records'
import { AuthProvider } from './lib/AuthContext'
import { AuthGate } from './AuthScreens'
import { JournalProvider, useJournal } from './lib/JournalContext'
import { HabitsProvider, useHabits } from './lib/HabitsContext'
import { useAuth } from './lib/AuthContext'
import { anchorReply } from './lib/gemini'

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'home' | 'journal' | 'insights' | 'chat' | 'streaks' | 'settings'
type IconProps = { size?: number; color?: string; className?: string }

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function Icon({ size = 20, color = 'currentColor', children, strokeWidth = 1.6 }: {
  size?: number; color?: string; children: React.ReactNode; strokeWidth?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

// Face icons for moods
function FaceIcon({ level, size = 28, color = 'currentColor' }: { level: number } & IconProps) {
  const mouths = [
    'M8 16Q12 13 16 16',           // rough  — deep frown
    'M8.5 15.5Q12 13.5 15.5 15.5', // low    — slight frown
    'M8.5 14.5H15.5',               // okay   — straight
    'M8.5 14Q12 16.5 15.5 14',     // good   — slight smile
    'M7.5 13.5Q12 17.5 16.5 13.5', // great  — wide smile
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="9.5" cy="9.8" r="0.8" fill={color} stroke="none" />
      <circle cx="14.5" cy="9.8" r="0.8" fill={color} stroke="none" />
      <path d={mouths[level]} />
      {level === 0 && (
        <>
          <path d="M9 7L8 5.5" strokeWidth="1.2" />
          <path d="M15 7L16 5.5" strokeWidth="1.2" />
        </>
      )}
      {level === 4 && (
        <>
          <line x1="19" y1="4" x2="19" y2="5.5" strokeWidth="1.1" />
          <line x1="18.25" y1="4.75" x2="19.75" y2="4.75" strokeWidth="1.1" />
          <line x1="21" y1="7.5" x2="21" y2="8.6" strokeWidth="1.1" />
          <line x1="20.45" y1="8.05" x2="21.55" y2="8.05" strokeWidth="1.1" />
        </>
      )}
    </svg>
  )
}

function FlameIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.6}>
      <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </Icon>
  )
}

function StarIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.6}>
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </Icon>
  )
}

function LightningIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.6}>
      <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </Icon>
  )
}

function MoonIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.6}>
      <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </Icon>
  )
}

function SparklesIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.5}>
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </Icon>
  )
}

function DropletIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.6}>
      <path d="M12 2.25s-7.5 8.5-7.5 12.5a7.5 7.5 0 0015 0C19.5 10.75 12 2.25 12 2.25z" />
    </Icon>
  )
}

function BookIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.6}>
      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </Icon>
  )
}

function ActivityIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.8}>
      <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </Icon>
  )
}

function SunIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.6}>
      <path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </Icon>
  )
}

function ShieldIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Icon size={size} color={color} strokeWidth={1.6}>
      <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </Icon>
  )
}

function TargetIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill={color} stroke="none" />
    </svg>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const MOODS = [
  { label: 'Rough', level: 0 },
  { label: 'Low',   level: 1 },
  { label: 'Okay',  level: 2 },
  { label: 'Good',  level: 3 },
  { label: 'Great', level: 4 },
]

const GNODES = [
  { id: 'stress',    label: 'Stress',     x: 210, y: 155, r: 28, hue: 1.0  },
  { id: 'sleep',     label: 'Sleep',      x: 80,  y: 88,  r: 21, hue: 0.85 },
  { id: 'deadlines', label: 'Deadlines',  x: 318, y: 72,  r: 20, hue: 0.9  },
  { id: 'exams',     label: 'Exams',      x: 375, y: 168, r: 18, hue: 0.78 },
  { id: 'social',    label: 'Social',     x: 60,  y: 215, r: 17, hue: 0.32 },
  { id: 'exercise',  label: 'Exercise',   x: 290, y: 262, r: 17, hue: 0.25 },
  { id: 'caffeine',  label: 'Caffeine',   x: 152, y: 268, r: 16, hue: 0.52 },
  { id: 'study',     label: 'Study Load', x: 396, y: 108, r: 18, hue: 0.72 },
]
const GEDGES = [
  { from: 'sleep',     to: 'stress',    w: 0.85 },
  { from: 'deadlines', to: 'stress',    w: 0.9  },
  { from: 'exams',     to: 'stress',    w: 0.78 },
  { from: 'social',    to: 'stress',    w: 0.28 },
  { from: 'exercise',  to: 'stress',    w: 0.22 },
  { from: 'caffeine',  to: 'stress',    w: 0.5  },
  { from: 'study',     to: 'stress',    w: 0.72 },
  { from: 'sleep',     to: 'deadlines', w: 0.55 },
  { from: 'exercise',  to: 'sleep',     w: 0.42 },
  { from: 'caffeine',  to: 'sleep',     w: 0.58 },
]

const initChat = (name: string): { role: 'ai' | 'user'; text: string }[] => [
  { role: 'ai',   text: `Hey ${name}. I'm Anchor — here whenever you need to talk. How are you holding up today?` },
  { role: 'user', text: "Feeling pretty overwhelmed. Two exams this week and I barely slept." },
  { role: 'ai',   text: "That combination hits hard. When sleep and deadlines collide, everything feels heavier. Want to try a 2-minute breathing reset, or talk through what's on your plate?" },
]

const BADGES: { Icon: (p: IconProps) => React.ReactElement; label: string; earned: boolean }[] = [
  { Icon: LightningIcon, label: 'Consistency',   earned: true  },
  { Icon: MoonIcon,      label: 'Night Owl Fix', earned: true  },
  { Icon: SparklesIcon,  label: 'Mindful Week',  earned: true  },
  { Icon: DropletIcon,   label: 'Hydration Pro', earned: false },
  { Icon: BookIcon,      label: 'Study Master',  earned: false },
  { Icon: ActivityIcon,  label: 'On the Move',   earned: false },
  { Icon: SunIcon,       label: 'Early Bird',    earned: false },
  { Icon: ShieldIcon,    label: 'Resilience',    earned: false },
  { Icon: TargetIcon,    label: 'Goal Setter',   earned: false },
]

// ─── Primitives ───────────────────────────────────────────────────────────────
const hair = { borderColor: C.cardBorder }
const surface = 'rounded-3xl p-4'
const surfaceBg = { background: C.card }
const tint = (p: number) => `color-mix(in srgb, var(--accent) ${p}%, transparent)`

function Page({ title, sub, children, wide }: { title: string; sub?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="@container h-full overflow-y-auto">
      <div className={`mx-auto px-5 pt-3.5 pb-8 @2xl:px-10 @2xl:pt-6 ${wide ? 'max-w-4xl' : 'max-w-xl'}`}>
        <h1 className="font-serif text-4xl leading-9 pr-14" style={{ color: C.textPri }}>{title}</h1>
        {sub && <p className="text-sm mt-3 pr-2" style={{ color: C.textSec }}>{sub}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xs font-medium mb-3" style={{ color: C.textMute }}>{children}</h2>
)

function MiniBars({ data, max }: { data: (number | undefined)[]; max: number }) {
  return (
    <div className="flex items-end gap-[3px] h-5 flex-shrink-0" aria-hidden="true">
      {data.map((v, i) => (
        <span key={i} className="w-1.5 rounded-[2px]"
          style={v === undefined
            ? { height: 2, background: 'color-mix(in srgb, var(--text) 18%, transparent)' }
            : { height: Math.max(4, (v / max) * 20), background: C.amber }} />
      ))}
    </div>
  )
}

function Ring({ value, pct, label }: { value: string; pct: number; label: string }) {
  const r = 30, c = 2 * Math.PI * r
  return (
    <div className="relative w-14 h-14 flex-shrink-0" role="img" aria-label={label}>
      <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="color-mix(in srgb, var(--text) 12%, transparent)" strokeWidth="6" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={C.amber} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold" style={{ color: C.textPri }}>{value}</span>
    </div>
  )
}

function NetworkGraph() {
  const map = Object.fromEntries(GNODES.map(n => [n.id, n]))
  const nodeColor = (hue: number) => hue > 0.75 ? C.terracotta : hue > 0.5 ? C.amber : C.sage
  return (
    <svg viewBox="0 0 440 290" className="w-full h-auto" role="img" aria-label="How sleep, deadlines, exams and other factors connect to stress">
      {GEDGES.map((e, i) => {
        const f = map[e.from], t = map[e.to]
        return <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke={tint(e.w * 55)} strokeWidth={e.w * 3} strokeLinecap="round" />
      })}
      {GNODES.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={nodeColor(n.hue)} opacity={n.id === 'stress' ? 1 : 0.8} />
          <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" fill="var(--text)" opacity="0.65" fontSize="11" fontWeight={n.id === 'stress' ? 600 : 400}>{n.label}</text>
        </g>
      ))}
    </svg>
  )
}

const FACTORS = [
  { label: 'Upcoming deadlines', pct: 88 },
  { label: 'Sleep quality', pct: 82 },
  { label: 'Study load', pct: 71 },
  { label: 'Caffeine intake', pct: 54 },
  { label: 'Exercise', pct: 28, good: true },
]

function FactorBars() {
  return (
    <ul className="space-y-3.5">
      {FACTORS.map(f => (
        <li key={f.label}>
          <div className="flex justify-between text-sm mb-1.5">
            <span style={{ color: C.textSec }}>{f.label}</span>
            <span style={{ color: C.textMute }}>{f.pct}%</span>
          </div>
          <div className="h-[3px]" style={{ background: 'color-mix(in srgb, var(--text) 10%, transparent)' }}>
            <div className="h-full" style={{ width: `${f.pct}%`, background: f.good ? C.sage : C.amber }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const PATTERN = 'Your stress spikes most when sleep drops below 6 hours with upcoming deadlines. The two together are significantly more disruptive than either alone.'

// ─── Cool down, music, SOS ────────────────────────────────────────────────────
const SOS_CONTACTS = [
  { name: 'Crisis line (988)', note: 'Call or text, 24/7, free', tel: '988' },
  { name: 'Campus counseling', note: 'Replace with your campus number', tel: '5550142200' },
]

function useAmbient() {
  const audio = useRef<{ ctx: AudioContext; master: GainNode } | null>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => () => { audio.current?.ctx.close(); audio.current = null }, [])

  const toggle = () => {
    if (!audio.current) {
      const ctx = new AudioContext(), master = ctx.createGain(), lp = ctx.createBiquadFilter()
      master.gain.value = 0
      lp.type = 'lowpass'; lp.frequency.value = 900
      lp.connect(master); master.connect(ctx.destination)
      ;[110, 164.81, 220, 261.63, 329.63].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain()
        o.frequency.value = f; o.detune.value = (i - 2) * 4
        g.gain.value = 0.1; lfo.frequency.value = 0.05 + i * 0.03; lg.gain.value = 0.07
        lfo.connect(lg).connect(g.gain); o.connect(g).connect(lp)
        o.start(); lfo.start()
      })
      audio.current = { ctx, master }
    }
    const { ctx, master } = audio.current
    if (playing) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
      setTimeout(() => ctx.suspend(), 1500)
    } else {
      ctx.resume()
      master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8)
    }
    setPlaying(!playing)
  }
  return { playing, toggle }
}

function SOSSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-[max(env(safe-area-inset-bottom),16px)]" onClick={onClose}
      style={{ background: 'color-mix(in srgb, var(--bg-deep) 82%, transparent)' }}>
      <div role="dialog" aria-label="Get help now" onClick={e => e.stopPropagation()}
        className="sheet w-full max-w-sm rounded-3xl p-5" style={{ background: C.card, boxShadow: '0 16px 48px rgb(0 0 0 / 0.4)' }}>
        <h2 className="font-serif text-2xl" style={{ color: C.textPri }}>You are not alone</h2>
        <p className="text-sm mt-1 mb-3" style={{ color: C.textSec }}>Tap to call someone now.</p>
        <ul>
          {SOS_CONTACTS.map(c => (
            <li key={c.tel} className="border-t" style={hair}>
              <a href={`tel:${c.tel}`} className="flex items-center justify-between py-3">
                <span>
                  <span className="block text-sm" style={{ color: C.textPri }}>{c.name}</span>
                  <span className="block text-xs" style={{ color: C.textMute }}>{c.note}</span>
                </span>
                <span className="text-sm font-medium" style={{ color: C.coral }}>Call</span>
              </a>
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="mt-2 text-sm py-2" style={{ color: C.textSec }}>Close</button>
      </div>
    </div>
  )
}

const IC = {
  cool: 'M12 3c4 4 6 7 6 10a6 6 0 01-12 0c0-3 2-6 6-10z',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z',
  sos: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z',
}

function Actions({ onCooldown, onSOS }: { onCooldown: () => void; onSOS: () => void }) {
  const music = useAmbient()
  const items = [
    { key: 'cool', label: 'Cool down', on: onCooldown, color: C.amber, active: false },
    { key: 'music', label: music.playing ? 'Pause' : 'Music', on: music.toggle, color: C.amber, active: music.playing },
    { key: 'sos', label: 'SOS', on: onSOS, color: C.coral, active: false },
  ] as const
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(a => (
        <button key={a.key} onClick={a.on} aria-pressed={a.key === 'music' ? a.active : undefined}
          className="flex flex-col items-start gap-2 p-3 rounded-2xl text-left active:scale-[0.97] transition-transform"
          style={{ background: a.active ? tint(24) : C.card }}>
          <span className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: `color-mix(in srgb, ${a.color} 18%, transparent)`, color: a.color }}>
            <Icon size={16} strokeWidth={1.8}><path d={IC[a.key]} /></Icon>
          </span>
          <span className="text-sm font-medium" style={{ color: a.key === 'sos' ? C.coral : C.textPri }}>{a.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Screens ──────────────────────────────────────────────────────────────────
const nums = (a: (number | undefined)[]) => a.filter((x): x is number => x !== undefined)

type Tile = { id: string; label: string; src: 'reported' | 'tracked'; cur: (number | undefined)[]; max: number; value: string; note: string; on: () => void }

function makeTile(days: Record<string, Day>, o: {
  id: string; label: string; src: Tile['src']; pick: (d: Day) => number | undefined; max?: number; mode: 'avg' | 'sum'
  value: (n: number) => string; delta: (n: number) => string; eps: number; empty: string; on: () => void
}): Tile {
  const cur = series(days, o.pick), prev = series(days, o.pick, 7)
  const a = nums(cur), b = nums(prev)
  const agg = (x: number[]) => !x.length ? null : x.reduce((s, v) => s + v, 0) / (o.mode === 'avg' ? x.length : 1)
  const c = agg(a), p = agg(b)
  let note = o.empty
  if (c !== null) {
    note = p === null ? `${a.length} ${a.length === 1 ? 'day' : 'days'} this week`
      : Math.abs(c - p) < o.eps ? 'Same as last week'
      : `${c > p ? 'Up' : 'Down'} ${o.delta(Math.abs(c - p))} vs last week`
  }
  return { id: o.id, label: o.label, src: o.src, cur, max: o.max ?? Math.max(1, ...a), value: c === null ? '—' : o.value(c), note, on: o.on }
}

function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-[max(env(safe-area-inset-bottom),16px)]" onClick={onClose}
      style={{ background: 'color-mix(in srgb, var(--bg-deep) 82%, transparent)' }}>
      <div role="dialog" aria-label={label} onClick={e => e.stopPropagation()}
        className="sheet w-full max-w-sm rounded-3xl p-5" style={{ background: C.card, boxShadow: '0 16px 48px rgb(0 0 0 / 0.4)' }}>
        {children}
      </div>
    </div>
  )
}

const SLEEP_LABELS = ['Poor', 'Fair', 'Okay', 'Good', 'Great']

function Home({ onCooldown, onFocus, onSOS }: { onCooldown: () => void; onFocus: () => void; onSOS: () => void }) {
  const { prefs } = usePrefs()
  const { days, setSleep, setMood } = useRecords()
  const [sheet, setSheet] = useState<'sleep' | 'mood' | null>(null)
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const tiles = [
    makeTile(days, { id: 'sleep', label: 'Sleep', src: 'reported', pick: d => d.sleep, max: 5, mode: 'avg', eps: 0.05,
      value: n => `${n.toFixed(1)}/5`, delta: n => n.toFixed(1), empty: 'Rate last night', on: () => setSheet('sleep') }),
    makeTile(days, { id: 'focus', label: 'Focus', src: 'tracked', pick: d => d.focusSec, mode: 'sum', eps: 30,
      value: fmtDur, delta: fmtDur, empty: 'Start a session', on: onFocus }),
    makeTile(days, { id: 'mood', label: 'Mood', src: 'reported', pick: d => d.mood === undefined ? undefined : d.mood + 1, max: 5, mode: 'avg', eps: 0.05,
      value: n => `${n.toFixed(1)}/5`, delta: n => n.toFixed(1), empty: 'Log how you feel', on: () => setSheet('mood') }),
    makeTile(days, { id: 'calm', label: 'Cool down', src: 'tracked', pick: d => d.calmSec, mode: 'sum', eps: 30,
      value: fmtDur, delta: fmtDur, empty: 'Try a breathing exercise', on: onCooldown }),
  ]

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = ago(6 - i), rec = days[dayKey(d)]
    return { key: dayKey(d), letter: 'SMTWTFS'[d.getDay()], mood: rec?.mood, any: !!rec && Object.keys(rec).length > 0, today: i === 6 }
  })
  const logged = week.filter(w => w.any).length
  const streak = streakOf(days)
  const hasAny = Object.keys(days).length > 0
  const todayDone = week[6].any

  return (
    <div className="@container h-full overflow-y-auto">
      <div className="min-h-[540px] h-full grid gap-3 px-5 pb-3 pt-3 @2xl:px-10 @2xl:pb-8 @2xl:pt-4 @2xl:gap-x-10 @2xl:gap-y-6 max-w-6xl mx-auto
        grid-rows-[auto_auto_auto_auto_minmax(0,1fr)] @2xl:grid-cols-[3fr_2fr] @2xl:grid-rows-[auto_auto_minmax(0,1fr)]">
        <p className="text-sm h-10 flex items-center pr-14 @2xl:col-span-2" style={{ color: C.textSec }}>{hello}, {firstName(prefs)}</p>

        <section className="flex items-center justify-between gap-4 rounded-3xl p-4"
          style={{ background: `linear-gradient(150deg, ${tint(24)}, ${C.card} 70%)` }}>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl leading-tight" style={{ color: C.textPri }}>{hasAny ? 'This week' : 'Nothing logged yet'}</h1>
            <p className="text-[13px] leading-snug mt-1" style={{ color: C.textSec }}>
              {hasAny
                ? `${logged} of 7 days logged${streak > 1 ? `, ${streak}-day streak` : ''}. ${todayDone ? 'Nice, today is covered.' : 'Nothing logged today yet.'}`
                : 'Rate your sleep, check in on your mood or start a focus session. Your trends build from that.'}
            </p>
          </div>
          <Ring value={`${logged}/7`} pct={logged / 7} label={`${logged} of the last 7 days have entries`} />
        </section>

        <div className="@2xl:self-start"><Actions onCooldown={onCooldown} onSOS={onSOS} /></div>

        <section className="@2xl:row-start-3 @2xl:col-start-1 @2xl:self-start grid grid-cols-2 gap-3" aria-label="Weekly metrics">
          {tiles.map(m => (
            <button key={m.id} onClick={m.on} className="flex flex-col gap-1 rounded-2xl p-2.5 text-left min-w-0" style={surfaceBg}>
              <span className="flex items-center justify-between gap-1">
                <span className="text-xs" style={{ color: C.textSec }}>{m.label}</span>
                <span className="text-[10px] leading-none px-1.5 py-1 rounded-full whitespace-nowrap"
                  style={m.src === 'tracked'
                    ? { background: tint(20), color: C.amber }
                    : { border: `1px solid ${C.cardBorder}`, color: C.textMute }}>
                  {m.src === 'tracked' ? 'Tracked in app' : 'Self-reported'}
                </span>
              </span>
              <span className="flex items-end justify-between gap-2">
                <span className="text-xl leading-7 font-semibold" style={{ color: m.value === '—' ? C.textMute : C.textPri }}>{m.value}</span>
                <MiniBars data={m.cur} max={m.max} />
              </span>
              <span className="text-[11px] truncate" style={{ color: m.value === '—' ? C.amber : C.textMute }}>{m.note}</span>
            </button>
          ))}
        </section>

        <section className="min-h-0 flex flex-col justify-between gap-2 rounded-3xl p-3 @2xl:self-start" style={surfaceBg} aria-label="Last 7 days">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-medium" style={{ color: C.textSec }}>Last 7 days</h2>
            <span className="text-[11px]" style={{ color: C.textMute }}>Shaded by your mood check-in</span>
          </div>
          <ul className="flex justify-between">
            {week.map(w => (
              <li key={w.key} className="flex flex-col items-center gap-1" title={w.key}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={w.mood !== undefined ? { background: tint(20 + w.mood * 18) }
                    : { border: `1.5px dashed ${w.today ? C.amber : C.cardBorder}` }}>
                  {w.mood === undefined && w.any && <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.amber }} />}
                </span>
                <span className="text-[11px]" style={{ color: w.today ? C.textPri : C.textMute }}>{w.letter}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {sheet === 'sleep' && (
        <Sheet label="Rate your sleep" onClose={() => setSheet(null)}>
          <h2 className="font-serif text-2xl" style={{ color: C.textPri }}>How did you sleep last night?</h2>
          <p className="text-xs mt-1 mb-4" style={{ color: C.textMute }}>Self-reported. Anchor does not track sleep automatically.</p>
          <div className="grid grid-cols-5 gap-1.5">
            {SLEEP_LABELS.map((l, i) => {
              const on = days[dayKey()]?.sleep === i + 1
              return (
                <button key={l} aria-pressed={on} onClick={() => { setSleep(i + 1); setSheet(null) }}
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl"
                  style={on ? { background: C.amber, color: C.onAccent } : { background: 'color-mix(in srgb, var(--text) 8%, transparent)', color: C.textPri }}>
                  <span className="text-lg font-semibold leading-none">{i + 1}</span>
                  <span className="text-[11px]">{l}</span>
                </button>
              )
            })}
          </div>
        </Sheet>
      )}
      {sheet === 'mood' && (
        <Sheet label="Mood check-in" onClose={() => setSheet(null)}>
          <h2 className="font-serif text-2xl" style={{ color: C.textPri }}>How are you feeling?</h2>
          <p className="text-xs mt-1 mb-4" style={{ color: C.textMute }}>Self-reported. Your latest check-in today is the one that counts.</p>
          <div className="grid grid-cols-5 gap-1.5">
            {MOODS.map(m => {
              const on = days[dayKey()]?.mood === m.level
              return (
                <button key={m.level} aria-pressed={on} onClick={() => { setMood(m.level); setSheet(null) }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl"
                  style={on ? { background: C.amber, color: C.onAccent } : { background: 'color-mix(in srgb, var(--text) 8%, transparent)', color: C.textPri }}>
                  <FaceIcon level={m.level} size={26} />
                  <span className="text-[11px]">{m.label}</span>
                </button>
              )
            })}
          </div>
        </Sheet>
      )}
    </div>
  )
}

// ─── Journal (Supabase-backed) ────────────────────────────────────────────────
function Journal() {
  const { days, setMood } = useRecords()
  const { entries, loading, save, deleteEntry } = useJournal()
  const mood = days[dayKey()]?.mood
  const [entry, setEntry] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Pre-fill today's existing entry if it exists
  useEffect(() => {
    const today = dayKey()
    const todayEntry = entries.find(e => e.day === today)
    if (todayEntry && !entry) setEntry(todayEntry.content)
  }, [entries]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    await save(entry, mood ?? null)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <Page title="Check in" sub="How are you right now? Your mood is saved for today.">
      <div className="flex justify-between" role="radiogroup" aria-label="Mood">
        {MOODS.map(m => (
          <button key={m.level} role="radio" aria-checked={mood === m.level} onClick={() => setMood(m.level)}
            className="flex flex-col items-center gap-1.5 w-16 py-2 rounded-lg"
            style={mood === m.level ? { background: tint(16) } : undefined}>
            <FaceIcon level={m.level} size={28} color={mood === m.level ? C.amber : C.textMute} />
            <span className="text-xs" style={{ color: mood === m.level ? C.textPri : C.textMute }}>{m.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Label>Journal</Label>
        <textarea value={entry} onChange={e => setEntry(e.target.value)} rows={5} placeholder="What's been on your mind today?"
          className="field resize-none leading-relaxed" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: C.textMute }}>{entry.length} characters</span>
          <button onClick={handleSave} disabled={saving || !entry.trim()}
            className="px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-40" style={{ background: C.amber, color: C.onAccent }}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save entry'}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <Label>Recent entries</Label>
        {loading && <p className="text-xs" style={{ color: C.textMute }}>Loading…</p>}
        <ul>
          {entries.slice(0, 5).map(e => (
            <li key={e.id} className={`${surface} mb-2.5 relative group`} style={surfaceBg}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {e.mood !== null && e.mood !== undefined && <FaceIcon level={e.mood} size={16} color={C.textMute} />}
                  <span className="text-xs" style={{ color: C.textMute }}>
                    {new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <button
                  onClick={() => deleteEntry(e.id)}
                  aria-label="Delete entry"
                  title="Delete entry"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-xs transition-opacity"
                  style={{ color: C.coral }}
                >
                  <Icon size={14}><path d="M18 6L6 18M6 6l12 12" /></Icon>
                </button>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: C.textSec }}>{e.content}</p>
            </li>
          ))}
          {!loading && entries.length === 0 && (
            <li className="text-sm" style={{ color: C.textMute }}>No entries yet. Write your first one above.</li>
          )}
        </ul>
      </div>
    </Page>
  )
}

function Insights() {
  return (
    <Page title="Insights" sub="What is driving your stress" wide>
      <div className="grid @2xl:grid-cols-[1.3fr_1fr] gap-x-12 gap-y-8">
        <div className={surface} style={surfaceBg}>
          <Label>Connections</Label>
          <NetworkGraph />
          <p className="text-sm leading-relaxed mt-4" style={{ color: C.textSec }}>{PATTERN}</p>
        </div>
        <div className={surface} style={surfaceBg}>
          <Label>Top factors this week</Label>
          <FactorBars />
        </div>
      </div>
    </Page>
  )
}

// ─── Streaks (Supabase-backed habits) ────────────────────────────────────────
function Streaks() {
  const { habits, loading, toggle, addHabit, removeHabit, completedToday } = useHabits()
  const { days } = useRecords()
  const streak = streakOf(days)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [savingHabit, setSavingHabit] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim() || savingHabit) return
    setSavingHabit(true)
    await addHabit(newLabel.trim(), '#5B8FBF')
    setNewLabel('')
    setSavingHabit(false)
    setAdding(false)
  }

  return (
    <Page title="Habits" sub={streak > 0 ? `${streak}-day streak. Keep it going.` : 'Build your daily habits.'}>
      <div className="flex items-end justify-between gap-4 rounded-3xl p-5" style={{ background: `linear-gradient(150deg, ${tint(24)}, ${C.card} 70%)` }}>
        <div>
          <p className="text-xs" style={{ color: C.textMute }}>Streak</p>
          <p className="font-serif text-5xl leading-none mt-1" style={{ color: C.textPri }}>{streak}</p>
        </div>
        <div className="flex-1 max-w-[220px]">
          <div className="h-[3px]" style={{ background: 'color-mix(in srgb, var(--text) 10%, transparent)' }}>
            <div className="h-full" style={{ width: `${Math.min(100, (completedToday / Math.max(1, habits.length)) * 100)}%`, background: C.amber }} />
          </div>
          <p className="text-xs mt-1.5" style={{ color: C.textMute }}>{completedToday}/{habits.length} habits today</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <Label>Today</Label>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: C.textMute }}>{completedToday}/{habits.length}</span>
            <button
              onClick={() => setAdding(!adding)}
              className="text-xs font-medium px-2 py-1 rounded-md transition-colors"
              style={{ background: tint(16), color: C.amber }}
            >
              {adding ? 'Cancel' : '+ New habit'}
            </button>
          </div>
        </div>

        {adding && (
          <form onSubmit={handleAdd} className="mb-3 p-3 rounded-2xl flex gap-2" style={surfaceBg}>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. 15 min reading"
              autoFocus
              className="field flex-1 !py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={savingHabit || !newLabel.trim()}
              className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40"
              style={{ background: C.amber, color: C.onAccent }}
            >
              {savingHabit ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}

        {loading
          ? <p className="text-xs" style={{ color: C.textMute }}>Loading habits…</p>
          : (
            <ul className="rounded-3xl px-4 py-1" style={surfaceBg}>
              {habits.map(h => (
                <li key={h.id} className="border-t first:border-t-0 flex items-center justify-between group" style={hair}>
                  <button onClick={() => toggle(h.id)} role="checkbox" aria-checked={h.done} className="flex items-center gap-3 flex-1 py-3.5 text-left">
                    <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={h.done ? { background: C.amber } : { border: '1.5px solid color-mix(in srgb, var(--text) 30%, transparent)' }}>
                      {h.done && <Icon size={12} color={C.onAccent} strokeWidth={3}><path d="M5 13l4 4L19 7" /></Icon>}
                    </span>
                    <span className="text-sm" style={{ color: h.done ? C.textMute : C.textPri, textDecoration: h.done ? 'line-through' : 'none' }}>{h.label}</span>
                  </button>
                  <button
                    onClick={() => removeHabit(h.id)}
                    aria-label={`Remove ${h.label}`}
                    title="Remove habit"
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-xs transition-opacity"
                    style={{ color: C.textMute }}
                  >
                    <Icon size={14}><path d="M18 6L6 18M6 6l12 12" /></Icon>
                  </button>
                </li>
              ))}
            </ul>
          )
        }
      </div>

      <div className="mt-8">
        <Label>Badges</Label>
        <ul className="grid grid-cols-3 gap-y-5">
          {BADGES.map(b => (
            <li key={b.label} className="flex flex-col items-center gap-1.5 text-center" style={{ opacity: b.earned ? 1 : 0.4 }}>
              <b.Icon size={24} color={b.earned ? C.amber : C.textSec} />
              <span className="text-xs" style={{ color: b.earned ? C.textPri : C.textMute }}>{b.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  )
}

function ChatPane() {
  const { prefs } = usePrefs()
  const [msgs, setMsgs] = useState<{ role: 'ai' | 'user'; text: string }[]>(() => initChat(firstName(prefs)))
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const quick: Record<string, string> = {
    'Breathing exercise': 'Box breathing: 4 counts in, hold 4, out 4, hold 4. Repeat 4 times. Want me to guide you?',
    'Talk it out': "Of course. What's the heaviest thing on your mind right now?",
    'Just venting': "Go ahead, I'm listening. No advice unless you ask.",
  }
  const send = (text: string) => {
    const t = text.trim()
    if (!t) return
    const nextMsgs: { role: 'ai' | 'user'; text: string }[] = [...msgs, { role: 'user', text: t }]
    setMsgs(nextMsgs)
    setInput('')
    setTyping(true)

    anchorReply(nextMsgs, t)
      .then(text => {
        setMsgs(m => [...m, { role: 'ai', text }])
      })
      .catch(err => {
        console.error(err)
        setMsgs(m => [...m, { role: 'ai', text: "I'm having trouble connecting right now. Please try again in a moment." }])
      })
      .finally(() => setTyping(false))
  }
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full">
      <div className="px-5 pt-3 pb-3 flex-shrink-0">
        <h1 className="font-serif text-4xl leading-9 pr-14" style={{ color: C.textPri }}>Anchor</h1>
        <p className="text-xs mt-2" style={{ color: C.textMute }}>Your private space to talk.</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2 space-y-3" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed"
              style={m.role === 'user' ? { background: C.amber, color: C.onAccent } : { background: C.card, color: C.textPri }}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div className="inline-flex gap-1 px-4 py-3.5 rounded-lg" style={{ background: C.card }}>
            {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: C.textSec, animation: `dot-bounce 1s ${i * 0.18}s ease-in-out infinite` }} />)}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="px-5 pt-2 flex gap-2 overflow-x-auto flex-shrink-0">
        {Object.keys(quick).map(r => (
          <button key={r} onClick={() => send(r)} className="px-3 py-1.5 rounded-md text-xs whitespace-nowrap border" style={{ color: C.textSec, borderColor: C.cardBorder }}>{r}</button>
        ))}
      </div>
      <div className="p-5 pt-3 flex gap-2 flex-shrink-0">
        <input value={input} onChange={e => setInput(e.target.value)} aria-label="Message" placeholder="Type something…" className="field flex-1"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }} />
        <button onClick={() => send(input)} className="px-4 rounded-md text-sm font-medium" style={{ background: C.amber, color: C.onAccent }}>Send</button>
      </div>
    </div>
  )
}

// ─── Navigation + shell ───────────────────────────────────────────────────────
const NAV: { id: Screen; label: string; path: string }[] = [
  { id: 'home', label: 'Home', path: 'M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z' },
  { id: 'journal', label: 'Check in', path: 'M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4zM8 8h8M8 12h6' },
  { id: 'insights', label: 'Insights', path: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  { id: 'chat', label: 'Chat', path: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { id: 'streaks', label: 'Habits', path: 'M22 11.1V12a10 10 0 11-5.9-9.1M22 4L12 14l-3-3' },
]

function Sidebar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const { prefs } = usePrefs()
  return (
    <nav aria-label="Main" className="w-52 flex-shrink-0 flex flex-col px-3 py-6" style={{ background: C.sidebar, borderRight: `1px solid ${C.cardBorder}` }}>
      <p className="font-serif text-3xl px-3 mb-6" style={{ color: C.textPri }}>Anchor</p>
      <ul className="flex-1 space-y-0.5">
        {NAV.map(n => (
          <li key={n.id}>
            <button onClick={() => setScreen(n.id)} aria-current={screen === n.id ? 'page' : undefined}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-left"
              style={screen === n.id ? { background: tint(14), color: C.textPri } : { color: C.textSec }}>
              <Icon size={18} strokeWidth={1.6}><path d={n.path} /></Icon>{n.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2.5 px-3 pt-4 border-t" style={hair}>
        <Avatar className="w-8 h-8 text-sm" />
        <span className="text-sm truncate" style={{ color: C.textSec }}>{firstName(prefs)}</span>
      </div>
    </nav>
  )
}

function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  return (
    <nav aria-label="Main" className="flex-shrink-0 flex gap-1 p-1.5 mx-4 mt-2 mb-[max(env(safe-area-inset-bottom),12px)] rounded-full"
      style={{ background: C.card, boxShadow: '0 8px 24px rgb(0 0 0 / 0.35)' }}>
      {NAV.map(n => {
        const on = screen === n.id
        return (
          <button key={n.id} onClick={() => setScreen(n.id)} aria-current={on ? 'page' : undefined} aria-label={n.label}
            className={`h-11 rounded-full flex items-center justify-center gap-1.5 text-sm font-medium transition-all ${on ? 'flex-[2.3] px-3' : 'flex-1'}`}
            style={on ? { background: C.amber, color: C.onAccent } : { color: C.textSec }}>
            <Icon size={20} strokeWidth={on ? 2 : 1.7}><path d={n.path} /></Icon>
            {on && <span className="truncate">{n.label}</span>}
          </button>
        )
      })}
    </nav>
  )
}

function useIsDesktop() {
  const q = '(min-width: 1024px)'
  const [d, setD] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const m = matchMedia(q), h = () => setD(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [])
  return d
}

function Shell() {
  const desktop = useIsDesktop()
  const { signOut } = useAuth()
  const [screen, setScreen] = useState<Screen>('home')
  const [cool, setCool] = useState(false)
  const [sos, setSOS] = useState(false)
  const [focus, setFocus] = useState(false)
  const inSettings = screen === 'settings'
  const prev = useRef<Screen>('home')
  const open = (s: Screen) => { if (s === 'settings' && screen !== 'settings') prev.current = screen; setScreen(s) }

  const view = {
    home: <Home onCooldown={() => setCool(true)} onFocus={() => setFocus(true)} onSOS={() => setSOS(true)} />,
    journal: <Journal />, insights: <Insights />, streaks: <Streaks />, chat: <ChatPane />,
    settings: <SettingsPage onBack={() => setScreen(prev.current)} onSignOut={signOut} />,
  }[screen]

  return (
    <div className="h-dvh flex overflow-hidden pt-[max(env(safe-area-inset-top),56px)] lg:pt-0" style={{ background: C.bg, color: C.textPri }}>
      {desktop && <Sidebar screen={screen} setScreen={open} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-h-0 relative">
          <div key={screen} className="enter h-full">{view}</div>
          {!inSettings && <GearButton onClick={() => open('settings')} className="absolute top-3 right-3 z-10" />}
        </main>
        {!desktop && !inSettings && <BottomNav screen={screen} setScreen={open} />}
      </div>
      {cool && <Cooldown onClose={() => setCool(false)} />}
      {focus && <Focus onClose={() => setFocus(false)} />}
      {sos && <SOSSheet onClose={() => setSOS(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <PrefsProvider>
          <RecordsProvider>
            <JournalProvider>
              <HabitsProvider>
                <Shell />
              </HabitsProvider>
            </JournalProvider>
          </RecordsProvider>
        </PrefsProvider>
      </AuthGate>
    </AuthProvider>
  )
}
