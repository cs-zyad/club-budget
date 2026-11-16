import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, firebaseReady } from './firebase'

export interface SessionUser {
  uid: string
  email: string
}

interface AuthCtx {
  user: SessionUser | null
  loading: boolean
  demo: boolean
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)
const DEMO_KEY = 'club-budget-demo-session'

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code))
    return 'البريد الإلكتروني أو كلمة السر غير صحيحة'
  if (code === 'auth/too-many-requests') return 'محاولات كثيرة، حاول مرة أخرى بعد قليل'
  if (code === 'auth/network-request-failed') return 'تعذر الاتصال بالإنترنت'
  return 'تعذر تسجيل الدخول، حاول مرة أخرى'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (firebaseReady && auth) {
      return onAuthStateChanged(auth, (u) => {
        setUser(u ? { uid: u.uid, email: u.email ?? '' } : null)
        setLoading(false)
      })
    }
    try {
      if (localStorage.getItem(DEMO_KEY)) setUser({ uid: 'demo', email: 'demo@local' })
    } catch {
      /* التخزين غير متاح */
    }
    setLoading(false)
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      demo: !firebaseReady,
      async login(email, password) {
        if (firebaseReady && auth) {
          await signInWithEmailAndPassword(auth, email.trim(), password)
          return
        }
        // الوضع التجريبي يعمل فقط عند عدم ضبط Firebase، وبياناته محلية في هذا المتصفح.
        try {
          localStorage.setItem(DEMO_KEY, '1')
        } catch {
          /* التخزين غير متاح */
        }
        setUser({ uid: 'demo', email: 'demo@local' })
      },
      async logout() {
        if (firebaseReady && auth) {
          await signOut(auth)
          return
        }
        try {
          localStorage.removeItem(DEMO_KEY)
        } catch {
          /* التخزين غير متاح */
        }
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
