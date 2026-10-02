import { useEffect, useRef, useState } from 'react'
import { C } from './prefs'
import { useRecords } from './records'

type Mode = 'breathe' | 'bubbles'

function Breathe() {
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle')
  const [breaths, setBreaths] = useState(0)
  const [note, setNote] = useState('')
  const t0 = useRef(0)
  const cap = useRef(0)

  function start() {
    if (t0.current) return
    t0.current = Date.now()
    setPhase('in')
    cap.current = window.setTimeout(end, 6000)
  }
  function end() {
    if (!t0.current) return
    clearTimeout(cap.current)
    const s = (Date.now() - t0.current) / 1000
    t0.current = 0
    setPhase('out')
    setBreaths(n => n + 1)
    setNote(s < 3 ? 'A little longer next time.' : s <= 5.5 ? 'Steady. Now a slow breath out.' : 'Easy, no need to strain.')
  }
  useEffect(() => () => clearTimeout(cap.current), [])

  const copy = { idle: 'Press and hold to breathe in. Let go to breathe out.', in: 'Breathe in, slowly…', out: note }[phase]

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
      <button aria-label="Hold to breathe in"
        onPointerDown={start} onPointerUp={end} onPointerLeave={end} onPointerCancel={end}
        onKeyDown={e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); start() } }}
        onKeyUp={e => { if (e.code === 'Space') end() }}
        className="relative w-64 h-64 flex items-center justify-center touch-none select-none rounded-full">
        <span className="absolute inset-0 rounded-full" style={{ border: `1px dashed ${C.cardBorder}` }} />
        <span className="absolute inset-0 rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--accent) 22%, transparent)',
            border: `1.5px solid ${C.amber}`,
            transform: `scale(${phase === 'in' ? 1 : 0.5})`,
            transition: `transform ${phase === 'in' ? 5 : 7}s ease-in-out`,
          }} />
        <span className="relative font-serif text-2xl" style={{ color: C.textPri }}>{phase === 'in' ? 'In' : phase === 'out' ? 'Out' : 'Hold'}</span>
      </button>
      <div className="text-center min-h-12">
        <p className="text-sm" style={{ color: C.textSec }} aria-live="polite">{copy}</p>
        {breaths > 0 && <p className="text-xs mt-2" style={{ color: C.textMute }}>{breaths} {breaths === 1 ? 'breath' : 'breaths'}</p>}
      </div>
    </div>
  )
}

type Bubble = { id: number; x: number; size: number; dur: number; popped?: boolean }

function Bubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [count, setCount] = useState(0)
  const nextId = useRef(0)

  useEffect(() => {
    const t = setInterval(() => setBubbles(b => b.length >= 8 ? b : [...b, {
      id: ++nextId.current, x: 4 + Math.random() * 82, size: 48 + Math.random() * 44, dur: 11 + Math.random() * 7,
    }]), 1100)
    return () => clearInterval(t)
  }, [])

  const pop = (id: number) => {
    setBubbles(b => b.map(x => x.id === id ? { ...x, popped: true } : x))
    setCount(n => n + 1)
    navigator.vibrate?.(8)
  }
  const remove = (id: number) => setBubbles(b => b.filter(x => x.id !== id))

  return (
    <div className="flex-1 relative overflow-hidden">
      {bubbles.map(b => (
        <div key={b.id} className="absolute keep-motion" onAnimationEnd={() => remove(b.id)}
          style={{ left: `${b.x}%`, bottom: -110, animation: `rise ${b.dur}s linear forwards` }}>
          <button aria-label="Pop bubble" onClick={() => !b.popped && pop(b.id)} className="keep-motion block rounded-full"
            style={{
              width: b.size, height: b.size,
              border: '1.5px solid color-mix(in srgb, var(--accent) 60%, transparent)',
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              animation: b.popped ? 'pop 0.22s ease-out forwards' : undefined,
            }} />
        </div>
      ))}
      <p className="absolute bottom-6 inset-x-0 text-center text-sm pointer-events-none" style={{ color: C.textSec }}>
        Pop them slowly. Breathe out with each one.
        {count > 0 && <span className="block text-xs mt-1" style={{ color: C.textMute }}>{count} popped</span>}
      </p>
    </div>
  )
}

export default function Cooldown({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('breathe')
  const { addCalm } = useRecords()
  const opened = useRef(Date.now())
  const close = () => {
    const sec = Math.min(1800, (Date.now() - opened.current) / 1000)
    if (sec >= 10) addCalm(sec)
    onClose()
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  return (
    <div role="dialog" aria-label="Cool down" className="backdrop fixed inset-0 z-50 flex flex-col pt-[max(env(safe-area-inset-top),56px)] lg:pt-0" style={{ background: C.bg }}>
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex gap-1" role="tablist">
          {([['breathe', 'Breathe'], ['bubbles', 'Bubbles']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
              className="px-3 py-1.5 rounded-md text-sm"
              style={mode === id ? { background: C.card, color: C.textPri } : { color: C.textMute }}>{label}</button>
          ))}
        </div>
        <button onClick={close} className="px-3 py-1.5 rounded-md text-sm" style={{ color: C.textSec }}>Done</button>
      </header>
      {mode === 'breathe' ? <Breathe /> : <Bubbles />}
    </div>
  )
}
