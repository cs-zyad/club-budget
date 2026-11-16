import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { FeedbackProvider } from './components/feedback'
import { Layout } from './components/Layout'
import { BudgetProvider } from './data/budget'
import { Dashboard } from './pages/Dashboard'
import { ItemPage } from './pages/ItemPage'
import { Items } from './pages/Items'
import { Login } from './pages/Login'
import { Reports } from './pages/Reports'
import { Transactions } from './pages/Transactions'

function Gate() {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="boot">
        <img src="/logo.svg" alt="" />
        <span className="muted">جارٍ التحميل…</span>
      </div>
    )
  if (!user) return <Login />
  return (
    <BudgetProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="items" element={<Items />} />
          <Route path="item/:id" element={<ItemPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="income" element={<Navigate to="/transactions?kind=income" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BudgetProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <BrowserRouter>
          <Gate />
        </BrowserRouter>
      </FeedbackProvider>
    </AuthProvider>
  )
}
