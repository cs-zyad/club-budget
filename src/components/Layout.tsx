import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import { useBudget } from '../data/budget'

export function Layout() {
  const { user, logout, demo } = useAuth()
  const { stats, loading, error } = useBudget()

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <img src="/logo.svg" alt="شعار النادي" />
          <div>
            <strong>نادي ريادة الأعمال</strong>
            <span>ميزانية 2026/2027</span>
          </div>
        </div>
        <nav aria-label="التنقل الرئيسي">
          <NavLink to="/" end>
            لوحة التحكم
          </NavLink>
          <NavLink to="/income">الإيرادات</NavLink>
          <div className="nav-title">البنود</div>
          {stats.rows.map((r) => (
            <NavLink key={r.id} to={`/item/${r.id}`} className="nav-item">
              <span className={`dot ${r.level}`} aria-hidden />
              {r.name}
            </NavLink>
          ))}
          {!loading && stats.rows.length === 0 && <span className="muted small pad">لا توجد بنود بعد</span>}
        </nav>
        <div className="side-foot">
          <span className="muted small" dir="ltr">
            {user?.email}
          </span>
          <button className="btn ghost sm" onClick={() => logout()}>
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="main">
        {demo && (
          <div className="banner" role="status">
            وضع تجريبي: البيانات محفوظة في هذا المتصفح فقط. اربط Firebase ليتحول النظام للعمل الفعلي.
          </div>
        )}
        {error && (
          <div className="banner bad" role="alert">
            {error}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
