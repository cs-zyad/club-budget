import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { computeStats, type Stats } from '../lib/stats'
import type { BudgetItem, Tx } from '../types'
import { db } from './db'

interface BudgetCtx {
  items: BudgetItem[]
  txs: Tx[]
  stats: Stats
  loading: boolean
  error: string | null
}

const Ctx = createContext<BudgetCtx | null>(null)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<BudgetItem[] | null>(null)
  const [txs, setTxs] = useState<Tx[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const onError = () => setError('تعذر تحميل البيانات. تأكد من الاتصال وصلاحيات الحساب.')
    const u1 = db.watchItems(setItems, onError)
    const u2 = db.watchTx(setTxs, onError)
    return () => {
      u1()
      u2()
      setItems(null)
      setTxs(null)
    }
  }, [user])

  const value = useMemo<BudgetCtx>(() => {
    const i = items ?? []
    const t = txs ?? []
    return { items: i, txs: t, stats: computeStats(i, t), loading: items === null || txs === null, error }
  }, [items, txs, error])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBudget(): BudgetCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useBudget must be used inside BudgetProvider')
  return v
}
