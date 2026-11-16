import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { Layout } from './components/Layout'
import { BudgetProvider } from './data/budget'
import { Dashboard } from './pages/Dashboard'
import { Income } from './pages/Income'
import { ItemPage } from './pages/ItemPage'
import { Login } from './pages/Login'

function Gate() {
  const { user, loading } = useAuth()
  if (loading) return <p className="boot muted">جارٍ التحميل…</p>
  if (!user) return <Login />
  return (
    <BudgetProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="item/:id" element={<ItemPage />} />
          <Route path="income" element={<Income />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BudgetProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}
