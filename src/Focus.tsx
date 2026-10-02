import { useEffect, useRef, useState } from 'react'
import { C } from './prefs'
import { fmtDur, useRecords } from './records'

const OPTIONS = [15, 25, 45]
const R = 90, CIRC = 2 * Math.PI * R

export default function Focus({ onClose }: { onClose: () => void }) {
  const { addFocus } = useRecords()
  const [mins, setMins] = useState(25)
  const [start, setStart] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [result, setResult] = useState('')
  const saved = useRef(true)
  const total = mins * 60
  const elapsed = start ? Math.min(total, Math.floor((now - start) / 1000)) : 0

  const finish = (sec: number) => {
    if (saved.current) return
    saved.current = true
    setStart(null)
    if (sec >= 60) { addFocus(sec); setResult(`${fmtDur(sec)} of focus recorded.`) }
    else setResult('Under a minute, so nothing was recorded.')
  }
  const begin = () => { saved.current = false; setResult(''); setNow(Date.now()); setStart(Date.now()) }
  const close = () => { if (start) finish(elapsed); onClose() }

  useEffect(() => {
    if (!start) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [start])
  useEffect(() => { if (start && elapsed >= total) finish(total) }) // eslint-disable-line
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const left = total - elapsed
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0')

  return (
    <div role="dialog" aria-label="Focus session" className="backdrop fixed inset-0 z-50 flex flex-col pt-[max(env(safe-area-inset-top),56px)] lg:pt-0" style={{ background: C.bg }}>
      <header className="flex items-center justify-between px-5 py-4">
        <h2 className="font-serif text-2xl" style={{ color: C.textPri }}>Focus</h2>
        <button onClick={close} className="px-4 py-2 rounded-full text-sm" style={{ color: C.textSec, background: C.card }}>Done</button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        <div className="relative w-56 h-56" role="timer" aria-label={`${mm} minutes ${ss} seconds left`}>
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            <circle cx="100" cy="100" r={R} fill="none" stroke="color-mix(in srgb, var(--text) 12%, transparent)" strokeWidth="6" />
            <circle cx="100" cy="100" r={R} fill="none" stroke={C.amber} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (start ? elapsed / total : 0)} style={{ transition: 'stroke-dashoffset 0.5s linear' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-serif text-5xl" style={{ color: C.textPri }}>{mm}:{ss}</span>
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="Session length">
          {OPTIONS.map(m => (
            <button key={m} role="radio" aria-checked={mins === m} disabled={!!start} onClick={() => setMins(m)}
              className="px-4 py-2 rounded-full text-sm disabled:opacity-40"
              style={mins === m ? { background: C.amber, color: C.onAccent } : { background: C.card, color: C.textSec }}>{m} min</button>
          ))}
        </div>
        <div className="text-center min-h-20 flex flex-col items-center gap-3">
          {start
            ? <button onClick={() => finish(elapsed)} className="px-6 py-2.5 rounded-full text-sm font-medium" style={{ background: C.card, color: C.textPri }}>Stop and save</button>
            : <button onClick={begin} className="px-6 py-2.5 rounded-full text-sm font-medium" style={{ background: C.amber, color: C.onAccent }}>{result ? 'Start another' : 'Start'}</button>}
          <p className="text-xs max-w-[28ch]" style={{ color: C.textMute }} aria-live="polite">
            {result || 'Only time spent in a session here is recorded, once it reaches a minute.'}
          </p>
        </div>
      </div>
    </div>
  )
}
