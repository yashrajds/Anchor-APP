import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from './lib/AuthContext'
import { auth } from './lib/firebase'
import { confirmPasswordReset } from 'firebase/auth'
import { C } from './prefs'

// ─── Shared primitives ────────────────────────────────────────────────────────
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: C.bg }}>
      <div className="w-full max-w-sm">
        <p className="font-serif text-5xl text-center mb-2" style={{ color: C.textPri }}>Anchor</p>
        <p className="text-center text-sm mb-8" style={{ color: C.textMute }}>Your student wellbeing companion</p>
        {children}
      </div>
    </div>
  )
}

function AuthInput({
  label, type = 'text', value, onChange, placeholder, autoFocus,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean
}) {
  return (
    <label className="block mb-4">
      <span className="block text-xs mb-1.5" style={{ color: C.textMute }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="field"
        required
      />
    </label>
  )
}

function AuthBtn({ children, loading, disabled }: { children: React.ReactNode; loading?: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 mt-1"
      style={{ background: C.amber, color: C.onAccent }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )
}

function ErrorMsg({ error }: { error: string }) {
  if (!error) return null
  return <p className="text-xs mb-3 p-3 rounded-xl" style={{ background: 'color-mix(in srgb, #E07A5F 15%, transparent)', color: '#E07A5F' }}>{error}</p>
}

function SuccessMsg({ msg }: { msg: string }) {
  if (!msg) return null
  return <p className="text-xs mb-3 p-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: C.amber }}>{msg}</p>
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginForm({ onSignUp, onForgot }: { onSignUp: () => void; onForgot: () => void }) {
  const { signIn, signInAsGuest } = useAuth()
  const [name, setName] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(name, token)
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="rounded-3xl p-6" style={{ background: C.card }}>
        <h1 className="font-serif text-2xl mb-5" style={{ color: C.textPri }}>Sign in</h1>
        <ErrorMsg error={error} />
        <AuthInput label="Name" value={name} onChange={setName} autoFocus placeholder="Your account name" />
        <AuthInput label="Token" type="password" value={token} onChange={setToken} placeholder="Generated token" />
        
        <AuthBtn loading={loading}>Sign in</AuthBtn>
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: 'color-mix(in srgb, var(--text) 10%, transparent)' }} /></div>
          <span className="relative px-2 text-xs" style={{ background: C.card, color: C.textMute }}>or</span>
        </div>
        <button
          type="button"
          onClick={signInAsGuest}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'color-mix(in srgb, var(--text) 8%, transparent)', color: C.textPri }}
        >
          Explore as Guest
        </button>
      </form>
      <p className="text-center text-sm mt-5" style={{ color: C.textSec }}>
        Don't have an account?{' '}
        <button onClick={onSignUp} className="font-medium" style={{ color: C.amber }}>Sign up</button>
      </p>
    </AuthShell>
  )
}

// ─── Sign Up Screen ───────────────────────────────────────────────────────────
function SignUpForm({ onSignIn }: { onSignIn: () => void }) {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error, token: t } = await signUp(name)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setToken(t || '')
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="rounded-3xl p-6" style={{ background: C.card }}>
        <h1 className="font-serif text-2xl mb-5" style={{ color: C.textPri }}>Create account</h1>
        <ErrorMsg error={error} />
        {!token && (
          <>
            <AuthInput label="Name" value={name} onChange={setName} placeholder="Your name" autoFocus />
            <AuthBtn loading={loading}>Create account</AuthBtn>
          </>
        )}
        {token && (
          <div>
            <p className="text-sm mb-3" style={{ color: C.textSec }}>Account created. Save this token to log in next time:</p>
            <p className="font-mono text-lg p-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--text) 8%, transparent)', color: C.amber }}>{token}</p>
            <button onClick={onSignIn} className="w-full py-2.5 rounded-xl text-sm font-medium mt-4"
              style={{ background: C.amber, color: C.onAccent }}>Back to sign in</button>
          </div>
        )}
      </form>
      <p className="text-center text-sm mt-5" style={{ color: C.textSec }}>
        Already have an account?{' '}
        <button onClick={onSignIn} className="font-medium" style={{ color: C.amber }}>Sign in</button>
      </p>
    </AuthShell>
  )
}

// ─── Forgot Password Screen ───────────────────────────────────────────────────
function ForgotForm({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess('Check your email for the reset link.')
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="rounded-3xl p-6" style={{ background: C.card }}>
        <h1 className="font-serif text-2xl mb-2" style={{ color: C.textPri }}>Reset password</h1>
        <p className="text-xs mb-5" style={{ color: C.textMute }}>Enter your email and we'll send a reset link.</p>
        <ErrorMsg error={error} />
        <SuccessMsg msg={success} />
        {!success && (
          <>
            <AuthInput label="Email" type="email" value={email} onChange={setEmail} autoFocus />
            <AuthBtn loading={loading}>Send reset link</AuthBtn>
          </>
        )}
      </form>
      <p className="text-center text-sm mt-5" style={{ color: C.textSec }}>
        <button onClick={onBack} className="font-medium" style={{ color: C.amber }}>← Back to sign in</button>
      </p>
    </AuthShell>
  )
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function AuthLoading() {
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: C.bg }}>
      <p className="font-serif text-4xl" style={{ color: C.textPri }}>Anchor</p>
    </div>
  )
}

// ─── Gate (wraps protected content) ──────────────────────────────────────────
type AuthScreen = 'login' | 'signup' | 'forgot'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const [screen, setScreen] = useState<AuthScreen>('login')

  // Check if we arrived from a password reset email
  const isReset = new URLSearchParams(window.location.search).get('mode') === 'resetPassword'

  if (status === 'loading') return <AuthLoading />
  if (status === 'authenticated') return <>{children}</>

  // Show reset password form if coming from email link
  if (isReset) return <ResetPasswordForm />

  if (screen === 'signup') return <SignUpForm onSignIn={() => setScreen('login')} />
  if (screen === 'forgot') return <ForgotForm onBack={() => setScreen('login')} />
  return <LoginForm onSignUp={() => setScreen('signup')} onForgot={() => setScreen('forgot')} />
}

// ─── Reset Password (after email redirect) ───────────────────────────────────
function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match."); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setLoading(true)
    const oobCode = new URLSearchParams(window.location.search).get('oobCode') ?? ''
    try {
      await confirmPasswordReset(auth, oobCode, password)
      setSuccess('Password updated. You can sign in now.')
      // Remove reset params from URL
      window.history.replaceState({}, '', '/')
    } catch (e: any) {
      setError(e.message ?? 'Could not update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="rounded-3xl p-6" style={{ background: C.card }}>
        <h1 className="font-serif text-2xl mb-2" style={{ color: C.textPri }}>New password</h1>
        <p className="text-xs mb-5" style={{ color: C.textMute }}>Choose a new password for your account.</p>
        <ErrorMsg error={error} />
        <SuccessMsg msg={success} />
        {!success && (
          <>
            <AuthInput label="New password" type="password" value={password} onChange={setPassword} placeholder="Min. 6 characters" autoFocus />
            <AuthInput label="Confirm new password" type="password" value={confirm} onChange={setConfirm} />
            <AuthBtn loading={loading}>Update password</AuthBtn>
          </>
        )}
      </form>
    </AuthShell>
  )
}
