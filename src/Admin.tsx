import React from 'react'
import { getErrorLog, clearErrorLog } from './lib/errorlog'
import { C } from './prefs'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { db } from './lib/firebase'

const COLLECTIONS = ['profiles', 'user_preferences', 'daily_records', 'journal_entries', 'habits', 'habit_completions', 'email_verifications']

async function fetchSchemas() {
  const out: Record<string, { fields: string[]; sample: any; error?: string }> = {}
  for (const col of COLLECTIONS) {
    try {
      const snap = await getDocs(query(collection(db, col), limit(1)))
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
