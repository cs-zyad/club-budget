import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { authErrorMessage, useAuth } from '../auth'

export function Login() {
  const { login, demo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login" onSubmit={submit}>
        <img src="/logo.svg" alt="شعار نادي ريادة الأعمال" />
        <div>
          <h1>نظام ميزانية النادي</h1>
          <p className="muted">نادي ريادة الأعمال · 2026/2027</p>
        </div>
        {demo ? (
          <>
            <p className="note">وضع تجريبي: لم يُربط Firebase، فيعمل النظام ببيانات محلية في هذا المتصفح.</p>
            <button className="btn lg block" type="submit">
              دخول تجريبي
            </button>
          </>
        ) : (
          <>
            <label>
              البريد الإلكتروني
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" required autoComplete="username" autoFocus />
            </label>
            <label>
              كلمة السر
              <span className="password">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="icon-btn sm" onClick={() => setShow((s) => !s)} aria-label={show ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && (
              <p className="note bad" role="alert">
                {error}
              </p>
            )}
            <button className="btn lg block" type="submit" disabled={busy}>
              {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
            </button>
            <p className="login-foot muted small">
              <LockKeyhole size={14} aria-hidden /> الدخول للمخوّلين فقط. لإضافة حساب تواصل مع مدير النظام.
            </p>
          </>
        )}
      </form>
    </div>
  )
}
