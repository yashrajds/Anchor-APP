import React from 'react'
import { getErrorLog, clearErrorLog } from './lib/errorlog'
import { C } from './prefs'
const SCHEMAS: Record<string, string[][]> = {
  profiles: [['id','string','User ID'], ['user_id','string','Owner ID'], ['name','string','Display name'], ['email','string','Login email'], ['photo_url','string | null','Avatar URL'], ['course','string | null','Course / major'], ['year','string | null','Year of study'], ['birthday','string | null','Birth date'], ['joined','string','Join date']],
  user_preferences: [['id','string','Pref ID'], ['user_id','string','Owner ID'], ['theme','string','Selected theme'], ['notif_checkin','boolean','Check-in reminders'], ['notif_checkin_time','string','Check-in time'], ['notif_streak','boolean','Streak reminders'], ['notif_weekly','boolean','Weekly reminder'], ['notif_quiet','boolean','Quiet hours enabled'], ['notif_quiet_start','string','Quiet start'], ['notif_quiet_end','string','Quiet end'], ['a11y_text_size','string','Text size'], ['a11y_reduce_motion','boolean','Reduce motion'], ['a11y_contrast','boolean','High contrast']],
  daily_records: [['id','string','Record ID'], ['user_id','string','Owner ID'], ['day','string','Date key'], ['sleep','number | null','Sleep rating'], ['mood','number | null','Mood rating'], ['focus_sec','number | null','Focus seconds'], ['calm_sec','number | null','Calm seconds'], ['created_at','string','Created at'], ['updated_at','string','Updated at']],
  journal_entries: [['id','string','Entry ID'], ['user_id','string','Owner ID'], ['day','string','Date key'], ['content','string','Entry text'], ['mood','number | null','Mood'], ['created_at','string','Created at'], ['updated_at','string','Updated at']],
  habits: [['id','string','Habit ID'], ['user_id','string','Owner ID'], ['label','string','Habit label'], ['color','string','Habit color'], ['sort_order','number','Display order'], ['created_at','string','Created at']],
  habit_completions: [['id','string','Completion ID'], ['habit_id','string','Habit ID'], ['user_id','string','Owner ID'], ['day','string','Date key'], ['created_at','string','Created at']],
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
  return (
    <div className="min-h-dvh p-6" style={{ background: C.bg, color: C.textPri }}>
      <h1 className="font-serif text-3xl mb-4">Admin</h1>

      <section className="mb-8">
        <h2 className="font-serif text-2xl mb-3">Firebase Schemas</h2>
        {Object.entries(SCHEMAS).map(([col, fields]) => (
          <div key={col} className="rounded-2xl p-4 mb-4 overflow-x-auto" style={{ background: C.card }}>
            <h3 className="text-sm font-medium mb-3 capitalize" style={{ color: C.amber }}>{col.replace('_', ' ')}</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3" style={{ color: C.textMute, borderBottom: `1px solid ${C.cardBorder}` }}>Field</th>
                  <th className="text-left py-2 px-3" style={{ color: C.textMute, borderBottom: `1px solid ${C.cardBorder}` }}>Type</th>
                  <th className="text-left py-2 px-3" style={{ color: C.textMute, borderBottom: `1px solid ${C.cardBorder}` }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(([name, type, desc]) => (
                  <tr key={name}>
                    <td className="py-2 px-3" style={{ color: C.textPri }}>{name}</td>
                    <td className="py-2 px-3" style={{ color: C.textSec }}>{type}</td>
                    <td className="py-2 px-3" style={{ color: C.textSec }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
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
