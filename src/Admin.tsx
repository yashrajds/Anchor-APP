import React from 'react'
import { getErrorLog, clearErrorLog } from './lib/errorlog'
import { C } from './prefs'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { db } from './lib/firebase'

const COLLECTIONS = ['profiles', 'user_preferences', 'daily_records', 'journal_entries', 'habits', 'habit_completions']

type Doc = Record<string, any>

async function fetchCollection(name: string): Promise<Doc[]> {
  const snap = await getDocs(query(collection(db, name), limit(50)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

function KeysFor(docs: Doc[]): string[] {
  const keys = new Set<string>()
  docs.forEach(d => Object.keys(d).forEach(k => keys.add(k)))
  return ['id', ...Array.from(keys).filter(k => k !== 'id')]
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
  const [data, setData] = React.useState<Record<string, Doc[]>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    Promise.all(COLLECTIONS.map(async c => [c, await fetchCollection(c)] as const))
      .then(entries => {
        const map: Record<string, Doc[]> = {}
        entries.forEach(([name, docs]) => { map[name] = docs })
        setData(map)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-dvh p-6" style={{ background: C.bg, color: C.textPri }}>
      <h1 className="font-serif text-3xl mb-2">Admin</h1>
      <p className="text-sm mb-6" style={{ color: C.textSec }}>Real Firestore data for configured collections.</p>

      <section className="mb-8">
        <h2 className="font-serif text-2xl mb-3">Database</h2>
        {loading && <p style={{ color: C.textSec }}>Loading…</p>}
        {error && <p style={{ color: C.coral }}>{error}</p>}
        {!loading && !error && COLLECTIONS.map(name => {
          const docs = data[name] || []
          const keys = KeysFor(docs)
          return (
            <div key={name} className="rounded-2xl p-4 mb-4 overflow-x-auto" style={{ background: C.card }}>
              <h3 className="text-sm font-medium mb-3 capitalize" style={{ color: C.amber }}>{name.replace('_', ' ')}</h3>
              {docs.length === 0 ? (
                <p className="text-xs" style={{ color: C.textMute }}>No documents found.</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      {keys.map(k => (
                        <th key={k} className="text-left py-2 px-3" style={{ color: C.textMute, borderBottom: `1px solid ${C.cardBorder}` }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((doc, i) => (
                      <tr key={`${name}-${i}`}>
                        {keys.map(k => (
                          <td key={k} className="py-2 px-3" style={{ color: C.textSec }}>
                            {typeof doc[k] === 'object' ? JSON.stringify(doc[k]) : String(doc[k] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}
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
