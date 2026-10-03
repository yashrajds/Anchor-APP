import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { dayKey } from '../records'
import { fetchJournalEntries, saveJournalEntry, deleteJournalEntry } from './firestore'

// ─── Types ────────────────────────────────────────────────────────────────────
export type JournalEntry = {
  id: string
  day: string
  content: string
  mood: number | null
  created_at: string
  updated_at: string
}

type Ctx = {
  entries: JournalEntry[]
  loading: boolean
  save: (content: string, mood: number | null) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
}

const localJournalKey = (id: string) => `anchor.journal.${id}`
const loadLocalJournal = (id: string): JournalEntry[] => {
  try { return JSON.parse(localStorage.getItem(localJournalKey(id)) || '[]') } catch { return [] }
}
const saveLocalJournal = (id: string, list: JournalEntry[]) => {
  try { localStorage.setItem(localJournalKey(id), JSON.stringify(list)) } catch {}
}

const JournalCtx = createContext<Ctx>(null!)
export const useJournal = () => useContext(JournalCtx)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function JournalProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.uid ?? ''
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) { setEntries([]); return }
    const local = loadLocalJournal(userId)
    setEntries(local)
    setLoading(true)

    fetchJournalEntries(userId).then(data => {
      if (data && data.length > 0) {
        setEntries(data)
        saveLocalJournal(userId, data)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  const save = useCallback(async (content: string, mood: number | null) => {
    if (!userId || !content.trim()) return
    const today = dayKey()
    const nowIso = new Date().toISOString()

    // Optimistically update local state & cache
    const newEntry: JournalEntry = {
      id: `local-${Date.now()}`,
      day: today,
      content,
      mood,
      created_at: nowIso,
      updated_at: nowIso,
    }

    setEntries(prev => {
      const idx = prev.findIndex(e => e.day === today)
      const next = idx >= 0 ? prev.map((e, i) => i === idx ? { ...e, content, mood, updated_at: nowIso } : e) : [newEntry, ...prev]
      saveLocalJournal(userId, next)
      return next
    })

    try {
      const result = await saveJournalEntry(userId, { day: today, content, mood })
      setEntries(prev => {
        const next = prev.map(e => e.id === newEntry.id ? { ...e, id: result.id, created_at: result.created_at, updated_at: result.updated_at } : e)
        saveLocalJournal(userId, next)
        return next
      })
    } catch {}
  }, [userId])

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId) return
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id)
      saveLocalJournal(userId, next)
      return next
    })
    try {
      await deleteJournalEntry(userId, id)
    } catch {}
  }, [userId])

  return (
    <JournalCtx.Provider value={{ entries, loading, save, deleteEntry }}>
      {children}
    </JournalCtx.Provider>
  )
}
