import { useEffect, useRef, useState } from 'react'
import { C, THEMES, usePrefs, firstName, type Prefs } from './prefs'
import { useRecords } from './records'
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth'
import { auth } from './lib/firebase'
import { deleteUserData } from './lib/firestore'

const SUPPORT_EMAIL = 'support@anchorapp.example'
const LEGAL: [string, string[]] = ['Terms & privacy', [
  'Anchor is a wellbeing companion for students. It is not a medical service and does not diagnose or treat.',
  'Your data is stored securely in Firebase and is private to your account. We do not sell or share it.',
  'Feedback and bug reports open your email app with a draft you can review first.',
  'If you are in crisis or in danger, call or text 988 or your local emergency number.',
]]

const GEAR = 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z'
export function GearButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} aria-label="Settings" title="Settings"
      className={`w-10 h-10 flex items-center justify-center rounded-full ${className}`}
      style={{ color: C.textSec, background: C.card }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={GEAR} /></svg>
    </button>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────
export function Avatar({ className = '' }: { className?: string }) {
  const { prefs: { profile } } = usePrefs()
  const initial = (profile.name.trim()[0] || '?').toUpperCase()
  return profile.photo
    ? <img src={profile.photo} alt="" className={`rounded-full object-cover flex-shrink-0 ${className}`} />
    : <div className={`rounded-full flex items-center justify-center font-medium flex-shrink-0 ${className}`}
        style={{ background: 'color-mix(in srgb, var(--accent) 22%, transparent)', color: C.amber }}>{initial}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="text-xs font-medium px-2 mb-2" style={{ color: C.textMute }}>{title}</h2>
      <div className="rounded-3xl px-4 py-2" style={{ background: C.card }}>{children}</div>
    </section>
  )
}

function Row({ label, desc, right, onClick, href, danger }: {
  label: string; desc?: string; right?: React.ReactNode; onClick?: () => void; href?: string; danger?: boolean
}) {
  const body = (
    <>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-sm" style={{ color: danger ? C.coral : C.textPri }}>{label}</span>
        {desc && <span className="block text-xs mt-0.5" style={{ color: C.textMute }}>{desc}</span>}
      </span>
      {right}
    </>
  )
  const cls = 'flex items-center gap-3 w-full py-2.5 min-h-11'
  if (href) return <a href={href} className={cls}>{body}</a>
  if (onClick) return <button onClick={onClick} className={cls}>{body}</button>
  return <div className={cls}>{body}</div>
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className="relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors"
      style={{ background: on ? C.amber : 'color-mix(in srgb, var(--text) 18%, transparent)' }}>
      <span className="absolute top-[3px] w-4 h-4 rounded-full transition-all"
        style={{ left: on ? 21 : 3, background: on ? C.onAccent : C.textSec }} />
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs mb-1.5" style={{ color: C.textMute }}>{label}</span>
      {children}
    </label>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, var(--bg-deep) 82%, transparent)' }} onClick={onClose}>
      <div role="dialog" aria-label={title} onClick={e => e.stopPropagation()}
        className="sheet w-full max-w-[400px] max-h-[85vh] overflow-y-auto rounded-3xl p-5"
        style={{ background: C.card, boxShadow: '0 16px 48px rgb(0 0 0 / 0.4)' }}>
        <h2 className="font-serif text-2xl mb-3" style={{ color: C.textPri }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

const Btn = ({ children, onClick, danger, disabled, ghost }: {
  children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean; ghost?: boolean
}) => (
  <button onClick={onClick} disabled={disabled}
    className="px-4 py-2 rounded-full text-sm font-medium disabled:opacity-40"
    style={ghost ? { color: C.textSec } : { background: danger ? C.coral : C.amber, color: danger ? '#1a0d08' : C.onAccent }}>
    {children}
  </button>
)

// ─── Change Password via Firebase ─────────────────────────────────────────────
function ChangePasswordModal({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (next.length < 6) return setErr('Use at least 6 characters.')
    if (next !== again) return setErr('Passwords do not match.')
    setErr('')
    setLoading(true)
    // Re-authenticate with current password first
    const user = auth.currentUser
    if (!user?.email) { setErr('Could not verify identity.'); setLoading(false); return }
    try {
      const credential = EmailAuthProvider.credential(user.email, current)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, next)
      toast('Password changed')
      onClose()
    } catch (e: any) {
      setErr(e.message ?? 'Could not update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Change password" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="Current password"><input type="password" className="field" value={current} onChange={e => setCurrent(e.target.value)} /></Field>
        <Field label="New password"><input type="password" className="field" value={next} onChange={e => setNext(e.target.value)} /></Field>
        <Field label="Confirm new password"><input type="password" className="field" value={again} onChange={e => setAgain(e.target.value)} /></Field>
      </div>
      <p className="text-xs mt-3 min-h-4" style={{ color: C.coral }}>{err}</p>
      <div className="flex items-center justify-end gap-2 mt-3">
        <Btn ghost onClick={onClose}>Cancel</Btn>
        <Btn disabled={loading} onClick={save}>{loading ? 'Saving…' : 'Save'}</Btn>
      </div>
    </Modal>
  )
}

function MailModal({ mode, onClose }: { mode: 'feedback' | 'bug'; onClose: () => void }) {
  const { prefs } = usePrefs()
  const bug = mode === 'bug'
  const [msg, setMsg] = useState('')
  const send = () => {
    const body = `${msg}\n\n---\nFrom: ${prefs.profile.name}${bug ? `\n${navigator.userAgent}\nViewport: ${innerWidth}x${innerHeight}` : ''}`
    location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(bug ? 'Anchor bug report' : 'Anchor feedback')}&body=${encodeURIComponent(body)}`
    onClose()
  }
  return (
    <Modal title={bug ? 'Report a bug' : 'Send feedback'} onClose={onClose}>
      <Field label={bug ? 'What went wrong, and what were you doing?' : 'What is on your mind?'}>
        <textarea className="field resize-none" rows={5} value={msg} onChange={e => setMsg(e.target.value)} autoFocus />
      </Field>
      <p className="text-xs mt-3" style={{ color: C.textMute }}>This opens your email app with a draft to review.</p>
      <div className="flex justify-end gap-2 mt-3"><Btn ghost onClick={onClose}>Cancel</Btn><Btn disabled={!msg.trim()} onClick={send}>Open email</Btn></div>
    </Modal>
  )
}

function ConfirmModal({ title, text, action, danger, requireText, onRun, onClose }: {
  title: string; text: string; action: string; danger?: boolean; requireText?: string; onRun: () => void; onClose: () => void
}) {
  const [t, setT] = useState('')
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm" style={{ color: C.textSec }}>{text}</p>
      {requireText && <div className="mt-3"><Field label={`Type ${requireText} to confirm`}><input className="field" value={t} onChange={e => setT(e.target.value)} /></Field></div>}
      <div className="flex justify-end gap-2 mt-4">
        <Btn ghost onClick={onClose}>Cancel</Btn>
        <Btn danger={danger} disabled={!!requireText && t !== requireText} onClick={onRun}>{action}</Btn>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Dialog = null | 'password' | 'feedback' | 'bug' | 'delete' | 'logout' | 'legal'

export function SettingsPage({ onBack, onSignOut }: { onBack: () => void; onSignOut: () => void }) {
  const { prefs, update } = usePrefs()
  const { days } = useRecords()
  const { profile: pf, notif: nf, a11y } = prefs
  const [dialog, setDialog] = useState<Dialog>(null)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const timer = useRef(0)

  const toast = (m: string) => { setMsg(m); clearTimeout(timer.current); timer.current = window.setTimeout(() => setMsg(''), 2500) }
  const setPf = (k: keyof Prefs['profile'], v: string) => update({ profile: { ...pf, [k]: v } })
  const setNf = (patch: Partial<Prefs['notif']>) => update({ notif: { ...nf, ...patch } })
  const setA11y = (patch: Partial<Prefs['a11y']>) => update({ a11y: { ...a11y, ...patch } })
  const close = () => setDialog(null)

  const askPermission = async () => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission === 'default' ? Notification.requestPermission() : Notification.permission
  }
  const testNotif = async () => {
    if (await askPermission() === 'granted') new Notification('Anchor', { body: 'Reminders are working.' })
    else toast('Allow notifications in your browser first')
  }

  const pickPhoto = (f?: File) => {
    if (!f) return
    const img = new Image()
    img.onload = () => {
      const s = Math.min(img.width, img.height), cv = document.createElement('canvas')
      cv.width = cv.height = 256
      cv.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256)
      setPf('photo', cv.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(f)
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), prefs: { ...prefs, profile: { ...pf, photo: pf.photo ? '(omitted)' : '' } }, records: days }, null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'anchor-data.json' })
    a.click(); URL.revokeObjectURL(a.href)
    toast('Data exported')
  }

  const deleteAccount = async () => {
    try {
      const user = auth.currentUser
      if (user && user.uid !== 'guest-user') {
        await deleteUserData(user.uid)
      }
    } catch {}
    localStorage.clear()
    sessionStorage.clear()
    await onSignOut()
  }

  const hair = { borderColor: 'color-mix(in srgb, var(--text) 11%, transparent)' }

  return (
    <div className="h-full overflow-y-auto">
      <div className="enter max-w-xl mx-auto px-5 pt-5 pb-12 lg:pt-8">
        <button onClick={onBack} className="text-sm px-3.5 py-2 rounded-full" style={{ color: C.textSec, background: C.card }}>← Back</button>
        <h1 className="font-serif text-4xl mt-4 mb-6" style={{ color: C.textPri }}>Settings</h1>

        <Section title="Profile">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-14 h-14 text-xl" />
            <div className="flex gap-4 text-sm">
              <button onClick={() => fileRef.current?.click()} style={{ color: C.amber }}>{pf.photo ? 'Change photo' : 'Add photo'}</button>
              {pf.photo && <button onClick={() => setPf('photo', '')} style={{ color: C.textMute }}>Remove</button>}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = '' }} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><input className="field" value={pf.name} onChange={e => setPf('name', e.target.value)} /></Field>
            <Field label="Email"><input className="field" type="email" value={pf.email} disabled style={{ opacity: 0.6 }} /></Field>
            <Field label="Course"><input className="field" value={pf.course} onChange={e => setPf('course', e.target.value)} /></Field>
            <Field label="Year">
              <select className="field" value={pf.year} onChange={e => setPf('year', e.target.value)}>
                <option value="">Not set</option>
                {['1', '2', '3', '4', '5', '6'].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Appearance">
          <div role="radiogroup" aria-label="Theme">
            {THEMES.map(t => {
              const on = prefs.theme === t.id
              return (
                <button key={t.id} role="radio" aria-checked={on} onClick={() => update({ theme: t.id })}
                  className="flex items-center gap-3 w-full py-2.5 min-h-11 text-left">
                  <span className="flex flex-shrink-0 rounded-full overflow-hidden w-12 h-6" style={{ outline: `1px solid ${C.cardBorder}` }}>
                    {[t.bg, t.card, t.accent].map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
                  </span>
                  <span className="flex-1 text-sm" style={{ color: C.textPri }}>{t.name}</span>
                  {on && <span className="text-xs" style={{ color: C.amber }}>Current</span>}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between gap-3 pt-3 mt-2 border-t" style={{ borderColor: C.cardBorder }}>
            <span className="text-sm" style={{ color: C.textPri }}>Text size</span>
            <div className="flex gap-1">
              {([['sm', 'Small'], ['md', 'Default'], ['lg', 'Large']] as const).map(([v, l]) => (
                <button key={v} aria-pressed={a11y.textSize === v} onClick={() => setA11y({ textSize: v })}
                  className="px-3 py-1.5 rounded-full text-xs"
                  style={a11y.textSize === v ? { background: C.amber, color: C.onAccent } : { color: C.textSec }}>{l}</button>
              ))}
            </div>
          </div>
          <Row label="Reduce motion" right={<Toggle on={a11y.reduceMotion} onChange={v => setA11y({ reduceMotion: v })} label="Reduce motion" />} />
        </Section>

        <Section title="Reminders">
          <Row label="Daily mood check-in" desc="Only while Anchor is open in a tab"
            right={<div className="flex items-center gap-3">
              <input type="time" className="field !w-auto !py-1" aria-label="Reminder time" value={nf.checkinTime} onChange={e => setNf({ checkinTime: e.target.value })} />
              <Toggle on={nf.checkin} onChange={async v => { setNf({ checkin: v }); if (v) await askPermission() }} label="Daily mood check-in" />
            </div>} />
          <Row label="Quiet hours" right={<Toggle on={nf.quiet} onChange={v => setNf({ quiet: v })} label="Quiet hours" />} />
          {nf.quiet && (
            <div className="grid grid-cols-2 gap-3 pb-2">
              <Field label="From"><input type="time" className="field" value={nf.quietStart} onChange={e => setNf({ quietStart: e.target.value })} /></Field>
              <Field label="Until"><input type="time" className="field" value={nf.quietEnd} onChange={e => setNf({ quietEnd: e.target.value })} /></Field>
            </div>
          )}
          <Row label="Send a test notification" onClick={testNotif} />
        </Section>

        <Section title="Account">
          <Row label="Change password" onClick={() => setDialog('password')}
            right={<span className="text-xs" style={{ color: C.amber }}>Change</span>} />
          <Row label="Export my data" onClick={exportData} />
          <Row label="Delete account and data" danger onClick={() => setDialog('delete')} />
        </Section>

        <Section title="Help">
          <Row label="Send feedback" onClick={() => setDialog('feedback')} />
          <Row label="Report a bug" onClick={() => setDialog('bug')} />
          <Row label="Email support" desc={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />
          <Row label="Talk to someone now" desc="Call 988, free, 24/7" href="tel:988" />
        </Section>

        <Section title="About">
          <Row label="Terms & privacy" onClick={() => setDialog('legal')} />
          <Row label="Version" right={<span className="text-xs" style={{ color: C.textMute }}>1.0.0</span>} />
          <Row label="Sign out" onClick={() => setDialog('logout')} />
        </Section>
      </div>

      {dialog === 'password' && <ChangePasswordModal onClose={close} toast={toast} />}
      {(dialog === 'feedback' || dialog === 'bug') && <MailModal mode={dialog} onClose={close} />}
      {dialog === 'delete' && (
        <ConfirmModal title="Delete everything?" danger requireText="DELETE" action="Delete" onClose={close}
          text="This erases your local data and signs you out. Contact support to fully delete your account."
          onRun={deleteAccount} />
      )}
      {dialog === 'logout' && (
        <ConfirmModal title="Sign out?" action="Sign out" onClose={close}
          text="You'll need to sign in again to access your data."
          onRun={async () => { close(); await onSignOut() }} />
      )}
      {dialog === 'legal' && (
        <Modal title={LEGAL[0]} onClose={close}>
          {LEGAL[1].map(t => <p key={t} className="text-sm leading-relaxed mb-2.5" style={{ color: C.textSec }}>{t}</p>)}
          <div className="flex justify-end mt-2"><Btn onClick={close}>Close</Btn></div>
        </Modal>
      )}

      {msg && (
        <div role="status" className="sheet fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm"
          style={{ background: C.amber, color: C.onAccent }}>{msg}</div>
      )}
    </div>
  )
}
