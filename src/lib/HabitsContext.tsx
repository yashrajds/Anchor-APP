import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { dayKey } from '../records'
import { C } from '../prefs'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Habit = {
  id: string
  label: string
  color: string
  sort_order: number
}

export type HabitWithDone = Habit & { done: boolean }

type Ctx = {
  habits: HabitWithDone[]
  loading: boolean
  toggle: (habitId: string) => Promise<void>
  addHabit: (label: string, color: string) => Promise<void>
  removeHabit: (habitId: string) => Promise<void>
  completedToday: number
}

const HabitsCtx = createContext<Ctx>(null!)
export const useHabits = () => useContext(HabitsCtx)

// Default habits for new users
const DEFAULT_HABITS: Omit<Habit, 'id' | 'sort_order'>[] = [
  { label: 'Drink 8 glasses of water', color: '#5B8FBF' },
  { label: 'Morning stretch — 10 min', color: '#6D9B72' },
  { label: 'Study break every 90 min', color: '#C2D5A3' },
  { label: 'Screen-free 30 min before bed', color: '#E07A5F' },
  { label: 'Check in with a friend', color: '#B08968' },
]

const localHabitsKey = (id: string) => `anchor.habits.${id}`
const localCompletionsKey = (id: string, day: string) => `anchor.completions.${id}.${day}`

const loadLocalHabits = (id: string): Habit[] => {
  try {
    const raw = localStorage.getItem(localHabitsKey(id))
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_HABITS.map((h, i) => ({ id: `default-${i}`, ...h, sort_order: i }))
}

const saveLocalHabits = (id: string, list: Habit[]) => {
  try { localStorage.setItem(localHabitsKey(id), JSON.stringify(list)) } catch {}
}

const loadLocalCompletions = (id: string, day: string): Set<string> => {
  try {
    const raw = localStorage.getItem(localCompletionsKey(id, day))
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

const saveLocalCompletions = (id: string, day: string, set: Set<string>) => {
  try { localStorage.setItem(localCompletionsKey(id, day), JSON.stringify([...set])) } catch {}
}

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const today = dayKey()
  const [habits, setHabits] = useState<Habit[]>(() => userId ? loadLocalHabits(userId) : [])
  const [completions, setCompletions] = useState<Set<string>>(() => userId ? loadLocalCompletions(userId, today) : new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) { setHabits([]); setCompletions(new Set()); return }
    const localH = loadLocalHabits(userId)
    const localC = loadLocalCompletions(userId, today)
    setHabits(localH)
    setCompletions(localC)
    setLoading(true)

    Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId).order('sort_order'),
      supabase.from('habit_completions').select('habit_id').eq('user_id', userId).eq('day', today),
    ]).then(async ([habitsRes, completionsRes]) => {
      let habitsData = (habitsRes.data as Habit[]) ?? []

      // Seed defaults for new Supabase users if table is empty
      if (habitsData.length === 0 && !habitsRes.error) {
        const inserts = DEFAULT_HABITS.map((h, i) => ({
          user_id: userId,
          label: h.label,
          color: h.color,
          sort_order: i,
        }))
        const { data: seeded } = await supabase.from('habits').insert(inserts).select()
        if (seeded && seeded.length > 0) habitsData = seeded as Habit[]
      }

      if (habitsData.length > 0) {
        setHabits(habitsData)
        saveLocalHabits(userId, habitsData)
      }

      if (completionsRes.data && !completionsRes.error) {
        const remoteSet = new Set((completionsRes.data ?? []).map(r => r.habit_id))
        setCompletions(remoteSet)
        saveLocalCompletions(userId, today, remoteSet)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId, today])

  const toggle = useCallback(async (habitId: string) => {
    if (!userId) return
    const isDone = completions.has(habitId)

    setCompletions(prev => {
      const next = new Set(prev)
      if (isDone) next.delete(habitId)
      else next.add(habitId)
      saveLocalCompletions(userId, today, next)
      return next
    })

    try {
      if (isDone) {
        await supabase.from('habit_completions').delete().eq('habit_id', habitId).eq('user_id', userId).eq('day', today)
      } else {
        await supabase.from('habit_completions').insert({ habit_id: habitId, user_id: userId, day: today })
      }
    } catch {}
  }, [userId, completions, today])

  const addHabit = useCallback(async (label: string, color: string) => {
    if (!userId) return
    const tempId = `habit-${Date.now()}`
    const newHabit: Habit = { id: tempId, label, color, sort_order: habits.length }

    setHabits(prev => {
      const next = [...prev, newHabit]
      saveLocalHabits(userId, next)
      return next
    })

    try {
      const { data } = await supabase.from('habits').insert({
        user_id: userId, label, color, sort_order: habits.length,
      }).select().single()
      if (data) {
        setHabits(prev => {
          const next = prev.map(h => h.id === tempId ? (data as Habit) : h)
          saveLocalHabits(userId, next)
          return next
        })
      }
    } catch {}
  }, [userId, habits.length])

  const removeHabit = useCallback(async (habitId: string) => {
    if (!userId) return
    setHabits(prev => {
      const next = prev.filter(h => h.id !== habitId)
      saveLocalHabits(userId, next)
      return next
    })
    setCompletions(prev => {
      const next = new Set(prev)
      next.delete(habitId)
      saveLocalCompletions(userId, today, next)
      return next
    })

    try {
      await supabase.from('habits').delete().eq('id', habitId).eq('user_id', userId)
    } catch {}
  }, [userId, today])

  const habitsWithDone: HabitWithDone[] = habits.map(h => ({ ...h, done: completions.has(h.id) }))

  return (
    <HabitsCtx.Provider value={{
      habits: habitsWithDone,
      loading,
      toggle,
      addHabit,
      removeHabit,
      completedToday: completions.size,
    }}>
      {children}
    </HabitsCtx.Provider>
  )
}

export { C }
