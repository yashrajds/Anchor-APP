import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './lib/AuthContext'

export type Day = { sleep?: number; mood?: number; focusSec?: number; calmSec?: number }
type Days = Record<string, Day>

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const ago = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }

const localKey = (id: string) => `anchor.records.v2.${id}`
const loadLocal = (id: string): Days => {
  try { return JSON.parse(localStorage.getItem(localKey(id)) || '{}') } catch { return {} }
}
const saveLocal = (id: string, days: Days) => {
  try { localStorage.setItem(localKey(id), JSON.stringify(days)) } catch { /* storage full */ }
}

export const series = (days: Days, pick: (d: Day) => number | undefined, offset = 0) =>
  Array.from({ length: 7 }, (_, i) => { const d = days[dayKey(ago(6 - i + offset))]; return d ? pick(d) : undefined })

export function streakOf(days: Days) {
  let n = 0, i = days[dayKey()] ? 0 : 1
  while (days[dayKey(ago(i))] && Object.keys(days[dayKey(ago(i))]).length) { n++; i++ }
  return n
}

export const fmtDur = (sec: number) =>
  sec < 60 ? `${Math.round(sec)}s` : sec < 3600 ? `${Math.round(sec / 60)} min` : `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m`

// ─── Supabase helpers ─────────────────────────────────────────────────────────
function rowToDay(row: { sleep: number | null; mood: number | null; focus_sec: number | null; calm_sec: number | null }): Day {
  const d: Day = {}
  if (row.sleep != null) d.sleep = row.sleep
  if (row.mood != null) d.mood = row.mood
  if (row.focus_sec != null) d.focusSec = row.focus_sec
  if (row.calm_sec != null) d.calmSec = row.calm_sec
  return d
}

async function fetchRecords(userId: string): Promise<Days> {
  const { data, error } = await supabase
    .from('daily_records')
    .select('day, sleep, mood, focus_sec, calm_sec')
    .eq('user_id', userId)
    .gte('day', dayKey(ago(60))) // fetch last 60 days
  if (error || !data) return {}
  const days: Days = {}
  for (const row of data) days[row.day] = rowToDay(row)
  return days
}

async function upsertRecord(userId: string, day: string, patch: Partial<{ sleep: number; mood: number; focus_sec: number; calm_sec: number }>) {
  await supabase.from('daily_records').upsert(
    { user_id: userId, day, ...patch },
    { onConflict: 'user_id,day' },
  )
}

// ─── Context ──────────────────────────────────────────────────────────────────
type Ctx = {
  days: Days
  syncing: boolean
  setSleep: (rating: number) => void
  setMood: (level: number) => void
  addFocus: (sec: number) => void
  addCalm: (sec: number) => void
}
const RecordsCtx = createContext<Ctx>(null!)
export const useRecords = () => useContext(RecordsCtx)

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [days, setDays] = useState<Days>(() => userId ? loadLocal(userId) : {})
  const [syncing, setSyncing] = useState(false)
  const pendingSync = useRef<Record<string, Partial<{ sleep: number; mood: number; focus_sec: number; calm_sec: number }>>>({})

  // Load from Supabase on mount / user change
  useEffect(() => {
    if (!userId) { setDays({}); return }
    setDays(loadLocal(userId)) // show local immediately
    setSyncing(true)
    fetchRecords(userId).then(remote => {
      setDays(prev => {
        const merged = { ...remote, ...prev } // local takes priority for today
        saveLocal(userId, merged)
        return merged
      })
      setSyncing(false)
    }).catch(() => setSyncing(false))
  }, [userId])

  // Persist locally whenever days change
  useEffect(() => {
    if (userId) saveLocal(userId, days)
  }, [days, userId])

  // Flush pending remote writes
  const flushPending = useCallback(async () => {
    if (!userId) return
    const entries = Object.entries(pendingSync.current)
    if (!entries.length) return
    pendingSync.current = {}
    await Promise.all(entries.map(([day, patch]) => upsertRecord(userId, day, patch)))
  }, [userId])

  // Flush on window hide (tab close / switch)
  useEffect(() => {
    window.addEventListener('visibilitychange', flushPending)
    window.addEventListener('pagehide', flushPending)
    return () => {
      window.removeEventListener('visibilitychange', flushPending)
      window.removeEventListener('pagehide', flushPending)
    }
  }, [flushPending])

  const patch = useCallback((fn: (d: Day) => Day, remoteFields: Partial<{ sleep: number; mood: number; focus_sec: number; calm_sec: number }>) => {
    const today = dayKey()
    setDays(prev => {
      const updated = fn(prev[today] || {})
      return { ...prev, [today]: updated }
    })
    // Queue remote write
    pendingSync.current[today] = { ...(pendingSync.current[today] || {}), ...remoteFields }
    // Write immediately but don't block UI
    if (userId) upsertRecord(userId, today, remoteFields).catch(() => { /* will retry on flush */ })
  }, [userId])

  const value: Ctx = {
    days,
    syncing,
    setSleep: (sleep) => patch(d => ({ ...d, sleep }), { sleep }),
    setMood: (mood) => patch(d => ({ ...d, mood }), { mood }),
    addFocus: (sec) => {
      const rounded = Math.round(sec)
      patch(d => ({ ...d, focusSec: (d.focusSec || 0) + rounded }), {})
      // For focus, we need to read current value first before writing
      setDays(prev => {
        const today = dayKey()
        const focusSec = (prev[today]?.focusSec || 0)
        if (userId) upsertRecord(userId, today, { focus_sec: focusSec }).catch(() => {})
        return prev
      })
    },
    addCalm: (sec) => {
      const rounded = Math.round(sec)
      patch(d => ({ ...d, calmSec: (d.calmSec || 0) + rounded }), {})
      setDays(prev => {
        const today = dayKey()
        const calmSec = (prev[today]?.calmSec || 0)
        if (userId) upsertRecord(userId, today, { calm_sec: calmSec }).catch(() => {})
        return prev
      })
    },
  }
  return <RecordsCtx.Provider value={value}>{children}</RecordsCtx.Provider>
}
