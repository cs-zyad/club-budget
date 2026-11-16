import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LevelBadge, Modal, Money, Progress, StatCard } from '../components/ui'
import { TxForm } from '../components/TxForm'
import { TxTable } from '../components/TxTable'
import { useBudget } from '../data/budget'
import { db } from '../data/db'
import { pct, sar } from '../lib/format'
import type { Tx } from '../types'

export function ItemPage() {
  const { id } = useParams()
  const { stats, txs, loading } = useBudget()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Tx | null>(null)
  const [editingBudget, setEditingBudget] = useState(false)

  if (loading) return <p className="muted">جارٍ التحميل…</p>
  const row = stats.rows.find((r) => r.id === id)
  if (!row) {
    return (
      <section className="card empty-state">
        <h1>البند غير موجود</h1>
        <Link to="/">العودة للوحة التحكم</Link>
      </section>
    )
  }

  const own = txs.filter((t) => t.kind === 'expense' && t.itemId === row.id)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{row.name}</h1>
          <LevelBadge level={row.level} ratio={row.ratio} />
        </div>
        <div className="head-actions">
          <button className="btn ghost" onClick={() => setEditingBudget(true)}>
            تعديل الميزانية
          </button>
          <button className="btn" onClick={() => setAdding(true)}>
            + إضافة مصروف
          </button>
        </div>
      </header>

      <section className="stats">
        <StatCard label="الميزانية المخصصة" value={sar(row.allocated)} />
        <StatCard label="إجمالي المصروفات" value={sar(row.spent)} tone="gold" />
        <StatCard label="المبلغ المتبقي" value={sar(row.remaining)} tone={row.remaining < 0 ? 'bad' : 'good'} />
        <StatCard label="نسبة الصرف" value={pct(row.ratio)} hint={`المتبقي ${pct(Math.max(0, 1 - row.ratio))}`} />
      </section>
      <Progress ratio={row.ratio} level={row.level} />

      <section className="card">
        <h2>
          المصروفات <span className="muted small">({own.length})</span>
        </h2>
        <TxTable txs={own} onEdit={setEditing} empty="لا توجد مصروفات على هذا البند بعد." />
        {own.length > 0 && (
          <p className="total-line">
            الإجمالي: <Money value={row.spent} />
          </p>
        )}
      </section>

      {adding && <TxForm kind="expense" rows={stats.rows} defaultItemId={row.id} onClose={() => setAdding(false)} />}
      {editing && <TxForm kind="expense" rows={stats.rows} editing={editing} onClose={() => setEditing(null)} />}
      {editingBudget && <BudgetForm id={row.id} name={row.name} order={row.order} allocated={row.allocated} spent={row.spent} onClose={() => setEditingBudget(false)} />}
    </>
  )
}

function BudgetForm({
  id,
  name,
  order,
  allocated,
  spent,
  onClose,
}: {
  id: string
  name: string
  order: number
  allocated: number
  spent: number
  onClose(): void
}) {
  const [value, setValue] = useState(String(allocated))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const n = Number(value)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!Number.isFinite(n) || n < 0) return setError('أدخل مبلغاً صحيحاً')
    setBusy(true)
    try {
      await db.saveItem({ id, name, order, allocated: Math.round(n * 100) / 100 })
      onClose()
    } catch {
      setError('تعذر الحفظ. تأكد من الاتصال وصلاحيات الحساب.')
      setBusy(false)
    }
  }

  return (
    <Modal title={`تعديل ميزانية «${name}»`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          الميزانية المخصصة (ر.س)
          <input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} autoFocus required />
        </label>
        <p className={`note ${n < spent ? 'bad' : ''}`}>
          المصروف حتى الآن: <Money value={spent} />
          {n < spent && ' — الميزانية الجديدة أقل من المصروف، وسيظهر البند متجاوزاً.'}
        </p>
        {error && (
          <p className="note bad" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
