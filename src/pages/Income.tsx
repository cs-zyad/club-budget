import { useState } from 'react'
import { StatCard } from '../components/ui'
import { TxForm } from '../components/TxForm'
import { TxTable } from '../components/TxTable'
import { useBudget } from '../data/budget'
import { sar } from '../lib/format'
import type { Tx } from '../types'

export function Income() {
  const { stats, txs, loading } = useBudget()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Tx | null>(null)

  if (loading) return <p className="muted">جارٍ التحميل…</p>
  const income = txs.filter((t) => t.kind === 'income')

  return (
    <>
      <header className="page-head">
        <h1>الإيرادات</h1>
        <button className="btn" onClick={() => setAdding(true)}>
          + إضافة إيراد
        </button>
      </header>
      <section className="stats">
        <StatCard label="إجمالي الإيرادات" value={sar(stats.totalIncome)} tone="good" />
        <StatCard label="عدد العمليات" value={String(income.length)} />
      </section>
      <section className="card">
        <h2>سجل الإيرادات</h2>
        <TxTable txs={income} onEdit={setEditing} empty="لا توجد إيرادات مسجلة بعد." />
      </section>
      {adding && <TxForm kind="income" rows={stats.rows} onClose={() => setAdding(false)} />}
      {editing && <TxForm kind="income" rows={stats.rows} editing={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
