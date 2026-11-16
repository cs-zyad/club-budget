import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, LayoutDashboard, LogOut, Menu, ReceiptText, Wallet, X } from 'lucide-react'
import { useAuth } from '../auth'
import { useBudget } from '../data/budget'
import { useFeedback } from './feedback'

const MAIN = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'العمليات', icon: ReceiptText },
  { to: '/items', label: 'البنود', icon: Wallet },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
]

export function Layout() {
  const { user, logout, demo } = useAuth()
  const { stats, loading, error } = useBudget()
  const { confirm } = useFeedback()
  const [open, setOpen] = useState(false)

  async function signOut() {
    if (await confirm({ title: 'تسجيل الخروج', body: 'هل تريد تسجيل الخروج من النظام؟', confirmText: 'خروج' })) await logout()
  }

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn light" onClick={() => setOpen(true)} aria-label="فتح القائمة">
          <Menu size={22} />
        </button>
        <div className="topbar-brand">
          <img src="/logo.svg" alt="" />
          <strong>ميزانية النادي</strong>
        </div>
      </header>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand">
          <img src="/logo.svg" alt="شعار النادي" />
          <div>
            <strong>نادي ريادة الأعمال</strong>
            <span>ميزانية 2026/2027</span>
          </div>
          <button className="icon-btn light close-side" onClick={() => setOpen(false)} aria-label="إغلاق القائمة">
            <X size={20} />
          </button>
        </div>
        <nav aria-label="التنقل الرئيسي" onClick={() => setOpen(false)}>
          {MAIN.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={19} aria-hidden />
              {label}
            </NavLink>
          ))}
          <div className="nav-title">البنود</div>
          {stats.rows.map((r) => (
            <NavLink key={r.id} to={`/item/${r.id}`} className="nav-item">
              <span className={`dot ${r.level}`} aria-hidden />
              <span className="nav-item-name">{r.name}</span>
            </NavLink>
          ))}
          {!loading && stats.rows.length === 0 && <span className="nav-empty">لا توجد بنود بعد</span>}
        </nav>
        <div className="side-foot">
          <span className="user-email" dir="ltr">
            {user?.email}
          </span>
          <button className="btn ghost sm on-dark" onClick={signOut}>
            <LogOut size={16} aria-hidden />
            خروج
          </button>
        </div>
      </aside>

      <main className="main">
        {demo && (
          <div className="banner" role="status">
            وضع تجريبي: البيانات محفوظة في هذا المتصفح فقط.
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
