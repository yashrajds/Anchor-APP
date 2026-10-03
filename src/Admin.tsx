import { getErrorLog, clearErrorLog } from './lib/errorlog'
import { C } from './prefs'

export function AdminPage() {
  const errors = getErrorLog()
  return (
    <div className="min-h-dvh p-6" style={{ background: C.bg, color: C.textPri }}>
      <h1 className="font-serif text-3xl mb-4">Admin — Error Log</h1>
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
    </div>
  )
}
