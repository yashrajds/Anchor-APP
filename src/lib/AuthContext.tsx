import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

const GUEST_KEY = 'anchor.auth.guest'
const GUEST_USER = {
  id: 'guest-user',
  email: 'guest@anchorapp.example',
  user_metadata: { name: 'Alex' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  app_metadata: {},
} as unknown as User

type AuthCtx = {
  user: User | null
  session: Session | null
  status: AuthStatus
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInAsGuest: () => void
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthCtx>(null!)
export const useAuth = () => useContext(AuthContext)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    // Check if previously signed in as guest
    if (localStorage.getItem(GUEST_KEY) === 'true') {
      setUser(GUEST_USER)
      setStatus('authenticated')
      return
    }

    // Get initial session
    supabase.auth.getSession().then(
      ({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        setStatus(session ? 'authenticated' : 'unauthenticated')
      },
      () => {
        setStatus('unauthenticated')
      },
    )

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (localStorage.getItem(GUEST_KEY) === 'true') return
        setSession(session)
        setUser(session?.user ?? null)
        setStatus(session ? 'authenticated' : 'unauthenticated')
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    localStorage.removeItem(GUEST_KEY)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })

    // Create profile record on signup
    if (data.user && !error) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        email,
        joined: new Date().toISOString().slice(0, 10),
      })
    }

    return { error }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    localStorage.removeItem(GUEST_KEY)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signInAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, 'true')
    setUser(GUEST_USER)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(GUEST_KEY)
    try {
      await supabase.auth.signOut()
    } catch {}
    setUser(null)
    setSession(null)
    setStatus('unauthenticated')
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?reset=true`,
    })
    return { error }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, status, signUp, signIn, signInAsGuest, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}
