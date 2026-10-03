import React from 'react'
import { getErrorLog, clearErrorLog } from './lib/errorlog'
import { C } from './prefs'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db, auth } from './lib/firebase'

const COLLECTIONS = ['profiles', 'user_preferences', 'daily_records', 'journal_entries', 'habits', 'habit_completions', 'email_verifications']

async function fetchSchemas() {
  const out: Record<string, { fields: string[]; sample: any; error?: string }> = {}
  const uid = auth.currentUser?.uid
  if (!uid) {
    for (const col of COLLECTIONS) out[col] = { fields: [], sample: null, error: 'Sign in to the app first.' }
    return out
  }

  for (const col of COLLECTIONS) {
    try {
      const snap = await getDocs(query(collection(db, col), where('user_id', '==', uid), limit(1)))
      if (snap.empty) {
        out[col] = { fields: [], sample: null }
      } else {
        const data = snap.docs[0].data() as any
        out[col] = { fields: Object.keys(data), sample: data }
      }
    } catch (e: any) {
      out[col] = { fields: [], sample: null, error: e.message }
    }
  }
  return out
}

export function AdminGate() {
  const [input, setInput] = React.useState('')
  const [unlocked, setUnlocked] = React.useState(false)
  const [error, setError] = React.useState('')

  if (unlocked) return <AdminPage />

  const unlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (input === 'j9nj71fkds') {
      setUnlocked(true)
      setError('')
    } else {
      setError('Incorrect password.')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: C.bg }}>
      <form onSubmit={unlock} className="w-full max-w-sm rounded-3xl p-6" style={{ background: C.card }}>
        <h1 className="font-serif text-2xl mb-2" style={{ color: C.textPri }}>Admin access</h1>
        <p className="text-sm mb-5" style={{ color: C.textSec }}>Enter the admin password to continue.</p>
        {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
        <input
          type="password"
          className="field w-full mb-4"
          placeholder="Password"
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
        />
        <button className="w-full py-2.5 rounded-xl text-sm font-medium" style={{ background: C.amber, color: C.onAccent }}>
          Unlock
        </button>
      </form>
    </div>
  )
}

export function AdminPage() {
  const errors = getErrorLog()
  const [schemas, setSchemas] = React.useState<Record<string, any> | null>(null)

  React.useEffect(() => {
    fetchSchemas().then(setSchemas).catch(() => setSchemas({}))
  }, [])

  return (
    <div className="min-h-dvh p-6" style={{ background: C.bg, color: C.textPri }}>
      <h1 className="font-serif text-3xl mb-4">Admin</h1>

      <section className="mb-8">
        <h2 className="font-serif text-2xl mb-3">Firebase Schemas</h2>
        {schemas ? (
          Object.entries(schemas).map(([col, info]) => (
            <div key={col} className="rounded-2xl p-4 mb-3" style={{ background: C.card }}>
              <h3 className="text-sm font-medium mb-2" style={{ color: C.amber }}>{col}</h3>
              {info.error ? (
                <p className="text-xs" style={{ color: C.coral }}>{info.error}</p>
              ) : (
                <>
                  <p className="text-xs mb-2" style={{ color: C.textSec }}>
                    Fields: {info.fields.length ? info.fields.join(', ') : 'no documents yet'}
                  </p>
                  {info.sample && (
                    <pre className="text-xs overflow-x-auto p-3 rounded-xl break-words" style={{ background: 'color-mix(in srgb, var(--text) 6%, transparent)' }}>
                      {JSON.stringify(info.sample, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </div>
          ))
        ) : (
          <p style={{ color: C.textSec }}>Loading schemas…</p>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl mb-3">Error Log</h2>
        <button onClick={() => { clearErrorLog(); location.reload() }} className="text-sm mb-4" style={{ color: C.coral }}>Clear errors</button>
        {errors.length === 0 ? (
          <p style={{ color: C.textSec }}>No errors logged on this browser.</p>
        ) : (
          <ul className="space-y-3">
            {errors.map((e, i) => (
              <li key={i} className="rounded-2xl p-4" style={{ background: C.card }}>
                <p className="text-xs mb-1" style={{ color: C.textMute }}>{e.time}</p>
                <p className="text-sm break-words" style={{ color: C.textPri }}>{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
