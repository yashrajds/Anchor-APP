import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'
import { dayKey, ago, type Day } from '../records'
import type { JournalEntry } from './JournalContext'
import type { Habit } from './HabitsContext'

// ─── Profiles & preferences ───────────────────────────────────────────────
export async function getRemotePrefs(userId: string) {
  const [profileSnap, prefsSnap] = await Promise.all([
    getDoc(doc(db, 'profiles', userId)),
    getDoc(doc(db, 'user_preferences', userId)),
  ])
  return {
    profile: profileSnap.exists() ? profileSnap.data() : null,
    prefs: prefsSnap.exists() ? prefsSnap.data() : null,
  }
}

export async function saveRemotePrefs(userId: string, profile: any, prefs: any) {
  await Promise.all([
    setDoc(doc(db, 'profiles', userId), profile, { merge: true }),
    setDoc(doc(db, 'user_preferences', userId), prefs, { merge: true }),
  ])
}

// ─── Daily records ────────────────────────────────────────────────────────
export async function fetchRecords(userId: string): Promise<Record<string, Day>> {
  const q = query(
    collection(db, 'daily_records'),
    where('user_id', '==', userId),
    where('day', '>=', dayKey(ago(60))),
  )
  const snap = await getDocs(q)
  const days: Record<string, Day> = {}
  snap.forEach(d => {
    const row = d.data() as any
    days[row.day] = rowToDay(row)
  })
  return days
}

function rowToDay(row: { sleep: number | null; mood: number | null; focus_sec: number | null; calm_sec: number | null }): Day {
  const d: Day = {}
  if (row.sleep != null) d.sleep = row.sleep
  if (row.mood != null) d.mood = row.mood
  if (row.focus_sec != null) d.focusSec = row.focus_sec
  if (row.calm_sec != null) d.calmSec = row.calm_sec
  return d
}

export async function upsertRecord(userId: string, day: string, patch: Partial<{ sleep: number; mood: number; focus_sec: number; calm_sec: number }>) {
  const ref = doc(db, 'daily_records', `${userId}_${day}`)
  await setDoc(ref, { user_id: userId, day, ...patch }, { merge: true })
}

// ─── Journal ──────────────────────────────────────────────────────────────
export async function fetchJournalEntries(userId: string): Promise<JournalEntry[]> {
  const q = query(
    collection(db, 'journal_entries'),
    where('user_id', '==', userId),
    orderBy('created_at', 'desc'),
    limit(30),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry))
}

export async function saveJournalEntry(userId: string, entry: { id?: string; day: string; content: string; mood: number | null; created_at?: string; updated_at?: string }) {
  const day = entry.day
  const ref = doc(db, 'journal_entries', `${userId}_${day}`)
  const now = new Date().toISOString()
  await setDoc(ref, {
    user_id: userId,
    day,
    content: entry.content,
    mood: entry.mood,
    created_at: entry.created_at ?? now,
    updated_at: entry.updated_at ?? now,
  }, { merge: true })
  return { id: ref.id, user_id: userId, day, content: entry.content, mood: entry.mood, created_at: entry.created_at ?? now, updated_at: entry.updated_at ?? now }
}

export async function deleteJournalEntry(userId: string, id: string) {
  // id may be journal doc id or day-based id; try to derive day from id
  const day = id.startsWith(`${userId}_`) ? id.slice(userId.length + 1) : id
  await deleteDoc(doc(db, 'journal_entries', `${userId}_${day}`))
}

// ─── Habits ───────────────────────────────────────────────────────────────
export async function fetchHabits(userId: string): Promise<Habit[]> {
  const q = query(collection(db, 'habits'), where('user_id', '==', userId), orderBy('sort_order'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Habit))
}

export async function seedHabits(userId: string, defaults: Omit<Habit, 'id' | 'sort_order'>[]): Promise<Habit[]> {
  const inserted: Habit[] = []
  for (let i = 0; i < defaults.length; i++) {
    const ref = doc(collection(db, 'habits'))
    const habit = { user_id: userId, label: defaults[i].label, color: defaults[i].color, sort_order: i }
    await setDoc(ref, habit)
    inserted.push({ id: ref.id, ...habit } as Habit)
  }
  return inserted
}

export async function addHabit(userId: string, label: string, color: string, sort_order: number): Promise<Habit> {
  const ref = doc(collection(db, 'habits'))
  const habit = { user_id: userId, label, color, sort_order }
  await setDoc(ref, habit)
  return { id: ref.id, ...habit } as Habit
}

export async function removeHabit(userId: string, habitId: string) {
  await deleteDoc(doc(db, 'habits', habitId))
}

export async function fetchHabitCompletions(userId: string, day: string): Promise<Set<string>> {
  const q = query(collection(db, 'habit_completions'), where('user_id', '==', userId), where('day', '==', day))
  const snap = await getDocs(q)
  const set = new Set<string>()
  snap.forEach(d => set.add(d.data().habit_id))
  return set
}

export async function setHabitCompletion(userId: string, habitId: string, day: string, done: boolean) {
  const ref = doc(db, 'habit_completions', `${userId}_${habitId}_${day}`)
  if (done) {
    await setDoc(ref, { user_id: userId, habit_id: habitId, day })
  } else {
    await deleteDoc(ref)
  }
}

// ─── Delete user data ─────────────────────────────────────────────────────
export async function deleteUserData(userId: string) {
  const collections = ['profiles', 'user_preferences', 'daily_records', 'journal_entries', 'habits', 'habit_completions']
  for (const col of collections) {
    const q = query(collection(db, col), where('user_id', '==', userId))
    const snap = await getDocs(q)
    await Promise.allSettled(snap.docs.map(d => deleteDoc(doc(db, col, d.id))))
    // Also delete docs where doc id == userId (profiles/user_preferences)
    try { await deleteDoc(doc(db, col, userId)) } catch {}
  }
}
