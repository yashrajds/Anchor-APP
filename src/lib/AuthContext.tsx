import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth as firebaseAuth, db } from './firebase'

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

const GUEST_KEY = 'anchor.auth.guest'
const GUEST_USER = {
  uid: 'guest-user',
  id: 'guest-user',
  email: 'guest@anchorapp.example',
  user_metadata: { name: 'Alex' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  app_metadata: {},
} as unknown as User

type AuthError = Error

type AuthCtx = {
  user: User | null
  session: null
  status: AuthStatus
  signUp: (name: string) => Promise<{ error: AuthError | null; token?: string }>
  signIn: (name: string, token: string) => Promise<{ error: AuthError | null }>
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
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    // Check if previously signed in as guest
    if (localStorage.getItem(GUEST_KEY) === 'true') {
      setUser(GUEST_USER)
      setStatus('authenticated')
      return
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, user => {
      if (localStorage.getItem(GUEST_KEY) === 'true') return
      setUser(user)
      setStatus(user ? 'authenticated' : 'unauthenticated')
    })

    return unsubscribe
  }, [])

  const signUp = useCallback(async (name: string): Promise<{ error: AuthError | null; token?: string }> => {
    localStorage.removeItem(GUEST_KEY)
    try {
      const clean = name.toLowerCase().replace(/[^a-z0-9_-]/g, '')
      if (!clean) throw new Error('Use a valid name.')
      const email = `${clean}@anchor.local`
      const token = Math.random().toString(36).slice(2, 10)
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, token)
      await updateProfile(cred.user, { displayName: name })
      await setDoc(doc(db, 'profiles', cred.user.uid), {
        id: cred.user.uid,
        user_id: cred.user.uid,
        name,
        email,
        token_email: email,
        joined: new Date().toISOString().slice(0, 10),
      }, { merge: true })
      return { error: null, token }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  const signIn = useCallback(async (name: string, token: string) => {
    localStorage.removeItem(GUEST_KEY)
    try {
      const clean = name.toLowerCase().replace(/[^a-z0-9_-]/g, '')
      const email = `${clean}@anchor.local`
      await signInWithEmailAndPassword(firebaseAuth, email, token)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  const signInAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, 'true')
    setUser(GUEST_USER)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(GUEST_KEY)
    try {
      await firebaseSignOut(firebaseAuth)
    } catch {}
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(firebaseAuth, email)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    try {
      const user = firebaseAuth.currentUser
      if (!user) return { error: new Error('Not signed in') }
      await firebaseUpdatePassword(user, password)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session: null, status, signUp, signIn, signInAsGuest, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}
