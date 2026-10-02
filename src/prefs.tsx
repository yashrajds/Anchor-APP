import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './lib/AuthContext'

// Colors resolve through CSS variables so a theme switch repaints the whole app.
const mix = (v: string, pct: string, base = 'transparent') => `color-mix(in srgb, var(${v}) ${pct}, ${base})`
export const C = {
  bg: 'var(--bg)',
  card: 'var(--card)',
  cardBorder: mix('--text', '11%'),
  sidebar: mix('--bg-deep', '100%'),
  grad: 'var(--accent)',
  amber: 'var(--accent)',
  terracotta: 'var(--sec)',
  sage: '#6D9B72',
  coral: '#E07A5F',
  onAccent: 'var(--on-accent)',
  textPri: 'var(--text)',
  textSec: mix('--text', 'var(--m-sec)', 'var(--bg)'),
  textMute: mix('--text', 'var(--m-mute)', 'var(--bg)'),
}

export const THEMES = [
  { id: 'forest',   name: 'Soft Forest',       bg: '#171F1B', card: '#26352C', accent: '#C2D5A3', text: '#E7EBDD', sec: '#829B68' },
  { id: 'sage',     name: 'Sage & Serenity',   bg: '#1C2924', card: '#293B32', accent: '#A3BFA8', text: '#D9E5D8', sec: '#729178' },
  { id: 'lavender', name: 'Midnight Lavender', bg: '#201D28', card: '#302A40', accent: '#B7A5E8', text: '#E8E1F2', sec: '#8275B5' },
  { id: 'ocean',    name: 'Ocean Calm',        bg: '#17272D', card: '#223A42', accent: '#79C7C5', text: '#DCECE8', sec: '#4E9998' },
  { id: 'sand',     name: 'Warm Sand',         bg: '#28231F', card: '#39312A', accent: '#D6B58C', text: '#F0E7D9', sec: '#A88B69' },
]

export type Prefs = {
  theme: string
  profile: { name: string; photo: string; email: string; phone: string; course: string; year: string; birthday: string; joined: string }
  notif: { checkin: boolean; checkinTime: string; streak: boolean; weekly: boolean; quiet: boolean; quietStart: string; quietEnd: string }
  a11y: { textSize: 'sm' | 'md' | 'lg'; reduceMotion: boolean; contrast: boolean }
}

const DEFAULTS: Prefs = {
  theme: 'forest',
  profile: { name: '', photo: '', email: '', phone: '', course: '', year: '', birthday: '', joined: new Date().toISOString().slice(0, 10) },
  notif: { checkin: false, checkinTime: '09:00', streak: false, weekly: false, quiet: false, quietStart: '22:00', quietEnd: '07:00' },
  a11y: { textSize: 'md', reduceMotion: false, contrast: false },
}

const STORAGE_KEY = 'anchor.prefs.v2'

function loadLocal(): Prefs {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return { ...DEFAULTS, ...s, profile: { ...DEFAULTS.profile, ...s.profile }, notif: { ...DEFAULTS.notif, ...s.notif }, a11y: { ...DEFAULTS.a11y, ...s.a11y } }
  } catch { return { ...DEFAULTS } }
}

function apply(p: Prefs) {
  const t = THEMES.find(x => x.id === p.theme) || THEMES[0]
  const el = document.documentElement
  const vars: Record<string, string> = {
    '--bg': t.bg, '--card': t.card, '--accent': t.accent, '--text': t.text, '--sec': t.sec, '--on-accent': t.bg,
    '--m-sec': p.a11y.contrast ? '88%' : '66%', '--m-mute': p.a11y.contrast ? '70%' : '46%',
  }
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v))
  el.style.fontSize = { sm: '87.5%', md: '100%', lg: '112.5%' }[p.a11y.textSize]
  el.classList.toggle('reduce-motion', p.a11y.reduceMotion)
}
apply(loadLocal())

const RULES = [
  { key: 'checkin' as const, time: (p: Prefs) => p.notif.checkinTime, title: 'Mood check-in', body: 'Take a minute to log how you feel.' },
  { key: 'streak' as const, time: () => '20:00', title: 'Keep your streak', body: "Finish today's habits to keep your streak going." },
  { key: 'weekly' as const, time: () => '10:00', day: 0, title: 'Your weekly insights', body: 'See what shaped your stress this week.' },
]

export const inQuiet = (hm: string, start: string, end: string) =>
  start <= end ? hm >= start && hm < end : hm >= start || hm < end

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function fetchRemotePrefs(userId: string): Promise<Partial<Prefs>> {
  const [profileRes, prefsRes] = await Promise.all([
    supabase.from('profiles').select('name, email, photo_url, course, year, birthday, joined').eq('id', userId).single(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
  ])

  const out: Partial<Prefs> = {}

  if (profileRes.data) {
    out.profile = {
      name: profileRes.data.name || '',
      email: profileRes.data.email || '',
      photo: profileRes.data.photo_url || '',
      phone: '',
      course: profileRes.data.course || '',
      year: profileRes.data.year || '',
      birthday: profileRes.data.birthday || '',
      joined: profileRes.data.joined || new Date().toISOString().slice(0, 10),
    }
  }

  if (prefsRes.data) {
    const p = prefsRes.data
    out.theme = p.theme || 'forest'
    out.notif = {
      checkin: p.notif_checkin ?? false,
      checkinTime: p.notif_checkin_time ?? '09:00',
      streak: p.notif_streak ?? false,
      weekly: p.notif_weekly ?? false,
      quiet: p.notif_quiet ?? false,
      quietStart: p.notif_quiet_start ?? '22:00',
      quietEnd: p.notif_quiet_end ?? '07:00',
    }
    out.a11y = {
      textSize: (p.a11y_text_size as 'sm' | 'md' | 'lg') ?? 'md',
      reduceMotion: p.a11y_reduce_motion ?? false,
      contrast: p.a11y_contrast ?? false,
    }
  }

  return out
}

async function saveRemotePrefs(userId: string, prefs: Prefs) {
  const { profile: pf } = prefs
  await Promise.all([
    supabase.from('profiles').update({
      name: pf.name,
      photo_url: pf.photo || null,
      course: pf.course || null,
      year: pf.year || null,
      birthday: pf.birthday || null,
    }).eq('id', userId),
    supabase.from('user_preferences').upsert({
      user_id: userId,
      theme: prefs.theme,
      notif_checkin: prefs.notif.checkin,
      notif_checkin_time: prefs.notif.checkinTime,
      notif_streak: prefs.notif.streak,
      notif_weekly: prefs.notif.weekly,
      notif_quiet: prefs.notif.quiet,
      notif_quiet_start: prefs.notif.quietStart,
      notif_quiet_end: prefs.notif.quietEnd,
      a11y_text_size: prefs.a11y.textSize,
      a11y_reduce_motion: prefs.a11y.reduceMotion,
      a11y_contrast: prefs.a11y.contrast,
    }, { onConflict: 'user_id' }),
  ])
}

// ─── Context ──────────────────────────────────────────────────────────────────
type Ctx = { prefs: Prefs; update: (patch: Partial<Prefs>) => void; syncing: boolean }
const PrefsCtx = createContext<Ctx>(null!)
export const usePrefs = () => useContext(PrefsCtx)
export const firstName = (p: Prefs) => p.profile.name.trim().split(/\s+/)[0] || 'there'

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [prefs, setPrefs] = useState(loadLocal)
  const [syncing, setSyncing] = useState(false)
  const latest = useRef(prefs)
  const fired = useRef<Record<string, string>>({})
  const saveTimer = useRef<number>(0)
  latest.current = prefs

  // Apply theme/a11y CSS variables whenever prefs change
  useEffect(() => {
    apply(prefs)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch { /* storage full */ }
  }, [prefs])

  // Load remote prefs when user logs in
  useEffect(() => {
    if (!userId) return
    setSyncing(true)
    fetchRemotePrefs(userId).then(remote => {
      setPrefs(prev => {
        const merged = {
          ...prev,
          ...remote,
          profile: { ...prev.profile, ...remote.profile },
          notif: { ...prev.notif, ...remote.notif },
          a11y: { ...prev.a11y, ...remote.a11y },
        }
        return merged
      })
      setSyncing(false)
    }).catch(() => setSyncing(false))
  }, [userId])

  // Notification scheduling
  useEffect(() => {
    const id = setInterval(() => {
      const p = latest.current, now = new Date()
      const hm = now.toTimeString().slice(0, 5), stamp = `${now.toDateString()} ${hm}`
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      if (p.notif.quiet && inQuiet(hm, p.notif.quietStart, p.notif.quietEnd)) return
      RULES.forEach(r => {
        if (!p.notif[r.key] || r.time(p) !== hm || fired.current[r.key] === stamp) return
        if ('day' in r && r.day !== now.getDay()) return
        fired.current[r.key] = stamp
        new Notification(r.title, { body: r.body })
      })
    }, 20000)
    return () => clearInterval(id)
  }, [])

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs(p => {
      const next = { ...p, ...patch }
      // Debounced remote save
      clearTimeout(saveTimer.current)
      if (userId) {
        saveTimer.current = window.setTimeout(() => saveRemotePrefs(userId, next), 1500)
      }
      return next
    })
  }, [userId])

  return <PrefsCtx.Provider value={{ prefs, update, syncing }}>{children}</PrefsCtx.Provider>
}
