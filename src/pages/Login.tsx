import { useState, type FormEvent } from 'react'
import { authErrorMessage, useAuth } from '../auth'

export function Login() {
  const { login, demo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      <form className="card login" onSubmit={submit}>
        <img src="/logo.svg" alt="شعار نادي ريادة الأعمال" />
        <h1>نادي ريادة الأعمال</h1>
        <p className="muted">نظام الميزانية والمصروفات</p>
        {demo ? (
          <>
            <p className="note">
              وضع تجريبي: لم يُربط Firebase بعد، فيعمل النظام ببيانات محلية في هذا المتصفح.
            </p>
            <button className="btn block" type="submit">
              دخول تجريبي
            </button>
          </>
        ) : (
          <>
            <label>
              البريد الإلكتروني
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" required autoComplete="username" />
            </label>
            <label>
              كلمة السر
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" required autoComplete="current-password" />
            </label>
            {error && (
              <p className="note bad" role="alert">
                {error}
              </p>
            )}
            <button className="btn block" type="submit" disabled={busy}>
              {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
